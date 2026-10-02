# Audit Apple / iOS / Union européenne

Audit du 2 octobre 2026. Les exigences officielles Apple ont été consultées pendant la mission ; les liens de référence figurent ci-dessous et dans le guide. L’audit décrit les sources de cette branche et les observations réelles. Il ne constitue ni une acceptation Apple ni une certification juridique.

## État initial, architecture et Git

Le dépôt utilise réellement **React/Vite et Capacitor 8**, avec un wrapper Android existant et une interface web partageant la logique. Ce n’est pas une hypothèse de migration native. La base utile est `feat/google-play-billing-beta6`, `2ad90410549b5b0da31e2541d731742264f00717` ; `main` est antérieur à cette intégration. Le travail Apple est isolé dans `feat/apple-storekit-ios` ; aucune fusion Android/main n’a eu lieu.

Les fonctionnalités existantes comprennent collection, scan OCR/code-barres, générations procédurales et rendus locaux, inspirations, Journal, comptes/profils, espaces professionnels, créations Pro, Découvrir, connexions et messagerie. Supabase fournit Auth email/mot de passe, PostgreSQL/RLS, Storage et Edge Functions. Les données invitées sont locales ; les données du compte sont synchronisées avec cache et contrôle d’accès. L’UI utilise notamment IndexedDB/localStorage, Capacitor Preferences et fichiers privés pour récupérer une photo interrompue.

Google Play Billing possédait déjà produits, plugin Java, validation backend et réconciliation ; ils ont été conservés. Les offres Free/Plus/Pro et les droits gratuits existaient aussi, via `private.account_entitlements`. Il n’y avait pas de projet Xcode ni de chaîne Apple complète dans cette base.

Principaux fichiers créés : `ios/`, plugin StoreKit Swift/controller, `appleBilling`, panneau et synchronisation communs billing, `apple-verify`, `apple-notifications`, `_shared/appleServer.ts`/`appleCore.mjs`, migrations Apple et réconciliation, manifest, scripts iOS/secrets, modération prépublication/preview, tests et dossier `/app-store/`. Principaux fichiers modifiés : panneaux profil/offre/confidentialité, store de synchronisation, plateforme médias/export/styles, configuration Capacitor/Vite/npm, pages légales et workflow CI. La liste exacte est `FILES_CHANGED.txt` ; les commits se trouvent dans `GIT_DELIVERY.md`.

## iOS et distribution

✅ Projet Xcode généré et plugin Swift compilé en CI macOS pour simulateur, Xcode 26.6/SDK 26.5 au commit `f9aa1cd`. CI Java Android également réussie. Une vérification supplémentaire d’archive non signée est décrite dans les preuves de build lorsqu’elle est terminée. Aucun binaire signé App Store ni IPA n’a été créé.

Minimum d’installation **iOS 16**, requis pour le choix d’API `AppTransaction`/environnement et cohérent avec les plugins. iPhone uniquement, portrait, device family 1 ; cible appareil arm64, simulateur arm64/x86_64. Swift Package Manager remplace toute supposition de CocoaPods ; version Capacitor Swift exacte 8.5.2. Le chargement passe par `NailMoodsViewController`, y compris SceneDelegate ; sans ce correctif, le bridge ne chargeait pas le plugin local.

Le bundle par défaut est dérivé du mobile existant. **Aucune existence dans Apple Developer n’a été vérifiée**. Marie doit confirmer la recommandation `com.nailmoods.app`, avec override `NAILMOODS_IOS_BUNDLE_ID`. Team ID et signature sont volontairement absents. Les schémas Auth historiques restent `com.nailmoods.app[.recette]://auth/callback?auth=callback|recovery`, sans lien universel inventé.

Safe areas, clavier/visual viewport, gestes/historique de modales, navigation, ouverture de liens via Browser et partage/export système sont préparés. Le CSS iOS impose 44 px minimum hauteur/largeur des boutons, focus visible et réduction de mouvement ; les modales existantes gèrent focus, inert et Escape. Les champs/formulaires clés possèdent labels, erreurs et annonces `role=status`. ⛔ VoiceOver réel, contraste de tous les écrans, zoom/Dynamic Type, navigation avec encoche/Dynamic Island, mode sombre et absence de débordement ne sont pas certifiés sans recette sur appareil. L’app garde sa DA claire, même si le système est sombre ; aucune prise en charge complète du dark mode n’est revendiquée.

