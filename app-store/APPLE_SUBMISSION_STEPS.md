# Guide Marie — de zéro jusqu’à la soumission Apple

Édition du 2 octobre 2026. Les libellés anglais sont donnés pour retrouver les écrans, même lorsque votre interface est traduite. Aucun écran Apple connecté n’a été rempli dans cette mission. Un libellé peut légèrement évoluer : utiliser le lien officiel de l’étape si l’emplacement change. Ne jamais remplacer un placeholder par une information supposée.

Avant de commencer, ouvrir `ACTIONS_MARIE_RESTANTES.md`, `APPLE_TEST_RESULTS.md` et `APPLE_COMPLIANCE_AUDIT.md`. Cette livraison ne contient pas d’IPA signée. Prévoir un Mac compatible avec Xcode stable et un iPhone. Le minimum d’upload vérifié chez Apple est Xcode 26 avec SDK iOS 26 ou plus récent ; le minimum d’installation choisi dans le projet est iOS 16, ce sont deux contraintes différentes. Utiliser de préférence le Xcode stable actuel, pas une bêta non acceptée pour la soumission.

Garder une fiche privée avec les identifiants non secrets : `<APPLE_TEAM_ID_A_FOURNIR>`, `<BUNDLE_ID_VALIDE_PAR_MARIE>`, `<APPLE_APP_ID_NUMERIQUE>`, groupe d’abonnement et références de produits. Garder clés, certificats et mots de passe dans un coffre séparé.

## 1. Créer ou retrouver le compte Apple

