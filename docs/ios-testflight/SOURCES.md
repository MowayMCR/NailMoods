# Sources officielles consultées le 5 octobre 2026

Les exigences Apple sont fondées sur Apple ; GitHub, Capacitor, Supabase et Microsoft sont utilisés uniquement pour leurs propres outils. Les titres/routes des interfaces peuvent être traduits sur ton compte.

| Décision | Source primaire |
|---|---|
| SDK26+ depuis le28avril2026 | https://developer.apple.com/news/upcoming-requirements/?id=04282026a |
| Upload actuellement supporté, altool/APIkey | https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/ |
| Rôles et API keys | https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/ ; https://developer.apple.com/help/app-store-connect/reference/account-management/role-permissions/ |
| Certificat Apple Distribution | https://developer.apple.com/help/account/certificates/create-a-certificate-signing-request/ |
| Profil distribution App Store | https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/ |
| Testeurs internes/groupe, expiration90jours | https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/ |
| App Privacy / catégories / collecte / tracking | https://developer.apple.com/app-store/app-privacy-details/ |
| Privacy Manifest / Required Reason APIs | https://developer.apple.com/documentation/bundleresources/privacy_manifest_files ; https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api |
| Capacitor sur la liste SDK tiers | https://developer.apple.com/support/third-party-SDK-requirements/ |
| Compte, UGC, achats, auth et revue | https://developer.apple.com/app-store/review/guidelines/ |
| Questionnaire âge et override contractuel | https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/ ; https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/ |
| Export compliance | https://developer.apple.com/help/app-store-connect/manage-app-information/determine-and-upload-app-encryption-documentation/ |
| Abonnements, groupe, classement et multiseat | https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/ ; https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-purchase-options/ |
| Clé In-App Purchase / App Store Server API | https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/generate-keys-for-in-app-purchases/ ; https://github.com/apple/app-store-server-library-node |
| Racines de confiance Apple | https://www.apple.com/certificateauthority/ |
| Notifications V2 | https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/enter-app-store-server-notification-urls/ |
| DSA / TestFlight-only | https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/ |
| Runner macOS15 / Xcode installé | https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md |
| Bouton Run workflow et branche par défaut | https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow |
| Auth/deep links Supabase natif | https://supabase.com/docs/guides/auth/native-mobile-deep-linking |
| CSR Windows certreq | https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certreq_1 |
| Export P12/PFX Windows | https://learn.microsoft.com/en-us/powershell/module/pki/export-pfxcertificate |

Les sources décrivent des règles et outils, pas l'état du compte Apple de Marie. Les preuves de compilation/backend sont dans les logs du dossier ; les identités, produits, contrats et secrets Apple restent à vérifier dans ses comptes.
Signature manuelle par cible : https://help.apple.com/xcode/mac/current/en.lproj/dev1bf96f17e.html