Icône 1024×1024 RGB opaque issue du symbole officiel, pas un logo recréé. Splash généré à partir du même symbole. Preuve dimensions/alpha/permissions : `evidence/ios-assets-permissions.json`. Aucune capture de Store finale inventée : le guide précise les formats et les écrans à capturer.

## Abonnements et validation

✅ StoreKit 2 natif, produits exacts `nailmoods_plus` / `nailmoods_pro`, appAccountToken aléatoire non directement personnel, transactions signées, restore explicite, unfinished/updates et gestion native d’abonnement sont implémentés. Aucun paiement web ou lien d’achat Google n’est proposé sur iOS. Le paywall présente fonctionnalités, nom, prix StoreKit, période, renouvellement, annulation et liens légaux. La réussite locale ne suffit pas : l’Edge vérifie JWS, bundle/environnement/token/produit, puis App Store Server API et l’état signé des abonnements. Les secrets sont exclusivement serveur. Finishing intervient après persistance vérifiée.

Notifications V2 vérifiées et lecture serveur indépendante des sessions. Écritures horodatées et refetch de l’état Apple limitent les régressions dues aux notifications retardées. Réconciliation toutes les cinq minutes, dix abonnements par lot, nonce à usage unique ; aucun secret Apple dans cron. Sandbox est autorisé seulement sur un mapping administrateur, jamais par paramètre client seul.

✅ Résolution centralisée du meilleur droit valide parmi **manual_beta / google_play / apple_app_store**. Les sources manuelles internes existantes restent `admin`, `beta_self_selection`, `legacy`, `beta_invitation` : pas de migration qui transforme ces grants en reçus. Un manuel actif garde son niveau à l’expiration/remboursement Apple ou Google. Provenance et périodes des abonnements restent séparées. Un abonnement valide sur une autre plateforme donne accès et empêche l’achat d’un deuxième fournisseur ; iOS indique l’offre active sans CTA externe.

🟡 Groupe Apple unique, Pro niveau 1/Plus niveau 2, périodes/prix/localisations/captures doivent être configurés par Marie. Aucun achat réel, retour OCSP positif en Edge, renouvellement Apple ou refund authentique n’est encore prouvé. Pas de Family Sharing, Streamlined Purchasing ou réattribution d’achat après suppression du compte dans cette première version. Sans token account valide, un achat n’est pas attribué à un autre compte. Voir les cas A–S et limites dans `APPLE_TEST_RESULTS.md`.

## État réel des environnements Supabase

| Élément | Recette `pueqkbwfwxgqzmkauxoz` | Production `rvqmtnqvzzxzwfxfyjcg` |
|---|---|---|
| Google / grants manuels initiaux | présents, conservés | présents, conservés |
| Apple ledger/mapping/settings | migrations appliquées | pas déployés pendant cette mission |
| Apple réconciliation | migration appliquée, désactivée | pas déployée |
| apple-verify / apple-notifications | ACTIVE v1, config inactive | pas déployées |
| Secrets Apple | absents | absents |
| Version serveur privacy / terms Apple | nouvelles versions non appliquées | nouvelles versions non appliquées |
| Rétention analytics unifiée 24 mois | migration préparée, non appliquée | idem |
| Prépublication UGC / moderation-preview | préparées, non déployées | idem |
| Tentative REVOKE pg_net | exécutée mais ACL inchangée | exécutée mais ACL inchangée |
| Nettoyage médias nonce | migrations + Edge v2 déployées ; cron existant adapté | migrations + Edge v3 ; cron ajouté car absent |

Les changements Apple ne sont donc **pas une activation de facturation** en production. Les modifications légales et de modération partagées attendent un déploiement coordonné des clients Android/web : l’ancien client Android n’a pas été invalidé par une nouvelle exigence de consentement serveur.

## Données, Privacy Manifest, ATT et IA