Ouvrir [account.apple.com](https://account.apple.com/). Se connecter au compte que Marie conservera comme propriétaire. Si aucun compte n’existe, choisir la création de compte et renseigner ses véritables identité, email et téléphone. Vérifier l’email et activer l’authentification à deux facteurs dans les réglages de sécurité. Ne pas créer un compte partagé sans responsable identifiable. Tester la réception des codes avant de poursuivre.

À fournir par Marie : email du propriétaire, téléphone de confiance et accès au second facteur, directement dans Apple. Ces données de connexion ne vont pas dans le dépôt. Si le compte est déjà inscrit au Developer Program, conserver son équipe plutôt que recommencer une inscription.

## 2. S’inscrire à Apple Developer Program

Ouvrir [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/), commencer l’inscription avec le compte propriétaire. Vérifier si une adhésion existe déjà. Le dépôt décrit Marie comme entrepreneur individuel : Apple traite normalement une personne/sole proprietor comme inscription individuelle, avec son nom légal comme vendeur. Le nom commercial NAILMOODS ne crée pas une personne morale distincte. Une inscription Organization exige une vraie entité juridique et les justificatifs/D‑U‑N‑S demandés.

Renseigner uniquement les informations légales vérifiables, accepter les conditions et payer les frais affichés par Apple (référence habituelle : 99 USD/an, montant local à vérifier à l’écran). Attendre l’activation. Developer → Account → Membership details : relever Team ID. Ne pas prendre l’Apple ID numérique de l’app pour ce Team ID.

## 3. Vérifier les informations légales

Comparer l’identité Apple aux documents officiels : Marie Chatelain, statut EI, nom commercial NAILMOODS, SIREN/SIRET, adresse et date de début figurant dans `public/legal/editor.json`. Ce fichier n’est pas une preuve officielle. La date de début déclarée dans le dépôt est le 05/10/2026 : confirmer la possibilité de démarrer la vente à la date choisie.

Préparer numéro professionnel, justificatif d’activité, identité et adresse. Ne pas remplacer le vendeur légal par un logo ou un pseudo. Confirmer le titulaire du copyright. Avant commercialisation UE, finaliser les mentions professionnelles, la médiation de consommation applicable et les documents/contrats de sous-traitance. Aucun médiateur, téléphone ou justification de transfert n’a été inventé dans la livraison.

## 4. Accepter les contrats Apple

Ouvrir [appstoreconnect.apple.com](https://appstoreconnect.apple.com/), puis Business → Agreements. Le propriétaire accepte les versions courantes du contrat Developer/Free Apps et du Paid Apps Agreement nécessaire à la vente d’abonnements, via View/Review/Agree selon l’écran. Lire les conditions avant de valider. Si le contrat Paid Apps indique des informations manquantes, traiter Banking/Tax avant de chercher un problème de code.

Ne pas activer de contrat de distribution alternative, entitlement de paiement externe ou conditions européennes alternatives pour NailMoods dans cette mission. Utiliser les achats intégrés Apple standards.

## 5. Banque et fiscalité

App Store Connect → Business → Banking/Tax, ou liens correspondants du contrat Paid Apps. Banking → Add bank account : pays, titulaire exact, banque et identifiants bancaires réels. Tax → Add/Complete : remplir les questionnaires correspondant à la résidence et au statut de Marie ; ne pas choisir une réponse fiscale générique copiée d’un tutoriel. Apple peut demander plusieurs formulaires selon les pays.

Fournir ces données uniquement dans Apple, avec conseil comptable si nécessaire. Attendre le statut permettant les ventes. Ne pas utiliser un IBAN de démonstration ni mettre un formulaire fiscal dans Git. Relever seulement « contrat actif / informations validées » pour le suivi.

## 6. DSA / trader Union européenne

Business → Agreements → Compliance → Digital Services Act → Complete Compliance Requirements. Confirmer le statut commercial réel. Pour l’EI vendant des abonnements, le statut trader est une hypothèse cohérente à vérifier, pas une déclaration déjà faite. Fournir l’adresse professionnelle ou boîte postale acceptée, téléphone et email ; valider les codes ; téléverser les justificatifs demandés. Les coordonnées trader peuvent être publiques dans l’UE.

Puis Apps → NailMoods → App Information → App Store Regulations and Permits → Digital Services Act → Edit, une fois la fiche créée. Le dossier `APPLE_DSA_EU.md` liste exactement les informations connues et absentes. Ne pas déclarer non-trader pour éviter la publication des coordonnées.

## 7. Ouvrir Certificates, Identifiers & Profiles

Developer → Account → Certificates, Identifiers & Profiles. Vérifier que l’équipe en haut de l’écran correspond au Team ID relevé. Dans Xcode → Settings → Accounts → + → Apple Account, ajouter ce compte et vérifier la même équipe. Les certificats Development/Distribution et profils peuvent être gérés par Automatic Signing ; éviter de créer des doublons avant d’avoir essayé cette gestion.

Ne pas envoyer de certificat exporté avec clé privée dans le chat. Si une autre personne compile, lui donner le rôle Apple nécessaire via Users and Access, sans transmettre le mot de passe propriétaire.

## 8. Valider et enregistrer le Bundle ID

Recherche d’abord dans Identifiers : un Bundle ID NailMoods pourrait déjà exister. Dans le dépôt, les IDs Android existants sont `com.nailmoods.app` et `com.nailmoods.app.recette`. Ils ne prouvent pas leur existence chez Apple. Recommandation : `com.nailmoods.app` pour la fiche finale, seulement après validation par Marie et vérification de disponibilité.

Si absent : Identifiers → + → App IDs → App → Continue. Description : NailMoods. Bundle ID : Explicit → `<BUNDLE_ID_VALIDE_PAR_MARIE>`. Continuer, relire, Register. Éviter un wildcard pour une application avec achats intégrés. Le Bundle ID de la fiche, de Xcode et d’APPLE_BUNDLE_ID doit être identique.

Un identifiant `.recette` et une seconde fiche Apple sont facultatifs. Pour simplifier le premier TestFlight, on peut utiliser la fiche finale mais un build relié au backend Recette, puis changer de backend dans un nouveau build avant la soumission.

## 9. Configurer In-App Purchase et la signature Xcode

Dans l’identifiant Apple, vérifier les capabilities disponibles ; In-App Purchase peut être déjà disponible par défaut. Dans Xcode : ouvrir `ios/App/App.xcodeproj` → projet App → TARGETS App → Signing & Capabilities → Automatically manage signing → Team : équipe de Marie. Bundle Identifier : valeur validée. Cliquer + Capability → In-App Purchase.

Ne pas ajouter Push Notifications, Sign in with Apple, Associated Domains ou tracking sans fonctionnalité correspondante. L’auth actuelle est email/mot de passe avec callback de schéma personnalisé, pas un fournisseur social tiers. Ne pas inventer de fichier entitlements nécessaire au paiement : laisser Xcode/configuration Apple gérer les capabilities effectives.

## 10. Créer la fiche App Store Connect

App Store Connect → Apps → + → New App. Platform : iOS. Name : NailMoods (Apple contrôle la disponibilité). Primary Language : French. Bundle ID : choisir celui réellement enregistré. SKU : `NAILMOODS-IOS-001`, proposition interne à confirmer ; ce champ ne remplace pas le Bundle ID. User Access : Full Access pour une équipe réduite, ou Limited Access aux personnes désignées. Create.

Si Apple refuse la création, vérifier contrat, rôle et disponibilité du nom. Ne pas créer une autre app au hasard pour contourner une erreur. La fiche sera en préparation de soumission.

## 11. Relever SKU et Apple ID numérique

Apps → NailMoods → App Information. Vérifier le SKU saisi, le Bundle ID et relever Apple ID numérique. Envoyer seulement ces identifiants non secrets pour le suivi technique. L’Apple ID numérique sera `APPLE_APP_ID` côté serveur. Il est différent du SKU, Team ID et de l’Issuer ID des clés.

## 12. Relier le binaire au bon bundle/backend

Sur le Mac, récupérer la branche `feat/apple-storekit-ios`. Terminal dans le dossier : `npm ci`, puis `npm test`. Pour premier TestFlight Recette :

```sh
NAILMOODS_IOS_BUNDLE_ID=<BUNDLE_ID_VALIDE_PAR_MARIE> npm run ios:recette
```

Vérifier `dist-mobile/mobile-build.json` : environment recette, appId validé. Ouvrir Xcode, schéma App, target iPhone, minimum iOS 16, orientation portrait. Pour le build final : même commande avec `ios:production`, puis vérifier environment production. Ne pas changer des variables publiques pour y inclure une clé Apple.

Les callbacks Supabase Auth doivent autoriser `com.nailmoods.app.recette://auth/callback?auth=callback` en Recette et `com.nailmoods.app://auth/callback?auth=callback` en Production (vérifier le chemin exact généré par authLinks.js). Supabase → Authentication → URL Configuration → Redirect URLs → Add URL. Autoriser également le même chemin avec `?auth=recovery`. Ces schémas restent stables indépendamment d’un éventuel Bundle Apple différent. Tester confirmation email et récupération sur iPhone ; le schéma spécifique n’exige pas de domaine universel inventé.

## 13. Créer le groupe d’abonnement

Apps → NailMoods → Monetization → Subscriptions → + (groupe). Reference Name : NailMoods. Create. Ajouter la localisation French : Subscription Group Display Name `NailMoods`, App Name selon option proposée. Relever l’identifiant du groupe. Plus et Pro doivent être dans ce même groupe ; ne pas créer un groupe par tier.

## 14. Créer Plus

Dans le groupe NailMoods → + abonnement. Reference Name : NailMoods Plus. Product ID : `nailmoods_plus`, exactement. Create. Le Product ID est stable et ne se renomme pas après création. N’activer ni partage familial ni promotion/achat hors application pour cette première version.

## 15. Créer Pro

Même groupe → + abonnement. Reference Name : NailMoods Pro. Product ID : `nailmoods_pro`, exactement. Create. Dans les niveaux du groupe (Edit Level/ordre proposé), placer Pro au niveau 1 et Plus au niveau 2 : le niveau 1 est supérieur. Vérifier visuellement l’ordre et sauvegarder. Aucun produit Free n’est créé.

## 16. Choisir les durées

Fiche de chaque abonnement → Subscription Duration. Proposition initiale : 1 Month pour les deux. Marie doit valider avant sauvegarde ; le code accepte la période StoreKit effectivement configurée. Les durées Apple proposées incluent semaine, mois et année selon les options affichées. Un produit correspond à une durée ; ne pas créer un annuel avec le même ID qu’un mensuel.

Pas d’essai gratuit/offre introductive préparés : laisser désactivés. Si Marie décide une autre durée, contrôler le texte/prix localisé dans le paywall et la revue. Les modalités de changement sont gérées par le même groupe Apple.

## 17. Choisir les prix et territoires

Chaque abonnement → Subscription Prices → Add Subscription Price/Set Price. Choisir le pays/région de référence, le palier et les disponibilités. Prix Plus : `<PRIX_PLUS_A_DECIDER>` ; Pro : `<PRIX_PRO_A_DECIDER>`. Aucun chiffre n’est inventé. Examiner les prix localisés, taxes et éventuelles dates d’effet proposées ; confirmer.

Monetization → Pricing and Availability pour l’app elle-même : Free. Sélectionner uniquement les territoires que Marie entend desservir, par exemple France/UE après DSA. Ne pas confondre disponibilité de l’app avec celle des abonnements. Tester une région France et au moins une autre locale prise en charge.

## 18. Localisations des abonnements

Fiche Plus/Pro → App Store Localizations → + → French. Plus Display Name : `NailMoods Plus`. Description proposée : `Fonctions créatives et sociales Plus.` Pro Display Name : `NailMoods Pro`. Description : `Plus et outils professionnels NailMoods.` Relire les limites de caractères affichées, Save.

Dans le groupe, contrôler le nom public NailMoods. Ces noms/localisations ne remplacent pas la description fonctionnelle de l’écran Mon offre. Les traductions supplémentaires ne sont pas promises tant que l’app ne les contient pas.

## 19. Captures de review des abonnements

Chaque abonnement → Review Information → Screenshot → Choose File. Fournir une capture réelle du panneau Mon offre montrant le produit, les fonctionnalités, prix localisé, durée, renouvellement, restauration/gestion et liens légaux. Cette capture aide App Review et ne remplace pas les screenshots publics de l’app. Utiliser le format exact accepté par le champ Apple, avec compte fictif.

Review Notes : `Subscription available in Profile → My plan. Product nailmoods_plus/pro; server-verified entitlement; Pro is level 1, Plus level 2 in the same group.` Adapter le produit concerné. Vérifier l’état de chaque produit : plus de Missing Metadata avant soumission.

## 20. Clé Apple et notifications serveur V2

Users and Access → Integrations → In-App Purchase → +/Generate Key. Name : `NailMoods server verification`. Générer avec le rôle autorisé, télécharger `.p8` une seule fois dans un coffre, relever Key ID et Issuer ID. Installer les secrets directement dans Supabase selon `APPLE_SECRETS_REQUIRED.md` ; ne pas les coller dans le chat.

Apps → NailMoods → App Information → App Store Server Notifications → Production Server URL → Edit. Valeur : `https://rvqmtnqvzzxzwfxfyjcg.supabase.co/functions/v1/apple-notifications`, seulement après déploiement et secrets du projet Production. Version : Version 2.

Sandbox Server URL : `https://pueqkbwfwxgqzmkauxoz.supabase.co/functions/v1/apple-notifications` pendant les tests Recette, Version 2. Avant le TestFlight/App Review du build Production, faire pointer Sandbox vers le projet Production, avec Sandbox autorisé uniquement aux comptes de test. Apple n’a qu’une URL Sandbox par fiche : ne pas laisser les notifications renouveler les comptes d’un autre backend.

Envoyer une notification TEST via App Store Server API après installation des clés, vérifier le retour serveur et la réponse Apple. Ne pas considérer le POST forgé rejeté comme un TEST Apple valide. Désactiver Streamlined Purchasing dans Subscriptions → Streamlined Purchasing → Turn Off selon l’écran, et laisser Family Sharing désactivé : les achats doivent partir d’un compte connecté avec appAccountToken. Une désactivation peut prendre du temps à se propager.

## 21. Configurer Sandbox et la grâce

Users and Access → Sandbox → Testers → +. Créer des comptes de test Apple selon les champs demandés : nom, email, mot de passe, pays/région. Le compte Apple Sandbox et le compte NailMoods sont deux comptes différents. Sur iPhone, suivre les réglages Sandbox/Developer proposés par la version iOS et TestFlight ; ne pas déconnecter à l’aveugle le compte iCloud principal.

Si une grâce est souhaitée : Apps → NailMoods → Subscriptions → Billing Grace Period → Set Up. Choisir la durée/catégorie d’abonnés proposée et Sandbox Only d’abord ; valider en test avant Production. Sans activation, ne pas promettre de grâce. Le serveur utilise la date de grâce signée réellement retournée par Apple.

## 22. Préparer les comptes NailMoods de test

Créer les comptes décrits dans `APPLE_REVIEW_NOTES.md` sur le backend choisi. Confirmer l’email, déclarer 18+ et accepter les versions actuelles. Free review doit rester Free et sans invitation Plus/Pro, sinon il ne teste pas l’achat. Après ouverture du panneau natif et création du mapping serveur, autoriser son UUID Sandbox via SQL administrateur. Ne pas autoriser tous les comptes.

Créer des contenus fictifs : un produit, une inspiration, une pose, un profil social et une connexion avec un second compte. Les photos publiques doivent être approuvées par le staff avant le test. Préparer un compte jetable pour suppression ; ne pas supprimer le login principal transmis à Apple.

## 23. App Privacy

Apps → NailMoods → App Privacy → Get Started/Edit. Répondre que des données sont collectées, puis suivre ligne par ligne `APPLE_PRIVACY_ANSWERS.md` : catégories, finalités, lien à l’identité et absence de tracking. Ne pas déclarer « No data collected » parce que l’OCR est local. Les comptes, sauvegardes et messages sont bien stockés.

Confirmer les services SMTP/logs réellement activés et le rapport Privacy de l’archive avant de sauvegarder et publier les réponses. Conserver une capture des réponses sans données privées dans le dossier de suivi. Toute nouvelle dépendance peut nécessiter leur mise à jour.

## 24. Privacy Policy URL et pages publiques

App Privacy → Privacy Policy → Edit → Privacy Policy URL : `https://nailmoods.com/legal/confidentialite.html`. User Privacy Choices URL : facultatif ; ne pas inventer une route. Save.

Avant ceci, dans Netlify propriétaire du domaine, retirer la protection d’accès de l’environnement qui sert les pages publiques ou publier ces routes dans un environnement public du domaine. La vérification du 02/10 affiche « This site is private ». Déployer les nouveaux textes depuis la branche appropriée, puis ouvrir confidentialité/conditions/support dans une fenêtre privée sans compte Netlify ou NailMoods. Vérifier titre, contenu, liens et contact. L’URL de dépôt seule ne prouve pas sa publication.

## 25. CGU / EULA

Dans le paywall, les CGU et la politique sont fournies hors connexion dans l’app. Description Store : conserver les URL légales de `APPLE_METADATA.md`. Apps → App Information → License Agreement : vérifier si l’EULA standard Apple est utilisée ou si Marie adopte une licence personnalisée. Ne coller les CGU dans une Custom EULA qu’après vérification des clauses minimales Apple et validation juridique.

Les textes préparés conservent l’historique et portent versions confidentialité 0.8-beta / CGU 0.6-beta. Ce suffixe interne ne doit pas devenir une promesse de produit « bêta » sur l’App Store. Avant la commercialisation, finaliser les clauses consommateur/médiation applicables, les informations professionnelles et retirer les mentions de bêta fermée devenues inexactes via une nouvelle version explicite, synchronisée frontend/backend. Ne pas falsifier les consentements historiques.

## 26. Age Rating

Apps → App Information → Age Ratings → Set Up/Edit. Répondre honnêtement : User-Generated Content Yes ; Messaging and Chat Yes ; Advertising No dans cette version ; Parental Controls No (pas de parcours parental) ; Age Assurance selon le critère Apple exact, simple déclaration 18+ seulement, pas de vérification d’identité. In-App Controls/age gate : décrire le contrôle réel, ne pas prétendre une assurance forte.

Les thèmes sexuels, violents, substances, jeux d’argent, concours et médical ne sont pas des fonctionnalités NailMoods prévues ; fréquence None pour les contenus proposés/validés correspondants, après contrôle du contenu de démonstration et de la modération. Liens externes : import peut ouvrir une URL marchande fournie par l’utilisatrice ; déterminer factuellement si le critère « Unrestricted Web Access » de l’écran Apple s’applique, ne pas répondre automatiquement No sans tester les URL acceptées. Si navigation arbitraire possible, répondre Yes.

Apple calcule la note selon les réponses et régions. Utiliser l’override supérieur 18+ proposé si la note calculée est inférieure, pour aligner le public contractuel. Ne jamais diminuer la classification en cachant messagerie/UGC. Vérifier les catégories régionales (pas seulement le badge iOS français).

## 27. Chiffrement / export compliance

TestFlight/build ou version App Store → Export Compliance → Manage/Provide information. NailMoods utilise HTTPS, sécurité Auth et système Apple ; aucun algorithme cryptographique propriétaire destiné à l’utilisatrice n’a été identifié. Cela ne suffit pas à répondre « No encryption ». Suivre le questionnaire Apple sur chiffrement standard, exemptions et marchés, avec les réponses validées pour le binaire effectif.

Le projet ne force pas `ITSAppUsesNonExemptEncryption=false` sans décision documentée. Si seule la cryptographie exemptée est utilisée et que la réponse est validée, configurer ce booléen et conserver la justification. Fournir le document/code d’autorisation demandé si Apple le requiert. Les exigences pour la France peuvent demander une analyse distincte : ne pas inventer de certificat ou numéro.

## 28. Screenshots, icône et appareil

Utiliser le binaire réel, données fictives, iPhone petit écran et grand écran. Capturer les écrans listés dans `APPLE_METADATA.md`. Apps → version iOS → App Previews and Screenshots → format iPhone proposé → choisir les fichiers. Le grand format 6,9 pouces est à privilégier ; contrôler dimensions/absence d’alpha et limites affichées. Les captures doivent représenter des fonctions existantes, pas des maquettes.

L’icône 1024 est dérivée du symbole officiel et aplatie sur le fond NailMoods, sans transparence. Ne pas redessiner le logo ni ajouter une icône Android. Vérifier LaunchScreen, encoche/Dynamic Island, clavier, zoom texte, liens et mode sombre système sur le binaire. La version est iPhone portrait ; aucun support iPad/macOS/visionOS certifié. Désactiver la disponibilité sur Mac Apple Silicon/Apple Vision Pro si non testée, dans les sections de disponibilité correspondantes.

## 29. Remplir la fiche Store

Apps → NailMoods → App Information : nom, sous-titre, catégorie, langue selon `APPLE_METADATA.md`. Version iOS → Description, Keywords, Promotional Text (facultatif), Support URL, Copyright. Coller la description préparée après relecture et tests. Aucun prix numérique ne doit être inséré à la place du prix StoreKit.

Tax Category : choisir le service logiciel réellement vendu, avec validation comptable. Content Rights : confirmer les droits sur le symbole, catalogue, photos et contenus de démonstration ; ne pas revendiquer des droits absents sur les imports utilisateurs. App Accessibility : ne cocher aucune capacité globale sans satisfaire les critères Apple sur toutes les tâches courantes. Les labels/focus améliorés seuls ne certifient pas VoiceOver ou Larger Text.

## 30. Review Information

Version iOS → App Review Information. Sign-in required Yes. Username/Password : compte Free stable, directement dans Apple. Contact : Marie, nom légal confirmé, email contact@nailmoods.com et téléphone réel. Notes : contenu complété d’`APPLE_REVIEW_NOTES.md`. Pièces jointes facultatives : vidéo montrant les chemins si utile, sans secret ni personne réelle.

Expliquer la file de photos et préparer des publications approuvées. Ne pas obliger le reviewer à contacter Marie pour chaque fonction. Conserver le staff joignable pour les nouvelles demandes et les questions Apple.

## 31. Vérifier le compte de démonstration

Sur un iPhone après installation fraîche, se connecter avec les mêmes identifiants que Review Information. Tester paywall Free, comptes démonstration Plus/Pro, génération locale, import, Journal, Découvrir, messages, signalement et blocage. Tester le compte jetable de suppression. Vérifier que ces comptes existent en Production pour le build Production, pas seulement en Recette.

Saisir les logins supplémentaires directement dans les notes Apple ; retirer les placeholders. Changer les mots de passe du coffre selon le cycle interne mais garder l’accès pendant toute la review. Un compte manuel Pro ne remplace pas le compte Free nécessaire à tester la souscription.

## 32. Compiler, archiver et uploader

Sur Mac : Xcode stable compatible, `npm ci`, build mobile de l’environnement voulu, ouvrir le projet, attendre SPM. Sélectionner App → destination Any iOS Device/Generic iOS Device, pas un simulateur. TARGETS App → General : Version 0.3.0 ou version choisie, Build entier supérieur au dernier upload (1 pour le tout premier seulement). Signing & Capabilities : Team et Bundle exacts, signing automatique, capability IAP.

D’abord Product → Build et exécuter sur iPhone. Corriger toute erreur, puis Product → Archive. Xcode → Window → Organizer → Archives → archive choisie → Validate App. Générer/contrôler le rapport Privacy et les manifests/signatures SDK. Ensuite Distribute App → App Store Connect → Upload → options de distribution/signature standard proposées → Upload. Attendre la confirmation puis le traitement dans App Store Connect.

Aucune archive/IPA n’est produite par `npm run ios:production` : ce script génère les sources/assets web. Si Xcode échoue, transmettre le texte de l’erreur, version Xcode/SDK, environnement, Bundle et Build, sans clés privées. Ne pas soumettre un ancien build faute d’avoir résolu l’erreur.

## 33. Sélectionner le build

Apps → NailMoods → version iOS → Build → +/Select a build. Choisir le numéro qui a été testé, après traitement et réponse aux questions chiffrement. Vérifier version, date et environnement réel. Un build Recette ne doit jamais être utilisé pour publication publique.

Si absent : vérifier le mail de traitement Apple, le statut upload, la version/build et le Bundle ID ; ne pas re-uploader le même numéro. Corriger puis incrémenter le Build.

## 34. Rattacher les abonnements à la première version

Sur la version iOS → In-App Purchases and Subscriptions → + → sélectionner `nailmoods_plus` et `nailmoods_pro`. Vérifier localisations, tarifs, captures et groupe/niveaux ; enregistrer. Les premières souscriptions doivent être soumises avec une version app adaptée selon le workflow Apple. Ne pas croire qu’un produit créé est déjà approuvé.

Si l’écran ne propose pas un produit, vérifier Missing Metadata, contrats et statut de review. Avant lancement, contrôler que les deux produits sont disponibles dans la région de test et visibles depuis le binaire final.

## 35. TestFlight interne puis externe

Suivre `APPLE_TESTFLIGHT.md`. Créer les groupes internes/externes, ajouter builds et personnes autorisées. Internal Testing concerne les membres App Store Connect disposant du rôle approprié ; External Testing permet les testeuses externes et peut exiger Beta App Review. Compléter Test Information, What to Test, login et export compliance.

Installer via TestFlight et utiliser Sandbox. Pour le build Production TestFlight, déplacer l’URL Sandbox vers le backend Production et limiter les comptes Sandbox ; vérifier qu’aucune testeuse ordinaire n’a de droits Sandbox involontaires. Maintenir les achats réels séparés.

## 36. Tester un achat réel Sandbox

Compte NailMoods Free confirmé, Sandbox autorisé, aucun droit manuel. Profil → Mon offre : prix Apple et durée visibles, CGU/confidentialité accessibles, Acheter Plus. Confirmer dans la fenêtre Apple Sandbox ; enregistrer l’heure, produit, transaction ID et résultat serveur. Le profil ne doit devenir Plus qu’après succès de la vérification serveur.

Répéter Pro, annuler la fenêtre d’achat, simuler en attente si possible, couper le réseau après achat et reprendre. Surveiller que Transaction.unfinished redélivre et que finish n’a lieu qu’après persistance. N’utiliser aucune carte réelle pour tester un build Sandbox. Si produits absents, vérifier contrat, Bundle, Product ID, région, localisations et propagation Apple.

## 37. Tester restauration et gestion

Avec le même compte NailMoods et le même compte Apple d’achat : fermer/revenir, désinstaller/réinstaller, puis Restaurer mes achats. Tester aussi un autre iPhone. Vérifier l’accès serveur et l’absence de doublon de transaction. Gérer mon abonnement doit ouvrir le mécanisme Apple.

Se connecter à un autre compte NailMoods et tenter restaurer : aucun transfert automatique ni fuite de droit ne doit se produire ; message de compte incorrect attendu. Tester une suppression uniquement avec le compte dédié après avoir compris que l’abonnement continue côté Apple. Tester upgrade Plus→Pro et downgrade Pro→Plus en contrôlant la date effective retournée par Apple.

## 38. Valider le backend et les parcours critiques

Avant toute soumission, compléter chaque ligne A–S de `APPLE_TEST_RESULTS.md` avec le binaire, environnement, résultat, preuve et éventuel correctif. Vérifier expiration hors session, notification V2 valide, remboursement, grâce, rejet JWS falsifié, ownership, cron et refus de doublon multiplateforme. Contrôler droits manuels Plus/Pro avec abonnement expiré.

Sur les données fictives, effectuer publication→approbation staff→Découvrir, signalement, blocage bilatéral, retour privé, suppression contenu, suppression compte et nettoyage Auth/Storage. Les tests SQL locaux ne prouvent pas le nettoyage de vrais blobs. Exécuter les deux suites d’intégration opt-in dans un environnement dédié et conserver des preuves expurgées. Refaire l’audit dépendances et le rapport Privacy de l’archive finale.

## 39. Soumettre à App Review

Seulement après résolution des éléments BLOQUANT/AVANT APP REVIEW. Version iOS : relire toutes les sections et le build, droits de contenu, abonnements, DSA, privacy, âge, chiffrement et compte de review. Release option : Manually release this version pour garder le contrôle du lancement, proposition recommandée. Save → Add for Review.

App Review → ouvrir la soumission préparée → vérifier les éléments app et abonnements → Submit to App Review. Si un bouton de confirmation différent apparaît, relire le récapitulatif puis confirmer. Add for Review seul ne prouve pas l’envoi ; attendre le statut d’attente de review. Conserver l’heure et le numéro de build.

## 40. Répondre à un rejet

App Store Connect → App Review → soumission → messages/issues. Lire le numéro de guideline, reproduire le cas sur le build soumis. Répondre factuellement avec le parcours, compte valide et preuve ; ne pas déclarer corrigé sans vérifier. Un problème de métadonnées peut se corriger dans la fiche ; un problème de code exige commit, nouveau build, nouveaux tests et sélection du nouveau build.

Pour 3.1.1 : montrer le paywall IAP sans achat externe. Pour 5.1 : données réelles, consentements, suppression et pages publiques. Pour 1.2 : signalement, blocage, file staff et filtrage opérationnels. Demander une précision ou un rendez-vous App Review si nécessaire ; appel seulement si une règle a été mal appliquée et avec faits. Resoumettre les éléments corrigés via le workflow Apple.

## 41. Publier après autorisation Apple

Une app approuvée en release manuelle peut rester Pending Developer Release. Vérifier que contrats/DSA, backend Production et produits approuvés sont opérationnels, que le support est surveillé et que les textes ne décrivent plus une bêta fermée. Apps → version approuvée → Release This Version/Release App → confirmer le lancement.

Après propagation : vérifier la fiche depuis un appareil/région UE sans compte staff, téléchargement, connexion Free, prix Apple, droits manuels et page support. Surveiller erreurs Edge, notifications et cron sans loguer les reçus complets. Le premier achat réel Production doit être traité comme une vraie vente, avec accord de la personne concernée. Maintenir une procédure de remboursement/support et planifier les futures mises à jour ; une approbation Apple n’est pas une certification juridique générale.

## Informations à redonner après cette procédure

Team ID, Bundle ID enregistré, Apple ID numérique, groupe/niveaux, durées/prix, URL Sandbox choisie, confirmation d’installation des secrets sans valeurs, version Xcode, numéro de build, lien/statut TestFlight, erreurs expurgées, coordonnées publiques validées et résultats A–S. Ne jamais envoyer `.p8`, certificat privé, service role ou mots de passe durables.

## Sources officielles consultées le 02/10/2026

- [Exigences d’upload](https://developer.apple.com/news/upcoming-requirements/)
- [Inscription](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Créer une app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)
- [Contrats](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements)
- [Banque](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)
- [Fiscalité](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- [Abonnements et niveaux](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)
- [Clés IAP](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/generate-keys-for-in-app-purchases)
- [URL notifications](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/enter-server-urls-for-app-store-server-notifications)
- [Achats simplifiés](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-streamlined-purchasing)
- [Grâce](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions/)
- [Sandbox](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-a-sandbox-apple-account/)
- [Age](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [Upload](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [Soumission](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
- [Accessibilité](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/manage-accessibility-nutrition-labels)
- [DSA](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
