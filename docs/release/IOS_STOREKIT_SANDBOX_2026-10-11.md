# NailMoods iOS — StoreKit Sandbox, candidate 0.8.1 (30004)

## Cause and observed evidence

In build 30003, the purchase context calls `getEnvironment` before `apple-verify/prepare`. The native plugin requires a verified `AppTransaction.shared`, representing the app download rather than the subscription being purchased. A missing/unverified app transaction stops prepare entirely while the independent product request still displays prices. The UI then disables both purchase buttons because its server context is null.

“Actualiser les offres” passes `refresh:true`. The native plugin invokes `AppTransaction.refresh()` after an error or unverified result. Apple documents that this call requests App Store authentication. It can even be called twice within one attempt if the first refreshed result is unverified. Successful authentication does not resolve the separate NailMoods account eligibility checks.

The dedicated Free test account initially had no Apple account-token row, hence no Sandbox authorization. Sandbox authorization was enabled for that account alone. Server inspection at diagnosis confirmed: email verified, age band 18+, not suspended, no manual paid entitlement, no other-provider subscription, Sandbox allowed, but current terms not accepted. This correctly returned `canPurchase=false`. A subsequent production read during build preparation found the current terms accepted and confirmed `eligible=true` and `canPurchase=true` in Sandbox. The account remains Free with zero Apple transactions. No consent was recorded on the user's behalf by this correction.

The original native catch discarded the Apple error domain/code. The precise underlying OS reason for the failed app transaction cannot be recovered from the reported UI alone. The code-level blocking chain and account eligibility causes above are confirmed; a specific Apple outage, credential error or network error is not established.

## Corrections

- The TestFlight workflow embeds `NailMoodsStoreKitEnvironment=Sandbox` in the actual native bundle and checks the archived/exported value. This is a routing hint only, not proof of purchase or permission to grant access. The generic build defaults to Automatic and rejects a forced Production value.
- In this Sandbox build, environment preparation no longer needs the app download transaction or an authentication prompt. Automatic routing retains `AppTransaction.shared` and safe OS domain/code diagnostics, without `refresh()`.
- Refreshing offers reloads products and server eligibility only. Interactive `AppStore.sync()` remains confined to the explicit Restore action.
- Each verified native transaction carries its StoreKit environment. A mismatch against the prepared context is rejected before server delivery.
- The offers screen distinguishes an unauthorized Sandbox account from unmet age/terms eligibility and preserves the existing offered-access messages.
- `apple-verify` and its deployed version 9 are unchanged: confirmed NailMoods session, server-controlled account token, signed JWS verification, Apple Server API lookup, trusted certificate roots, environment/bundle/product/ownership checks, and ledger persistence remain mandatory. `finish` follows successful server delivery; a failed verification leaves the transaction unfinished.
- No commercial billing setting, Apple environment secret, Google billing flag or offered Pro entitlement was changed. The six existing offered Pro ledger entries have the same before/after fingerprint.
- The old AdMob delivery no longer automatically reuses already-delivered build 30003 when the reusable iOS workflow changes. A separate one-time candidate workflow prepares build 30004 with demonstration ads.

## Validation and its limits

- Production `apple-verify/prepare` without authentication returns HTTP 401 with `authentication_required`.
- Isolated bridge tests cover Free → server-verified Plus, failed verification, canceled/pending purchases, mismatched environment, unauthorized Sandbox, missing consent, offered Pro protection, explicit restore, and noninteractive background reconciliation.
- The existing Postgres integration tests cover Apple/Google/manual coexistence, restoration, expiry, grace, refunds, ownership, Sandbox isolation and service-only writes. These use isolated fixtures, not Apple payments or production subscriptions.
- Full local tests: 673 tests, 671 passed, 2 skipped, zero failures. Web build passed. The delivery workflow repeated the same successful suite and passed responsive iPhone/iPad checks across six screens. All required signing-secret names are configured and the bundle ID is confirmed.
- Native compilation, signed IPA, Apple processing and TestFlight group status are checked by [candidate workflow 38141444914](https://github.com/MowayMCR/NailMoods/actions/runs/38141444914), source commit `8ab902924684d6ca26f33b684c32955cba26ca34`. Its result must be read before declaring the build available.
- **A real Apple Sandbox Plus purchase and restore have not yet been performed.** They require the tester's current-terms acceptance and the Apple purchase/restore sheet on a real TestFlight device. No synthetic Apple transaction was inserted in production and no Plus access was granted to simulate success.

## Device acceptance procedure

1. Install 0.8.1 (30004) after the workflow confirms Apple processing and TestFlight group availability.
2. Sign in with the dedicated Free NailMoods account. In Profile → Privacy, accept current terms; return to My offer and refresh.
3. Confirm test-purchase wording and both prices. Refresh twice: it must not request Apple authentication merely to reload offers.
4. Tap Buy Plus. Confirm Apple's test purchase sheet. Apple authentication may legitimately be requested for the purchase itself. TestFlight purchases use Sandbox and do not charge money.
5. Check the app's offer becomes Plus after server validation. Verify the server ledger contains `environment=Sandbox`, `product_id=nailmoods_plus`, a valid status/expiry, and recent `last_verified_at`; manual tier must remain Free.
6. Reopen the app, tap Restore my purchases, and verify the same original transaction remains associated with this account without a duplicate purchase or manual grant. Sandbox renewals/expiry are accelerated, so perform the active restoration before expiry, then separately verify return to Free after expiry.
7. An offered Pro account must still display its offered access and avoid a second subscription.

Apple references:
- https://developer.apple.com/documentation/storekit/apptransaction/refresh()
- https://developer.apple.com/documentation/storekit/apptransaction/shared
- https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox
- https://developer.apple.com/documentation/storekit/transaction/environment