L’inventaire réel et les cases Apple sont détaillés dans `APPLE_PRIVACY_ANSWERS.md`. Email/nom/handle/UUID/avatar/photos/Journal/messages/support/publications/achats sont liés au compte. Analytics est facultatif et interne Supabase avec identifiant pseudonymisé réversible ; il est déclaré lié à l’utilisateur par prudence, et ne doit pas être présenté comme anonyme. Ville professionnelle facultative saisie manuellement : Coarse Location, sans GPS. Diagnostics ne contiennent pas volontairement de corps de message/photo/Journal, mais les logs d’hébergeur et paramètres effectifs sont à confirmer. Aucun numéro de carte n’est collecté par NailMoods.

Correction de minimisation : les pièces jointes photo support, qui pouvaient auparavant être envoyées telles quelles, passent désormais par le réencodage canvas JPEG comme les autres parcours photo. Les métadonnées source EXIF/GPS ne sont pas transmises par ce nouveau parcours. Les photos éventuellement conservées avant cette version et les pièces jointes envoyées directement par email exigent une vérification distincte ; aucune purge de métadonnées historiques n’est prétendue.

✅ `PrivacyInfo.xcprivacy` valide en plist, `NSPrivacyTracking=false`. Required Reason APIs identifiées : Preferences/UserDefaults pour le stockage de l’app (**CA92.1**) ; FileTimestamp pour fichiers du conteneur de l’app (**C617.1**). Ces codes proviennent des recommandations Capacitor reliées aux raisons Apple autorisées ; aucun code inventé. Les autres SDK/manifests transitifs doivent être inspectés dans l’archive, pas simplement supposés couverts par celui de l’app.

| Dépendance | Usage constaté | Contrôle restant |
|---|---|---|
| Capacitor core/iOS 8.5.2 | WKWebView/bridge/runtime | manifest/runtime + binaires agrégés archive |
| App, Browser, Keyboard, Network, SplashScreen | lifecycle, liens, clavier, réseau, launch | plugins compilés ; permissions et manifest agrégé |
| Camera 8.2.4 | caméra ponctuelle et PHPicker | comportement iPhone / refus et annulation |
| Preferences 8.0.1 | récupération/état propre à l’app | manifeste CA92.1 |
| Filesystem 8.1.3, IONFilesystem transitif | copies privées et export cache | manifeste C617.1, signatures/version transitive dans archive |
| Share 8.0.3 | feuille de partage JSON | aucune permission photos ajoutée ; test iPhone |
| Supabase JS 2.116.0 | Auth/DB/Storage/realtime | SDK JS, pas une supposition de SDK natif iOS |
| Tesseract 7 / langues / ZXing | reconnaissance locale OCR/code-barres | assets embarqués ; performances/offline iPhone |
| React/Vite/lucide | UI/build/icônes | lockfile, audit npm, accessibilité UI |
| Apple App Store Server Library 3.1.0 | vérification serveur | uniquement Edge, jamais clé privée cliente |
| Firebase, Sentry, pub/attribution/analytics tiers, push | aucun SDK correspondant trouvé | refaire inventaire si dépendance ajoutée |

✅ Aucun tracking au sens Apple trouvé dans le code audité : ni publicité, ni partage pour suivi entre sociétés, ni fingerprint publicitaire. ATT n’a pas été ajouté. Une permission caméra n’est pas assimilée à un consentement analytics. Le refus analytics conserve les fonctions principales et les choix sont retirables depuis confidentialité.

✅ Génération, analyse couleurs et OCR fonctionnent localement ; aucune API OpenAI/Gemini/Anthropic/autre IA tierce identifiée. La photo peut être sauvegardée dans Supabase sur action d’import/sauvegarde/publication ; ce n’est pas un envoi à une IA. Aucun faux fournisseur ni faux consentement IA distant ajouté. Si une IA distante est ajoutée plus tard : identifier fournisseur et champs, informer avant transfert, consentement explicite révocable distinct, journal minimal, refus sans bloquer les fonctions indépendantes, politique et tests actualisés conformément à 5.1.2(i).

## RGPD, textes et conservation

Pages publiques préparées : `/legal/confidentialite.html`, `/legal/conditions.html`, `/legal/support.html`, mentions et suppression. Liens locaux embarqués sur iOS ; historique des textes conservé. Versions de cette branche privacy **0.8-beta**, conditions **0.6-beta**, mentions **0.5-beta**. Elles restent des textes préparés : l’activation commerciale et les mentions professionnelles/contractuelles doivent être relues par Marie avant App Review.

