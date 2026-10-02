# Checklist de livraison — 2 octobre 2026

Légende : ✅ vérifié avec la preuve indiquée ; 🟡 préparé, action Apple/Marie ou déploiement restant ; ❌ défaut observé ; ⛔ impossible à vérifier dans cet environnement. Une compilation ne valide ni un achat ni App Review.

| Élément | État | Preuve / action restante |
|---|---|---|
| Branche de référence Android | ✅ | `feat/google-play-billing-beta6`, base `2ad9041` |
| Branche Apple séparée | ✅ | `feat/apple-storekit-ios`, aucune fusion Android/main |
| Projet Xcode / plugin StoreKit | ✅ compilation simulateur | CI `37038804502`, `evidence/ios-ci-success.txt` |
| Compilation Java Android | ✅ | même CI, `evidence/android-ci-success.txt` |
| Sources et assets iPhone | ✅ génération | `scripts/build-ios.mjs`, `scripts/ios-assets.mjs`, preuve assets |
| Archive de distribution / IPA | ⛔ signée | équipe, certificats et signature Apple absents ; une archive CI non signée ne permet pas TestFlight |
| Archive appareil Recette non signée | ✅ CI | `evidence/ios-archive-ci.txt`, artifact Actions `nailmoods-recette-unsigned-xcarchive`, rétention 7 jours |
| Bundle ID / Team ID | 🟡 | Marie confirme l’identifiant Apple avant création ; aucune disponibilité présumée |
| Produits / groupe / prix | 🟡 | Plus `nailmoods_plus`, Pro `nailmoods_pro`, un groupe, Pro niveau 1 ; création Apple et prix restant |
| Prix localisés / période / liens / restauration / gestion | ✅ sources ; 🟡 Apple | `AppleBillingPanel`, plugin natif ; vérifier StoreKit Sandbox sur iPhone |
| Validation serveur / webhook V2 | ✅ rejet négatif ; 🟡 validation positive | Recette déployée, JWS forgé refusé ; clés et achat Apple authentique manquants |
| Droits manuels indépendants | ✅ tests | SQL PostgreSQL isolé + tests Apple/Google ; expiration Apple ne rétrograde pas un manuel actif |
| Accès entre plateformes | ✅ logique serveur | tests O/P ; vraie restauration et changement d’appareil restant |
| Sandbox séparé | ✅ logique | whitelist administrateur, environnement signé ; aucune clé Apple installée |
| App Privacy / DSA / âge / export compliance | 🟡 | documents préparés ; aucune déclaration Apple enregistrée |
| PrivacyInfo.xcprivacy | ✅ plist / sources ; 🟡 archive | CA92.1 / C617.1 ; rapport agrégé et signatures SDK à contrôler dans l’archive finale |
| IA distante / ATT | ✅ recherche code | génération/OCR locaux, aucun prestataire IA ni SDK publicitaire trouvé ; pas d’ATT ajouté |
| Textes légaux et 24 mois analytics | 🟡 | sources mises à jour ; déploiement coordonné web/Android/iOS et migration de consentement restant |
| Pages sur nailmoods.com sans connexion | ❌ | protection Netlify observée ; ouvrir le site et déployer les pages actuelles |
| Anciennes pages GitHub Pages | ✅ accès ; ❌ actualité | confidentialité 0.6-beta / conditions 0.4-beta, textes antérieurs à cette livraison |
| Signalement / blocage / messagerie | ✅ tests partiels | 16 contrôles SQL Recette ; parcours complets iPhone à effectuer |
| Revue des photos avant publication | ✅ test SQL isolé ; 🟡 déploiement | migration UGC + preview staff préparés ; staff opérationnel et migration restant |
| Suppression réelle compte / médias | ✅ code audité ; ⛔ E2E | Edge supprime via Storage API puis Auth ; exécuter avec un compte jetable et vrais médias |
| Nettoyage médias authentifié | ✅ SQL + HTTP | nonces une fois / 2 minutes, anciennes clés refusées ; cron installé dans les deux projets |
| Permissions pg_net gérées | ❌ ACL résiduelle | REVOKE sans effet pour postgres non propriétaire ; faire corriger par propriétaire/Supabase |
| Protection mots de passe compromis | ❌ réglage observé | activer dans Supabase Auth ; disponibilité du plan à vérifier |
| Accessibilité iPhone / Dynamic Type / contraste | 🟡 / ⛔ appareil | boutons 44 px, focus/modales/labels existants ; VoiceOver et zoom à mesurer |
| Captures Store et abonnement | 🟡 | produire depuis un vrai binaire et des données fictives |
| Compte de review stable | 🟡 | procédure prête ; créer identifiants hors Git et les saisir dans Apple |
| TestFlight / App Review / publication | 🟡 | suivre `APPLE_SUBMISSION_STEPS.md` ; rien soumis ni publié |

Avant tout déploiement partagé, lire la matrice Recette/Production de l’audit. Ne pas exécuter toutes les migrations historiques de ce dépôt sur un projet existant sans réconciliation préalable : certaines migrations anciennes ont déjà été appliquées.
