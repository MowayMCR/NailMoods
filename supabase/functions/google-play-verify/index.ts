import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5.10.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PACKAGE_NAME = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") || "com.nailmoods.app";
const PRODUCTS = new Set(["nailmoods_plus", "nailmoods_pro"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function googleAccessToken() {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("google_play_service_account_not_configured");
  const account = JSON.parse(raw);
  const key = await importPKCS8(account.private_key.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/androidpublisher",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("google_play_oauth_failed");
  const payload = await response.json();
  if (!payload.access_token) throw new Error("google_play_oauth_missing_token");
  return payload.access_token as string;
}

function parseState(state: string) {
  switch (state) {
    case "SUBSCRIPTION_STATE_ACTIVE": return "active";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD": return "grace";
    case "SUBSCRIPTION_STATE_ON_HOLD": return "on_hold";
    case "SUBSCRIPTION_STATE_CANCELED": return "canceled";
    case "SUBSCRIPTION_STATE_EXPIRED": return "expired";
    case "SUBSCRIPTION_STATE_PENDING": return "pending";
    default: return "expired";
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "server_not_configured" }, 503);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "authentication_required" }, 401);

  const userClient = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "authentication_required" }, 401);

  let body: { productId?: string; purchaseToken?: string; basePlanId?: string };
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const productId = String(body.productId || "");
  const purchaseToken = String(body.purchaseToken || "").trim();
  if (!PRODUCTS.has(productId) || !purchaseToken || purchaseToken.length > 4096) {
    return json({ error: "invalid_purchase" }, 400);
  }

  try {
    const token = await googleAccessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const googleResponse = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!googleResponse.ok) return json({ error: "google_purchase_not_verified" }, 400);
    const purchase = await googleResponse.json();

    const item = Array.isArray(purchase.lineItems) ? purchase.lineItems[0] : null;
    const state = parseState(String(purchase.subscriptionState || ""));
    const expiry = item?.expiryTime || null;
    const ackState = item?.acknowledgementState || purchase.acknowledgementState || "";
    const autoRenewing = Boolean(item?.autoRenewingPlan?.autoRenewEnabled);
    const basePlanId = item?.offerDetails?.basePlanId || body.basePlanId || null;

    if (ackState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      const acknowledgeUrl = `${url}:acknowledge`;
      await fetch(acknowledgeUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("upsert_google_play_subscription", {
      p_user_id: user.id,
      p_product_id: productId,
      p_base_plan_id: basePlanId,
      p_purchase_token: purchaseToken,
      p_status: state,
      p_starts_at: null,
      p_expires_at: expiry,
      p_auto_renewing: autoRenewing,
      p_acknowledged_at: ackState === "ACKNOWLEDGEMENT_STATE_PENDING" ? new Date().toISOString() : null,
      p_raw_state: String(purchase.subscriptionState || ""),
    });
    if (error) return json({ error: "entitlement_sync_failed" }, 502);
    return json({ ok: true, purchaseState: state, entitlement: data });
  } catch (error) {
    console.error("google_play_verify_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "verification_unavailable" }, 503);
  }
});