❌ Incohérence trouvée et corrigée dans les sources : analytics détaillés 13 mois / agrégats 25 mois auparavant, alors que la mission prévoit 24 mois. Code/migration/pages actuelles alignés sur **24 mois** pour les deux ; migrations non appliquées aux clients anciens. Aucune modification silencieuse des durées support **3 mois** après clôture, signalements **12 mois**, traitement suppression au plus **30 jours lorsque nécessaire**. L’Edge vise une suppression immédiate ; panne de média renvoie réessai, pas une fausse confirmation. Les sauvegardes/obligations de conservation et les demandes légales éventuelles exigent validation contractuelle.

Support/signalements possèdent un mécanisme de rétention contrôlée avec dry-run, approbation/holds et worker Storage ; une valeur de configuration ne prouve pas la purge effective. Activer et superviser après vérification des exclusions, sans effacer aveuglément les preuves nécessaires. Les décisions minimales de publication sont distinctes du contenu d’un signalement : elles restent liées à l’existence du contenu et sont nettoyées à sa suppression, sans copie des notes privées. Ne pas promettre qu’une purge automatisée nouvelle a déjà tourné.

⛔ Région Supabase observée eu-west-3/Paris ne garantit pas à elle seule absence de transferts ni politique de sauvegarde. Marie doit confirmer DPA, sous-traitants SMTP/support/Netlify, accès support international éventuel et conditions de transfert. Contact existant `contact@nailmoods.com`. Identité/adresse professionnelles ne sont pas inventées ; un document du dépôt n’est pas un justificatif administratif.

## Suppression du compte

✅ Parcours en application Profil → Gérer mon compte → Supprimer ; confirmation `SUPPRIMER`, export avant suppression et explication abonnement Apple, accès à gestion native. L’Edge authentifie avec `getUser`, vérifie le même propriétaire, liste les objets autorisés, les supprime via Storage API par lots puis finalise DB/Auth/sessions. Si Storage échoue, finalisation n’est pas déclarée réussie. Un espace partagé détenu doit être transféré avant suppression : ce cas demande assistance si l’utilisatrice ne peut effectuer le transfert.

Profil, espaces possédés, produits, Journal/inspirations/publications et associations/favoris sont supprimés selon les cascades existantes. Les messages déjà transmis sont anonymisés sous « Compte supprimé » ; copies exportées par destinataires ne sont pas effacées à distance. Identités/événements analytics associés et nouveau mapping/ledger Apple suivent la suppression du compte. Les grants manuels ne deviennent pas des transactions. Les données invitées de l’appareil sont explicitement distinctes dans l’UI.

⛔ Nettoyage complet de vrais objets Storage + Auth + historique messages n’a pas été exécuté avec un compte jetable ici. Le test Apple Q prouve la cascade de ce nouveau ledger dans PostgreSQL isolé, pas l’ensemble du parcours. Supprimer NailMoods ne résilie pas automatiquement Apple/Google ; UI et CGU le disent. L’achat supprimé n’est pas automatiquement transféré à un nouveau compte NailMoods.

## UGC, modération, âge et DSA

Signalements/blocages et outils staff existaient réellement. ✅ Les tests SQL Recette montrent isolation des créations/messages partagés, effets du blocage et perte d’accès après retrait de connexion. Support visible dans le profil et les pages publiques ; staff dispose de retrait de contenu/restriction de compte. Des CGU interdisent contenu illégal/abusif et décrivent le traitement.

Correction préparée : une photo importée destinée à devenir publique passe privée/en attente ; seul le staff peut approuver après preview autorisé, ou rejeter. Changement de photo exige nouvelle revue. La queue n’expose pas de notes privées du Journal ; l’Edge preview télécharge seulement l’objet d’une demande vérifiée. Filtre texte limité sur messages/publications, en complément humain. Ce filtre n’est pas une classification exhaustive des images et avatars : les avatars doivent rester signalables et modérables ; qualité et délais réels de la modération sont une action opérationnelle Marie. Les créations sans photo importée restent publiables selon les règles existantes. Anciens uploads publics entrent dans la queue à la migration : prévoir l’équipe, ne pas masquer ce changement.

Déclaration 18+ à l’inscription et majorité stockée/consentie, sans collecte de document d’identité/date de naissance complète. Les anciennes tranches mineures restent restreintes côté serveur. Age Rating Apple : répondre factuellement à UGC/messaging et autres contenus réellement présents, puis appliquer la restriction 18+ selon questionnaire actuel ; ne pas cocher « aucun social » pour obtenir une note inférieure. Aucun écran Apple rempli ici.

