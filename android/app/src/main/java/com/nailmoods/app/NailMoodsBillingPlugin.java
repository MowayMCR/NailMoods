package com.nailmoods.app;

import android.app.Activity;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "NailMoodsBilling")
public class NailMoodsBillingPlugin extends Plugin {
    private static final String PLUS = "nailmoods_plus";
    private static final String PRO = "nailmoods_pro";
    private BillingClient billingClient;
    private PluginCall pendingPurchase;

    private BillingClient client() {
        if (billingClient == null) {
            billingClient = BillingClient.newBuilder(getContext())
                .enablePendingPurchases()
                .setListener(this::onPurchasesUpdated)
                .build();
        }
        return billingClient;
    }

    private void connected(Runnable action, PluginCall call) {
        if (client().isReady()) { action.run(); return; }
        client().startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                else call.reject("billing_unavailable", result.getDebugMessage());
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        connected(() -> {
            List<QueryProductDetailsParams.Product> products = new ArrayList<>();
            products.add(QueryProductDetailsParams.Product.newBuilder().setProductId(PLUS).setProductType(BillingClient.ProductType.SUBS).build());
            products.add(QueryProductDetailsParams.Product.newBuilder().setProductId(PRO).setProductType(BillingClient.ProductType.SUBS).build());
            client().queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (result, details) -> {
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("products_unavailable", result.getDebugMessage()); return;
                    }
                    JSArray list = new JSArray();
                    for (ProductDetails detail : details) {
                        JSObject item = new JSObject();
                        item.put("productId", detail.getProductId());
                        item.put("title", detail.getTitle());
                        item.put("description", detail.getDescription());
                        if (detail.getSubscriptionOfferDetails() != null && !detail.getSubscriptionOfferDetails().isEmpty()) {
                            ProductDetails.SubscriptionOfferDetails offer = detail.getSubscriptionOfferDetails().get(0);
                            item.put("basePlanId", offer.getBasePlanId());
                            item.put("offerToken", offer.getOfferToken());
                            item.put("formattedPrice", offer.getPricingPhases().getPricingPhaseList().get(0).getFormattedPrice());
                            item.put("billingPeriod", offer.getPricingPhases().getPricingPhaseList().get(0).getBillingPeriod());
                        }
                        list.put(item);
                    }
                    JSObject out = new JSObject(); out.put("products", list); call.resolve(out);
                });
        }, call);
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId", "");
        if (!PLUS.equals(productId) && !PRO.equals(productId)) { call.reject("invalid_product"); return; }
        pendingPurchase = call;
        connected(() -> {
            QueryProductDetailsParams.Product request = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId).setProductType(BillingClient.ProductType.SUBS).build();
            client().queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(request)).build(),
                (result, details) -> {
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || details.isEmpty()) { rejectPending("product_unavailable"); return; }
                    ProductDetails.SubscriptionOfferDetails offer = details.get(0).getSubscriptionOfferDetails().get(0);
                    BillingFlowParams.ProductDetailsParams line = BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details.get(0)).setOfferToken(offer.getOfferToken()).build();
                    BillingResult launch = client().launchBillingFlow((Activity) getActivity(), BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(Collections.singletonList(line)).build());
                    if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) rejectPending("purchase_launch_failed");
                });
        }, call);
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        connected(() -> client().queryPurchasesAsync(QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS).build(), (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("restore_failed"); return; }
                call.resolve(encodePurchases(purchases));
            }), call);
    }

    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (pendingPurchase == null) return;
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) pendingPurchase.resolve(encodePurchases(purchases));
        else if (result.getResponseCode() != BillingClient.BillingResponseCode.USER_CANCELED) pendingPurchase.reject("purchase_failed", result.getDebugMessage());
        else pendingPurchase.reject("purchase_canceled");
        pendingPurchase = null;
    }

    private JSObject encodePurchases(List<Purchase> purchases) {
        JSArray list = new JSArray();
        if (purchases != null) for (Purchase purchase : purchases) {
            JSObject item = new JSObject();
            item.put("purchaseToken", purchase.getPurchaseToken());
            item.put("purchaseState", purchase.getPurchaseState());
            item.put("acknowledged", purchase.isAcknowledged());
            JSArray ids = new JSArray();
            for (String product : purchase.getProducts()) ids.put(product);
            item.put("productIds", ids);
            list.put(item);
        }
        JSObject out = new JSObject(); out.put("purchases", list); return out;
    }

    private void rejectPending(String message) {
        if (pendingPurchase != null) { pendingPurchase.reject(message); pendingPurchase = null; }
    }
}
