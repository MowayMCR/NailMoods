# Salon — common implementation, validation branch

## Reused foundations

The implementation extends existing institute workspaces, profile/showcase identities, member roles, consent-based invitations, server seat entitlements, Journal/inspiration references, media review and reporting. It does not create a second CRM or photo store. Existing personal data and manual Plus/Pro rights remain authoritative. Native purchase preparation already rejects a second personal subscription when an institute entitlement is active; fresh client checks and explanatory UI now match it.

## Delivered in this branch

- Salon panel in the existing professional profile: invitation inbox, personal gallery sources, collaborative contributions, team and moderation controls.
- Journal camera/import save path can also reference the synced creation in the Salon. The personal save survives a Salon submission error.
- Server checked capacity, membership, expiration and suspension; source ownership; configurable moderation; author edit/withdraw; responsible approval/refusal/hide/order; per-member publication permission. Historical portfolio callers obey the same rules.
- Public portfolio includes author credit/profile link, caption, date and existing technique preview. Private sources and unapproved media are protected by existing projections. Departed members' contributions disappear publicly; personal sources remain.
- StoreKit catalog retrieval survives entitlement-context failure; explicit refresh can recover App Store context. Price strings still come from StoreKit and Google Play, never from French hard-coded prices. Existing product IDs are retained.
- AdMob 8.2.0 registered for both native targets with Google's demonstration app/unit IDs. Lazy explicit test-video flow, UMP check, NPA request, persistent refusal/withdrawal, server rights check and remote kill switch. No advertisement on Web or paid/Salon rights, no ad in book/editor/galleries/save. A disabled Fil slot prepares the sponsored layout.
- Server reward ledger and signature verification endpoint are prepared. No SDK-only reward becomes a credit. Real-reward ticket issuance and integration with the generation quota are deliberately not enabled; demonstration ads cannot generate credits.
- Tablet book/cover return and compact tile changes are inherited from main f99012f and rechecked by the browser workflow.

## Database and rollout

Four additive migrations were applied to recette **pueqkbwfwxgqzmkauxoz**, not production. New private tables have RLS and no client table grants; narrow invoker RPCs delegate to server permission checks. Ad configuration defaults disabled on Android and iOS. The reward edge function is not deployed. No Salon Store products were created.

Feature flags remain off by default: `VITE_SALON_ENABLED`, `VITE_ADMOB_TEST_ENABLED`, `VITE_ADMOB_NATIVE_PREVIEW`. Validation enables Salon only. Native compile workflow is unsigned and does not upload to TestFlight, Play or Pages.

## Verification and limitations

`npm test`, Web/mobile builds, native Capacitor synchronization, PGlite permission/privacy/expiration tests, cryptographic callback mutation tests, and policy matrix. The CI additionally exercises real React components with synthetic SQL-backed users at 390/768/1024/1366px and validates the book return to cover, then compiles Android Java and iOS simulator. This is not a claim of camera hardware, device Store purchase or ad delivery validation.

## Remaining manual/commercial validation

- App Store Connect and Play Console: check France Plus 4.99 EUR/month, Pro 14.99 EUR/month, localized storefront prices and available products. Store configuration is separate from client code. Keep Pro above Plus in the Apple subscription group.
- Complete first subscription metadata/review screenshots and submit with an app version as required; test on TestFlight/Google licensed test accounts. Existing beta rights must remain unchanged.
- Decide Salon capacities/prices and Store product strategy before creating SKUs; paid capacities must be derived from verified purchases, never a client field. Current capacity is existing staff/manual entitlement. Duo/Studio/Equipe prices are not approved or implemented.
- Physical device checks: camera and image import, publishing review, join/leave/transfer, purchase/restore and expiration on both platforms; TestFlight upload requires a separate signed build after validation.
- AdMob: choose the reward and daily budget; integrate server-only ticket issuance and atomic quota consumption before commercial rewards. Configure UMP/CMP, App Privacy, Play Data Safety and any ATT/personalized-ad requirements. Google's test units do not demonstrate commercial callbacks. Real ad IDs must stay out of Git; signed callback endpoint remains disabled until separately approved/configured.
- Publish neither Salon purchases nor real ads nor this Web branch without explicit validation.

The Supabase CLI migration command was blocked by automatic review because it attempted an unexpected telemetry request. Schema changes were instead applied through the Supabase database connector; no CLI retry was made.
