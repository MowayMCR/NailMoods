# NailMoods — Google Play Billing beta 6

## Architecture

- Android Capacitor plugin: `NailMoodsBilling`.
- Products: `nailmoods_plus`, `nailmoods_pro`.
- Free remains a non-billing tier.
- The Android bridge only reads products, launches purchase and restores purchases.
- Purchase tokens are verified server-side by the Supabase Edge Function `google-play-verify`.
- The client never grants access from the local Billing response alone.
- Existing manual/admin Plus or Pro entitlements have priority over Google Play.

## Required server secrets

Configure only in Supabase Edge Function secrets:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `GOOGLE_PLAY_PACKAGE_NAME=com.nailmoods.app`

Never commit the service-account JSON or private key.

## Required Play Console setup

1. Create subscriptions `nailmoods_plus` and `nailmoods_pro`.
2. Create and activate one base plan for each product.
3. Record the exact base-plan IDs.
4. Add license testers.
5. Link the Google Cloud service account to Play Console with Android Publisher access.
6. Add the service-account JSON to Supabase secrets.
7. Apply the migration and deploy the Edge Function.
8. Only then generate the signed AAB with versionCode 6.

## Test matrix

- Free: generation remains available; Plus/Pro features show the paywall.
- Manual Plus: features remain active; Google Play cannot downgrade it.
- Manual Pro: features remain active; Google Play cannot downgrade it.
- Free -> Plus purchase: token is verified and entitlement becomes active.
- Free -> Pro purchase: token is verified and entitlement becomes active.
- Restore: active purchases are re-verified.
- Pending/grace/hold: no premature permanent grant; server state is retained.
- Cancel/expire/revoke: entitlement is removed only when no manual entitlement exists.

## Current stop point

The source changes are prepared on branch `feat/google-play-billing-beta6`. The final AAB is intentionally not generated until products, base plans and Android Publisher access are configured.
