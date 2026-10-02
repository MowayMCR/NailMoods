package com.nailmoods.app;

import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;

@CapacitorPlugin(name = "NailMoodsBilling")
public class NailMoodsBillingPlugin extends Plugin {
    private static final String PLUS = "nailmoods_plus", PRO = "nailmoods_pro";
    private BillingClient billing;
    private PluginCall pendingPurchase;
    private boolean connecting;
    private final List<Runnable> queued = new ArrayList<>();
    private final List<PluginCall> waiting = new ArrayList<>();

    private boolean supported(String id) { return PLUS.equals(id) || PRO.equals(id); }
    private BillingClient client() {
        if (billing == null) billing = BillingClient.newBuilder(getContext())
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .setListener(this::onPurchasesUpdated).build();
        return billing;
    }
    private void connected(Runnable action, PluginCall call) {
        if (client().isReady()) { action.run(); return; }
        queued.add(action); waiting.add(call);
        if (connecting) return;
        connecting = true;
        client().startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                connecting = false;
                List<Runnable> actions = new ArrayList<>(queued);
                List<PluginCall> calls = new ArrayList<>(waiting);
                queued.clear(); waiting.clear();
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    for (Runnable task : actions) task.run();
                } else {
                    for (PluginCall request : calls) request.reject("billing_unavailable");
                    pendingPurchase = null;
                }
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }
    private ProductDetails.SubscriptionOfferDetails baseOffer(ProductDetails detail, String basePlan) {
        if (basePlan == null || basePlan.isEmpty() || detail.getSubscriptionOfferDetails() == null) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : detail.getSubscriptionOfferDetails()) {
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            // Initial release supports standard auto-renewing base plans only.
            // Trials, prepaid plans and instalments require their own transparent UI.
            if (basePlan.equals(offer.getBasePlanId()) && offer.getOfferId() == null && phases.size() == 1
                && phases.get(0).getRecurrenceMode() == 1 && offer.getInstallmentPlanDetails() == null
                && Arrays.asList("P1M", "P1Y").contains(phases.get(0).getBillingPeriod())) return offer;
        }
        return null;
    }
    @PluginMethod public void getProducts(PluginCall call) {
        JSObject basePlans = call.getObject("basePlans", new JSObject());
        connected(() -> {
            List<QueryProductDetailsParams.Product> requested = new ArrayList<>();
            for (String id : Arrays.asList(PLUS, PRO)) requested.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id).setProductType(BillingClient.ProductType.SUBS).build());
            client().queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(requested).build(), (result, response) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("products_unavailable"); return; }
                JSArray products = new JSArray();
                for (ProductDetails detail : response.getProductDetailsList()) {
                    ProductDetails.SubscriptionOfferDetails offer = baseOffer(detail, basePlans.optString(detail.getProductId(), ""));
                    if (offer == null) continue;
                    ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                    JSObject product = new JSObject();
                    product.put("productId", detail.getProductId()); product.put("title", detail.getTitle());
                    product.put("basePlanId", offer.getBasePlanId()); product.put("offerToken", offer.getOfferToken());
                    product.put("formattedPrice", phase.getFormattedPrice()); product.put("billingPeriod", phase.getBillingPeriod());
                    product.put("priceAmountMicros", String.valueOf(phase.getPriceAmountMicros()));
                    product.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                    products.put(product);
                }
                JSObject out = new JSObject(); out.put("products", products); call.resolve(out);
            });
        }, call);
    }
    @PluginMethod public void purchase(PluginCall call) {
        String productId = call.getString("productId", ""), basePlan = call.getString("basePlanId", "");
        String accountId = call.getString("accountId", "");
        if (!supported(productId) || basePlan.isEmpty() || !accountId.matches("[a-f0-9]{64}")) { call.reject("invalid_purchase_request"); return; }
        if (pendingPurchase != null) { call.reject("purchase_in_progress"); return; }
        pendingPurchase = call;
        connected(() -> client().queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).includeSuspendedSubscriptions(true).build(), (ownedResult, owned) -> {
            if (ownedResult.getResponseCode() != BillingClient.BillingResponseCode.OK) { rejectPending("restore_required"); return; }
            for (Purchase purchase : owned) for (String id : purchase.getProducts()) if (supported(id)) {
                rejectPending("existing_subscription"); return;
            }
            QueryProductDetailsParams.Product requested = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId).setProductType(BillingClient.ProductType.SUBS).build();
            client().queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(requested)).build(), (result, response) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || response.getProductDetailsList().isEmpty()) { rejectPending("product_unavailable"); return; }
                ProductDetails detail = response.getProductDetailsList().get(0);
                ProductDetails.SubscriptionOfferDetails offer = baseOffer(detail, basePlan);
                if (offer == null) { rejectPending("product_unavailable"); return; }
                ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                if (!offer.getOfferToken().equals(call.getString("offerToken", ""))
                    || !String.valueOf(phase.getPriceAmountMicros()).equals(call.getString("priceAmountMicros", ""))
                    || !phase.getPriceCurrencyCode().equals(call.getString("priceCurrencyCode", ""))
                    || !phase.getBillingPeriod().equals(call.getString("billingPeriod", ""))) { rejectPending("price_changed"); return; }
                BillingFlowParams.ProductDetailsParams line = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(detail).setOfferToken(offer.getOfferToken()).build();
                getActivity().runOnUiThread(() -> {
                    BillingResult launch = client().launchBillingFlow(getActivity(), BillingFlowParams.newBuilder()
                        .setObfuscatedAccountId(accountId).setProductDetailsParamsList(Collections.singletonList(line)).build());
                    if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) rejectPending("purchase_launch_failed");
                });
            });
        }), call);
    }
    @PluginMethod public void restorePurchases(PluginCall call) {
        connected(() -> client().queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).includeSuspendedSubscriptions(true).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("restore_failed"); return; }
                call.resolve(encodePurchases(purchases));
            }), call);
    }
    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            JSObject encoded = encodePurchases(purchases);
            if (pendingPurchase != null) pendingPurchase.resolve(encoded);
            notifyListeners("purchasesUpdated", encoded);
        } else if (pendingPurchase != null) {
            pendingPurchase.reject(result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED ? "purchase_canceled" : "purchase_failed");
        }
        pendingPurchase = null;
    }
    private JSObject encodePurchases(List<Purchase> purchases) {
        JSArray list = new JSArray();
        if (purchases != null) for (Purchase purchase : purchases) {
            JSArray ids = new JSArray();
            for (String id : purchase.getProducts()) if (supported(id)) ids.put(id);
            if (ids.length() == 0) continue;
            JSObject item = new JSObject();
            item.put("purchaseToken", purchase.getPurchaseToken()); item.put("purchaseState", purchase.getPurchaseState());
            item.put("acknowledged", purchase.isAcknowledged()); item.put("productIds", ids); list.put(item);
        }
        JSObject out = new JSObject(); out.put("purchases", list); return out;
    }
    private void rejectPending(String message) { if (pendingPurchase != null) { pendingPurchase.reject(message); pendingPurchase = null; } }
    @Override protected void handleOnDestroy() {
        rejectPending("billing_disconnected");
        for (PluginCall call : waiting) call.reject("billing_disconnected");
        waiting.clear(); queued.clear();
        if (billing != null) billing.endConnection();
        super.handleOnDestroy();
    }
}
