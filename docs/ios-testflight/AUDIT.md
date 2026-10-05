# NailMoods — audit iOS / TestFlight, 5 octobre 2026

## Source de vérité et branches

Dépôt : https://github.com/MowayMCR/NailMoods

La base mobile retenue est `1418e47905436bcf9cd072d4105fa4eaaf873883`, tête constatée de `feat/apple-storekit-ios`, `feat/google-play-billing-beta6`, `build/v0.8-da06` et `release/v0.8.0-code9`. Elle descend de `main` (`e90b862c564613b2f981a4307647012f59588afc`) et contient deux commits supplémentaires : préparation 0.8.0/code9 et correction des imports React pour les volumes macOS insensibles à la casse. Le correctif de contour d’ongle est déjà son ancêtre. Aucun retour à la branche DA06 ancienne.

Branche de travail : `feat/ios-testflight-beta1`. PR technique : https://github.com/MowayMCR/NailMoods/pull/11 ; base Apple, sans fusion automatique du frontend dans Production. Le dossier conserve le code sur GitHub, les preuves et procédures dans ses annexes.

## Première restitution avant credentials

| Point | Constat / décision |
|---|---|
| Source | Branche Apple 1418e47 alignée sur Android, source commune la plus récente pour mobile |
| Identité | `com.nailmoods.app` déjà dans le code ; existence dans le compte Apple NON vérifiée. Réutiliser l’identité Apple enregistrée si différente, via la variable `IOS_BUNDLE_ID` |
| Wrapper | Capacitor core/ios 8.5.2, SPM ; aucun CocoaPods nécessaire pour ce projet |
| Toolchain | macOS 15, Xcode 26.3 explicitement sélectionné, SDK iOS 26.2 ; refus si SDK <26 |
| Projet | Xcode présent, SceneDelegate instancie le contrôleur enregistrant StoreKit et calendrier. Deployment Target 16.0 |
| Appareils | Initialement iPhone seulement ; corrigé pour familles 1 et 2. iPhone portrait, iPad portrait/paysage |
| Capabilities | In-App Purchase. Pas de Sign in with Apple, Associated Domains ou Push Notifications nécessaires au parcours actuel |
| StoreKit | Plugin natif StoreKit 2, prix/durées Apple, appAccountToken UUID, achats/restauration/gestion, finition après validation serveur |
| Privacy | Manifest app présent et ajouté aux ressources. Capacitor est sur la liste Apple. Vérification des manifests embarqués au build ; contrôle Apple SDK signatures encore dépendant du build/upload |
| Secrets | 7 secrets GitHub pour signature/upload ; secrets achats serveur séparés. Aucun certificat/profil créé par Work |

## Fonctions incluses

La source contient DA06 et 4 moods, Accueil / Fil / Créer / Collection / Mes poses, Profil et onboarding, Inspire-moi, Scan & Génère et reconnaissance catalogue, import de photos, génération illustrée et variantes, Journal, Atelier Pro, publications, recherche de personnes, connexions et messagerie, profils publics, partage PO, Projet de pose, Ma tenue, Planning, DIY, tutoriels, suivi de pose et Trainer. Le catalogue vérifié est celui du dépôt actuel ; ses tests `catalog-v2` et `scan-resolution` contrôlent la consolidation. Les références Excel jointes ne remplacent pas arbitrairement ce catalogue déjà livré.

La présence du code et la réussite de tests ne prouvent pas que caméra, OCR physique, upload média et recherche Internet fonctionnent sur un iPad. Ces essais figurent dans la recette matérielle. Le rendu reste illustré ; ne pas annoncer un rendu photoréaliste validé.

## Corrections effectuées

- Device family iPhone/iPad et orientations iPad explicites ; iOS 16 minimum conservé.
- Layout Apple large jusqu’à 1040 px, Collection 3 puis 4 colonnes, formulaires/modalités limités en largeur ; safe area haute appliquée une fois.
- Numéro de build Apple indépendant : par défaut 10000 + numéro d’exécution GitHub. Version commerciale 0.8.0 et Android code9 conservés.
- Exclusion à la compilation des modules Google Billing et de leurs endpoints sur iOS ; contrôle du JS embarqué.
- Laboratoire IA+ fermé à la compilation sur iOS : un flag serveur ne peut plus rendre ses appels accessibles dans ce build. Entitlement IA+ indépendant conservé côté serveur et code commun ; aucun produit/paywall IA+ créé.
- Description caméra spécifique ; pas de permission photothèque globale pour PHPicker, pas de sauvegarde Photos (`saveToGallery:false`), pas de microphone/localisation/contacts/ATT.
- `ITSAppUsesNonExemptEncryption=false`, d’après le client : HTTPS/TLS standard, SHA-256 PKCE/hachage et génération aléatoire, sans chiffrement propriétaire ou chiffrement de messages de bout en bout. Les signatures Apple côté serveur ne sont pas du chiffrement propriétaire du client.
- Workflow signature manuelle CI, profil App Store contrôlé (Team, application-identifier, expiration, absence de mode développement/ad hoc), certificat correspondant, archive Release, IPA, vérification signature et manifests, validation/envoi Apple, dSYM et SHA256, nettoyage des secrets.
- Schéma Xcode partagé, cible XCTest de lancement/orientation, captures natives iPhone/iPad, contrôles Chromium distincts de la recette native.
- Scripts Windows natifs `certreq` et PowerShell : pas de Mac nécessaire pour préparer CSR/P12.

## Architecture achats et droits

