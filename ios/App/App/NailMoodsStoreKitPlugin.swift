import Foundation
import Capacitor
import StoreKit
import UIKit

@objc(NailMoodsStoreKitPlugin)
public class NailMoodsStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NailMoodsStoreKitPlugin"
    public let jsName = "NailMoodsStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getEnvironment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unfinishedPurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise)
    ]
    private let productIds: Set<String> = ["nailmoods_plus", "nailmoods_pro"]
    private var updates: Task<Void, Never>?
    public override func load() {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result, self.productIds.contains(transaction.productID) {
                    self.notifyListeners("transactionsUpdated", data: self.payload(result, transaction))
                }
            }
        }
    }
    deinit { updates?.cancel() }
    private func payload(_ result: VerificationResult<Transaction>, _ transaction: Transaction) -> [String: Any] {
        return ["signedTransaction": result.jwsRepresentation, "transactionId": String(transaction.id), "productId": transaction.productID]
    }
    @objc func getEnvironment(_ call: CAPPluginCall) {
        Task {
            do {
                var result: VerificationResult<AppTransaction>
                do { result = try await AppTransaction.shared }
                catch {
                    guard call.getBool("refresh") == true else { throw error }
                    result = try await AppTransaction.refresh()
                }
                if case .unverified = result, call.getBool("refresh") == true {
                    result = try await AppTransaction.refresh()
                }
                guard case .verified(let app) = result else { call.reject("app_not_verified"); return }
                switch app.environment {
                case .production: call.resolve(["environment": "Production"])
                case .sandbox: call.resolve(["environment": "Sandbox"])
                default: call.reject("local_storekit_not_server_verifiable")
                }
            } catch { call.reject("environment_unavailable") }
        }
    }
    @objc func getProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: productIds)
                call.resolve(["products": products.compactMap { product -> [String: Any]? in
                    guard let subscription = product.subscription else { return nil }
                    let period = subscription.subscriptionPeriod
                    let unit: String
                    switch period.unit { case .day: unit="day"; case .week: unit="week"; case .month: unit="month"; case .year: unit="year"; @unknown default: return nil }
                    return ["productId": product.id, "displayName": product.displayName, "formattedPrice": product.displayPrice,
                            "periodUnit": unit, "periodValue": period.value]
                }])
            } catch { call.reject("product_unavailable") }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let id=call.getString("productId"), productIds.contains(id), let value=call.getString("accountToken"), let token=UUID(uuidString:value) else { call.reject("invalid_purchase"); return }
        Task {
            do {
                guard let product = try await Product.products(for:[id]).first else { call.reject("product_unavailable"); return }
                switch try await product.purchase(options:[.appAccountToken(token)]) {
                case .success(let result):
                    guard case .verified(let transaction)=result else { call.reject("transaction_not_verified"); return }
                    // JavaScript first persists verified server delivery, then calls finish.
                    call.resolve(["state":"purchased", "transaction":payload(result,transaction)])
                case .pending: call.resolve(["state":"pending"])
                case .userCancelled: call.resolve(["state":"canceled"])
                @unknown default: call.reject("purchase_not_confirmed")
                }
            } catch { call.reject("purchase_unavailable") }
        }
    }
    private func collect(_ call: CAPPluginCall, restoring: Bool) {
        Task {
            do {
                if restoring { try await AppStore.sync() }
                var transactions: [[String: Any]] = []
                if restoring {
                    for await result in Transaction.currentEntitlements {
                        if case .verified(let tx)=result, productIds.contains(tx.productID) { transactions.append(payload(result,tx)) }
                    }
                }
                for await result in Transaction.unfinished {
                    if case .verified(let tx)=result, productIds.contains(tx.productID), !transactions.contains(where:{$0["transactionId"] as? String == String(tx.id)}) { transactions.append(payload(result,tx)) }
                }
                call.resolve(["transactions":transactions])
            } catch { call.reject("restore_unavailable") }
        }
    }
    @objc func restorePurchases(_ call: CAPPluginCall) { collect(call,restoring:true) }
    @objc func unfinishedPurchases(_ call: CAPPluginCall) { collect(call,restoring:false) }
    @objc func finish(_ call: CAPPluginCall) {
        guard let value=call.getString("transactionId"), let id=UInt64(value) else {call.reject("invalid_transaction");return}
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let tx)=result,tx.id==id,productIds.contains(tx.productID) { await tx.finish();call.resolve();return }
            }
            call.resolve() // Idempotent when a prior attempt already finished.
        }
    }
    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene=self.bridge?.viewController?.view.window?.windowScene else {call.reject("scene_unavailable");return}
            do {try await AppStore.showManageSubscriptions(in:scene);call.resolve()} catch {call.reject("manage_unavailable")}
        }
    }
}