DSA : EI qui vend des abonnements suggère trader, **décision et déclaration à Marie**, adresse/téléphone/email et justificatifs réels. Téléphone manquant reste placeholder. Les coordonnées peuvent être publiques en UE. Pas de régime européen de paiement alternatif activé, aucun entitlement de contournement.

## Sécurité et limites observées

✅ Aucun secret Apple reçu ou écrit dans l’app. Clés publiques Supabase restent publiques par conception ; RLS/Auth sont le contrôle. Scan heuristique des sources et contrôle des destinations IA/analytics réalisés, preuve fournie avec sa portée. Le motif `BEGIN PRIVATE KEY` du script de préparation sert à reconnaître un fichier `.p8`, il ne contient pas une clé privée. Une revue complète des formats secrets/historique n’est pas présentée comme garantie.

Fonctions Apple/client/preview : identité confirmée par Auth ; écritures privées via wrappers service-only, `search_path=''`, vérification propriétaire/token, bornage produit/environment et limite requêtes côté serveur. Pas d’écriture d’entitlement client. Médias privés passent Storage/RLS ; bucket dit public ne permet pas une URL publique brute, visibilité est contrôlée dans `media-read` et révoquée sans attendre la purge. URLs temporaires ne sont pas décrites comme révoquées rétroactivement ; tester expiration et invalidation sur le vrai flux.

❌ Permissions gérées pg_net : SQL constate PUBLIC SELECT/EXECUTE sur queue/fonctions ; tentative REVOKE par postgres n’a pas modifié les ACL supabase_admin. Aucun accès externe effectif ni fuite n’est affirmé sur cette seule observation. Correction indépendante exécutée : le cron nettoyage ne transporte plus de secret permanent, mais nonce une fois valable 2 minutes ; ancienne authentification Edge supprimée. Des tests SQL/HTTP l’attestent. La restriction ACL propriétaire/Supabase demeure une action avant lancement, car la queue peut exposer des données techniques et autoriser HTTP serveur si accessible à un rôle applicatif.

L’advisor Recette observé avant les derniers ajouts montrait tables privées RLS sans policy (accès client refusé intentionnellement), deux vues SECURITY DEFINER de droits servant des données du compte courant, et protection de mots de passe compromis désactivée. Les avertissements de vues exigent revue de portée, pas un changement automatique qui casserait les fonctions privées. La protection Auth doit être activée dans la console/plan approprié avant lancement. Npm audit à zéro vulnérabilité connue après overrides `tar`/`sharp`/`uuid` ; cela ne prouve pas absence de toute vulnérabilité.

## Références officielles consultées

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) : UGC 1.2, achats/abonnements 3.1.1/3.1.2, multiplateforme 3.1.3, confidentialité/suppression/IA 5.1.
- [Exigences prochaines et SDK d’upload](https://developer.apple.com/news/upcoming-requirements/), [StoreKit](https://developer.apple.com/documentation/storekit), [appAccountToken](https://developer.apple.com/documentation/storekit/product/purchaseoption/appaccounttoken(_:)).
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi), [Notifications](https://developer.apple.com/documentation/appstoreservernotifications), [bibliothèque Apple officielle](https://github.com/apple/app-store-server-library-node).
- [App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Required Reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api), [SDK tiers](https://developer.apple.com/support/third-party-SDK-requirements/).
- [Privacy FileSystem Capacitor](https://capacitorjs.com/docs/apis/filesystem), [Preferences](https://capacitorjs.com/docs/apis/preferences), [Camera](https://capacitorjs.com/docs/apis/camera).
- [DSA trader Apple](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/), [Age Rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/).
- [Accessibilité Apple](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-accessibility/), [chiffrement/export](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/), [CNIL applications mobiles](https://www.cnil.fr/fr/applications-mobiles-les-recommandations-de-la-cnil-pour-proteger-la-vie-privee).

Les décisions de signature/contrats/DSA/fiscalité et les informations absentes ne sont pas remplacées par des suppositions. Suivre les 41 étapes du guide puis consigner les nouvelles preuves avant de changer un statut de ce document.