`AppleBillingPanel.jsx` affiche les prix et périodes StoreKit et les liens juridiques ; `BillingSync.jsx` sélectionne Apple sur iOS. Les transactions locales n’accordent pas d’accès. `apple-verify` vérifie le JWS puis relit App Store Server API ; l’appAccountToken est lié au compte NailMoods. `apple-notifications` valide Notifications V2 et réconcilie l’état serveur. Le client ne finit la transaction qu’après succès serveur. Une restauration d’un autre compte est refusée. Le calcul multi-source garde les droits manuels bêta prioritaires ; les droits Google et Apple restent distincts. IA+ a ses propres tables et contrôle d’accès.

Les états actifs, annulés jusqu’à expiration, grâce, expiration, révocation/refund et changement de formule sont préparés. Les essais Sandbox réels, notifications Apple signées et fonctionnement réseau de la vérification ne sont pas validés par un mock. Les achats restent fermés tant que configuration et essais n’ont pas été faits.

Produits attendus dans le code : `nailmoods_plus`, `nailmoods_pro`. Les identifiants réellement déjà créés dans Apple ne sont pas connus. Les réutiliser s’ils existent ; une différence nécessite une modification du code AVANT build. Un groupe NailMoods, Pro niveau 1 et Plus niveau 2 ; achat individuel, multiseat désactivé et Family Sharing non activé.

## Authentification, liens et compte

Schéma existant conservé : `com.nailmoods.app://auth/callback?auth=callback` et `...?auth=recovery`. L’identité Bundle peut être différente sans changement du schéma d’authentification historique. Le parser accepte PKCE/code ou token_hash autorisé et rejette mélanges/liens incomplets ; pas de secrets d’API dans les URLs. Les tokens de session ne sont pas journalisés par le pipeline. Les anciens callbacks implicites restent acceptés pour compatibilité ; privilégier le flux PKCE/code. Universal Links et fichier AASA ne sont pas configurés ; ils ne sont pas annoncés fonctionnels. L’ouverture depuis Safari/Mail sur le même appareil, le lancement à froid et les liens expirés nécessitent la recette iPad.

L’onboarding utilise le profil cloud et `onboarding_completed`. Parcours réel de suppression : Profil → Gérer mon compte → Confidentialité / Données → Supprimer mon compte, ou liens confidentialité du Profil. Confirmation `SUPPRIMER` → Edge Function `account-delete` → RPC de contrôle/objets/finalisation, nettoyage média, compte/données puis cache local et déconnexion. La politique explique que les messages déjà reçus par les correspondants et les copies exportées ne s’effacent pas à distance. La suppression du compte ne résilie pas l’abonnement Apple. Les cascades des nouvelles tables Projet/Planning/IA sont testées localement ; suppression complète production et comportement d’une ancienne session/JWT encore à tester avec un compte jetable, jamais le compte de Marie.

## UGC et modération

Code backend/RPC de signalement, blocage, retrait de connexion et revue staff présent ; les nouveaux uploads publics restent privés avant revue staff. Les tests SQL contrôlent ces chemins. Support affiché : contact@nailmoods.com. Procédure à fournir à Apple : connexion à deux comptes non staff, publication d’essai, signalement, blocage, vérification du masquage et traitement via compte modérateur séparé. Objectifs affichés : support/compte sous 48 h ouvrées, signalements sous 24 h ouvrées, urgent dès lecture ; la réalité de cette permanence doit être assurée par Marie. Pas de déclaration « modération conforme » sans essai iPad + backend courant.

## Limites des preuves

530 tests passent, 2 sont ignorés (532 découverts) sur Linux ; build web et build/sync iOS réussis. Actionlint valide le workflow. Compilation AAB Android non signée de contrôle réussie dans GitHub run 37303060344. Mac/Xcode et simulateurs sont exécutés par la CI ; leur statut et leurs logs sont référencés dans les preuves finales. Pas de certificat, Team, compte Apple, accès App Store Connect, IPA signé ou installation physique ici. Aucune certification Apple globale ne peut être déduite des seuls tests.

Le backend réel NailMoods (Paris, ACTIVE_HEALTHY) a été inspecté sans lire de secrets ni de données personnelles. Les migrations Apple achat/retention/réconciliation étaient déjà présentes ; aucun doublon appliqué. Les fonctions manquantes `apple-verify` et `apple-notifications` ont été déployées, version 1. Tests HTTP sans session : vérification achats → 401 authentication_required ; fausse notification → 400 invalid_signed_payload. Le flag Apple reste false ; zéro abonnement Apple enregistré ; cron présent, URL de réconciliation encore à configurer. IA+ : enabled=false et public_enabled=false. Les RPC sociaux/support et les trois RPC de suppression du compte existent en production. La migration UGC de prépublication manquait : elle a été appliquée ; une photo Journal précédemment publique est conservée en attente staff et ne sera republiée qu’après validation. Les parcours authentifiés et secrets achats ne sont pas validés par ces contrôles négatifs. Les credentials serveur Apple restent à configurer avant ouverture Sandbox. SPM racine fixe Capacitor 8.5.2, npm utilise package-lock ; conserver le Package.resolved généré par macOS pour verrouiller aussi les dépendances SPM transitives et le même Xcode pour reproduire un build.

## Retour arrière

Revenir à 1418e47 sur une nouvelle branche, annuler les commits via PR, laisser Android intact. Un upload TestFlight ne se supprime pas comme un fichier : expirer le build dans App Store Connect → TestFlight → build → Expire Build, puis envoyer un nouveau numéro unique. Ne pas supprimer de comptes/données pour revenir sur une UI. L’ancien droit manuel reste administré séparément. Les certificats restent valables : ne pas les révoquer pour un simple rollback logiciel.
