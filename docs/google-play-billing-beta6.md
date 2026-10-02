# NailMoods — Google Play Billing beta 6

## Release gate - mise à jour du 2 octobre 2026

**HOLD pour diffusion payante.** Les défauts B01-B09 de l'audit historique sont corrigés dans le code. Voir [le bilan de corrections et preuves](google-play-billing-corrections-2026-10-02.md) et [le guide complet Play Console](google-play-beta6-pas-a-pas.md).

- [x] Bridge Billing 9.1.0, paywall prix/période/renouvellement/résiliation et restauration.
- [x] SQL, validation produit/forfait/compte, acknowledgement et provenance séparée.
- [x] Droits manuels/fondateurs, annulation jusqu'à échéance, cycle de vie et second abonnement bloqué.
- [x] Migrations et fonction déployées en Recette/Production avec achats désactivés.
- [x] Nouveaux textes versionnés préparés, anciennes versions et consentements conservés.
- [x] Catalogue intégré avec IDs préservés ; 1 047 associations testées ; Excel joint dans `release/beta6`.
- [x] 366 tests locaux, build web et contenu web mobile réussis.
- [ ] Compilation Java finale contre le véritable SDK en CI.
- [ ] Profil marchand, produits/forfaits/prix/pays, licence testers, API et secrets configurés.
- [ ] Publication coordonnée des textes/client, versions légales serveur et Data safety.
- [ ] Candidat signé avec manifeste, versionCode libre et certificat d'importation vérifiés.
- [ ] Tests Google d'achat/restauration/annulation/expiration/grâce/blocage/révocation et priorité manuelle, tests caméra sur téléphone.
- [ ] Promotion du candidat validé au test fermé existant.

L'Excel conserve le SHA-256 `5ee75d3dfba63791a99a3761486db494bf27d7a9e067d88a809f473f3d1fc9ff`. Il accompagne l'AAB dans le lot, sans être importé dans Play Console. Aucun AAB final signé ni achat Google validé à cette reprise.

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

Corrections and the catalogue are saved on `feat/google-play-billing-beta6`; Billing is deployed but disabled. The signed candidate awaits configuration and compilation checks, then internal Google purchase tests before promotion to the closed track. The original audit is historical; consult the 2026-10-02 correction record.
