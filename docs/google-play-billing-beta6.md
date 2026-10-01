# NailMoods — Google Play Billing beta 6

## Release gate — reviewed 2026-10-01

**HOLD: the implementation is not ready for a final Billing AAB.** The source audit found code blockers in addition to Play Console configuration. See [the detailed policy and implementation audit](google-play-policy-audit-2026-10-01.md). The architecture and matrix below describe the intended behavior, not completed purchase validation.

- [ ] Resolve audit B01–B09: supported Billing SDK, transparent paywall/cancellation, valid SQL and server-only RPC, verified product/account binding, correct acknowledgement, entitlement provenance/manual priority, lifecycle reconciliation and truthful status messages.
- [ ] Publish updated terms/privacy and align Data safety with Billing.
- [ ] Complete Google Play configuration and real purchase/restore/cancel/expiry tests, preserving admin and founder invitation rights.
- [ ] Validate account deletion, UGC reporting/blocking, reviewer access and final merged permissions.
- [ ] Integrate the audited catalogue with stable existing catalog IDs and run its application/phone scan tests.
- [ ] Deliver `NailMoods_V2_Fusion_V1_V2_auditee_2026-10-01.xlsx` in the same release package as the signed Billing AAB. Expected SHA-256: `5ee75d3dfba63791a99a3761486db494bf27d7a9e067d88a809f473f3d1fc9ff`.

Read-only checks confirmed that free self-selection of paid tiers is disabled in both Production and Recette. The Billing table and verification Edge Function are not deployed in either environment. The workbook is a validated delivery source; it is not yet evidence of an in-app catalogue update.

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
8. Resolve all source and policy blockers above and complete the release tests before generating the final signed AAB with versionCode 6 (provided this code remains available in Play Console).

## Test matrix

- Free: generation remains available; Plus/Pro features show the paywall.
- Manual Plus: features remain active; Google Play cannot downgrade it.
- Manual Pro: features remain active; Google Play cannot downgrade it.
- Free -> Plus purchase: token is verified and entitlement becomes active.
- Free -> Pro purchase: token is verified and entitlement becomes active.
- Restore: active purchases are re-verified.
- Pending/grace/hold: no premature permanent grant; server state is retained.
- User cancellation: preserve access until the paid-through expiry, except an immediate refund/revocation that removes access.
- Expire/revoke: remove only the affected Google entitlement; preserve other valid subscriptions and valid manual/founder rights.

## Current stop point

The source changes are drafted on branch `feat/google-play-billing-beta6`. The final AAB remains on hold until code blockers, product/base-plan/API setup, policy declarations, catalogue integration and release tests are resolved. The 2026-10-01 audit does not grant release approval.
