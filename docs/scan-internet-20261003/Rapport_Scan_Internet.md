# NailMoods — scan connecté à Internet

Date : 3 octobre 2026. Périmètre : recherche de références après lecture de l’étiquette ou du code, fiche modifiable et ajout à la Collection. Cette passe prolonge les correctifs scan/Excel V2 déjà intégrés ; elle ne présente pas ces correctifs antérieurs comme nouveaux.

Le serveur de recherche est déployé sur Recette et Production. La nouvelle interface nécessite une mise à jour de l’application. Le critère de sortie sur vrai appareil n’est pas encore satisfait : aucun téléphone connecté à cet environnement n’a permis de valider caméra → reconnaissance → fiche → Collection.

## 1. Diagnostic et causes

| Constat vérifié | Classement | Cause |
|---|---|---|
| Aucun appel Internet automatique ne résolvait une référence absente du catalogue local | Jamais implémenté avant cette passe | Le scan utilisait la reconnaissance locale et le catalogue embarqué ; l’import d’une URL exigeait un lien fourni séparément |
| Une marque reconnue ne suffit pas à choisir une teinte exacte | Limite réelle, pas panne du lecteur | Il faut un code-barres, une référence ou un nom suffisamment précis ; plusieurs gammes peuvent partager un numéro |
| KIKO Smart absent de l’Excel V2 malgré la présence de KIKO Power Pro | Déjà corrigé par la passe précédente | Le V2 n’incluait pas cette gamme ; supplément officiel Smart ajouté dans le commit 94e8ee3358ebd0285f84f063d2b5d5d79b702fdd |
| Même produit Internet/embarqué pouvant recevoir deux noms de gamme voisins | Risque reproduit par test | La déduplication par nom/gamme n’identifiait pas leurs codes GS1 équivalents |

La photo transmise par Marie ne permet pas de lire avec certitude le numéro du vernis bleu. Aucune teinte commerciale ne lui a été attribuée arbitrairement. Les preuves de cette livraison utilisent un exemple KIKO 153 lisible, distinct de ce flacon.

## 2. Corrections nouvelles

- Recherche automatique serveur après absence de correspondance locale fiable, sans attendre une saisie d’URL. Un compte connecté Free, Plus ou Pro peut l’utiliser ; aucune collection préalable n’est requise.
- Sites officiels : KIKO, Manucurist, Le Mini Macaron, CANNI et OPI. Recherche de codes-barres complémentaires via Open Beauty Facts, avec attribution ODbL. La couverture est limitée aux sources effectivement intégrées, pas à tout Internet.
- Vérification des identités : marque, gamme, référence, nom et code GS1. Green et Green Flash restent distincts. Un résultat de moteur de recherche ne devient pas une fiche sans lecture et vérification du produit source.
- Fiche sourcée proposée puis préremplie et modifiable ; choix obligatoire d’une variante si plusieurs teintes sont présentes. L’utilisatrice confirme l’ajout. Aucun produit n’est ajouté automatiquement à sa Collection ou au catalogue global.
- Couleur publiée explicitement reprise lorsqu’elle existe ; aucune couleur RGB inventée à partir d’un nom, d’une photo ou d’un résultat de recherche. Une correction manuelle/pipette reste prioritaire. Si la source ne publie pas la couleur, le choix dans la palette NailMoods reste disponible.
- États distincts : recherche, fiche trouvée, plusieurs références, informations insuffisantes, référence non trouvée, source inaccessible, marque non couverte, hors connexion et connexion au compte nécessaire. La fiche manuelle reste utilisable.
- Cache de fiches limité et isolé par compte, utilisable hors connexion. Annulation des réponses obsolètes lors d’une nouvelle lecture ou correction. Déduplication Collection par code GS1, y compris zéros initiaux et UPC équivalents.

Fichiers principaux : `src/productLookup.js`, `src/OnlineProductLookup.jsx`, `src/online-product-lookup.css`, `src/ScanGenerate.jsx`, `src/ProductImport.jsx`, `src/collection.js`, `src/scanGenerate.js`, `src/productIdentity.js`, `supabase/functions/product-lookup/index.ts`, les modules partagés `productCodes.mjs`, `lookupIdentity.mjs`, `productLookupCore.mjs`, `productPageCore.mjs` et `productPageTransport.ts`.

Tests ajoutés : `tests/product-lookup.test.js` et `scripts/test-online-scan-browser.mjs`. La politique publique et les notes App Privacy décrivent maintenant cette recherche fonctionnelle ; les versions des consentements n’ont pas été changées dans cette passe.

## 3. Déjà présent avant cette passe

L’Excel V2 audité est embarqué : 2 631 produits actifs, dont 1 173 nouvelles références, 1 047 associations de codes et 351 lignes mises en quarantaine. SHA-256 du fichier source : `5ee75d3dfba63791a99a3761486db494bf27d7a9e067d88a809f473f3d1fc9ff`. Le JSON V2 vérifié dans le candidat Android précédent était identique à celui du dépôt.

Le supplément KIKO Smart précédent contient 64 identités officielles, 64 EAN et 61 couleurs publiées. La correction de sélection catalogue/couleur, le passage Scan → Collection et le formulaire de référence manuelle appartiennent au commit 94e8ee3. Ils sont conservés. Les autres fonctionnalités bêta et les règles Free, Plus, Pro, Billing et StoreKit restent dans la base commune existante.

## 4. Serveur, sécurité et données

Nouvelle Edge Function : `product-lookup`, même contenu déployé sur les deux projets : Recette v2 ; Production v1. Empreinte Supabase du bundle : `121e6e9e584138aea850a9927d2dec708d5159575ea5497fd55cfe0c3262795b`.

JWT requis et utilisateur vérifié côté serveur ; le refus sans authentification a été vérifié en HTTP 401. Quota existant `nm_product_import_quota` réutilisé (30 appels par minute). Aucune table, migration ou seed supplémentaire nécessaire pour cette fonction.

Requête d’identité limitée à 2 048 octets ; seuls code, marque, gamme, référence et nom normalisés sont envoyés. Pas de photo ni d’OCR complet dans cette requête. Les fournisseurs ne reçoivent ni jeton ni identifiant du compte NailMoods. Aucun envoi à une IA distante.

Transport SSRF contrôlé : HTTP/HTTPS uniquement dans le module partagé, fournisseurs de cette fonction en HTTPS et hôtes autorisés ; DNS vérifié, adresses non publiques bloquées, connexion épinglée sur l’IP vérifiée, contrôle à chaque redirection, trois redirections au maximum, Content-Type contrôlé, réponse de page limitée à 2,5 Mo et délai global de 14 secondes. Les tests rejettent les URLs détournées et les redirections vers un autre hôte. La configuration de recherche KIKO est celle du moteur public de sa boutique ; aucune clé d’administration n’est embarquée dans l’app.

Cache appareil : au plus 40 fiches pendant sept jours. Cache serveur en mémoire : au plus 200 résultats, une heure pour une fiche et dix minutes pour une absence. Ce cache n’est pas un catalogue permanent. Les fonctions temporaires de vérification ont été neutralisées après les tests et les comptes techniques éphémères supprimés ; aucune donnée de connexion n’est livrée.

## 5. Appels réels et catalogue

Les preuves `evidence/live-recette.json` et `evidence/live-production.json` proviennent d’appels authentifiés à la fonction déployée, qui a interrogé les sources réelles. Aucun résultat Internet n’a été simulé dans ces preuves.

| Recherche | Production | Observation |
|---|---|---|
| KIKO Smart, référence 153 | Fiche trouvée, 6,777 s | Muget Green, EAN 8025272978705, HEX explicitement publié #9aa180 |
| Manucurist Green Mint | Fiche trouvée, 2,429 s | Référence/GTIN récupérés ; couleur exacte non inventée |
| Manucurist Green Flash Mint | Fiche trouvée, 1,875 s | Gamme distincte de Green |
| Manucurist Green Mint avec code 3662263330699 | Fiche trouvée, 2,309 s | Identité concordante avec le code demandé |
| Le Mini Macaron Rose Antique | Fiche trouvée, 1,993 s | Marque harmonisée avec le nom officiel du fabricant |
| CANNI Diamond Top Coat | Trois fiches proposées, 1,942 s | Conditionnements différents ; choix explicite demandé |
| OPI Nail Lacquer Big Apple Red | Fiche trouvée, 2,847 s | Fiche officielle réellement lue |
| Code 1234567890128 valide mais inconnu | Non trouvé, 2,031 s | Absence distinguée d’un échec réseau |
| KIKO Smart sans code/numéro/nom de teinte | Informations insuffisantes | Aucune teinte choisie arbitrairement |

Ces durées sont des mesures ponctuelles, pas une garantie de temps de réponse. Les catalogues des fournisseurs peuvent changer ou être indisponibles. OPI par seule référence courte sans nom reste limité à la résolution locale et au fournisseur de codes-barres. Open Beauty Facts est une base contributive non exhaustive ; sa correspondance positive n’a pas été validée sur un produit réel dans cette passe. La normalisation UPC-E est testée, mais aucun flacon OPI UPC-E physique n’a été testé.

Top coats mat/brillant : cette passe ajoute une résolution de fiche CANNI vérifiée, pas de nouvelles références inventées ni de nouveau seed de top coats. Les classifications déjà présentes restent dans la base commune.

## 6. Matrice de vérification

« Commun » signifie code partagé exercé avec tests unitaires ou interface navigateur. Ce n’est pas un PASS sur téléphone Android/iOS.

| Cas | Commun / serveur | Android appareil | iOS appareil | Preuve |
|---|---|---|---|---|
| Scan produit connu, KIKO Smart et référence manuelle | PASS interface commune, lecteur WASM/OCR réel | NON VÉRIFIÉ | NON VÉRIFIÉ | `scan-browser.json` : 5 parcours |
| Catalogue local absent → Internet → fiche → confirmation → Collection → rechargement | PASS interface commune | NON VÉRIFIÉ | NON VÉRIFIÉ | `online-browser.json` ; transport rejouant une vraie réponse Recette |
| KIKO, Manucurist Green/Flash, CANNI, OPI, Le Mini Macaron | PASS appels serveur réels | NON VÉRIFIÉ | NON VÉRIFIÉ | `live-recette.json`, `live-production.json` |
| UPC-E / zéros initiaux | PASS normalisation ; pas de flacon physique | NON VÉRIFIÉ | NON VÉRIFIÉ | `product-lookup.test.js`, tests scan existants |
| Code inconnu | PASS serveur réel | NON VÉRIFIÉ | NON VÉRIFIÉ | code 1234567890128 ; retour non trouvé |
| OCR étiquette | PASS navigateur, Tesseract local | NON VÉRIFIÉ | NON VÉRIFIÉ | `scan-browser.json` |
| Caméra refusée | Parcours commun antérieur ; pas de test permission natif dans cette passe | NON VÉRIFIÉ | NON VÉRIFIÉ | Recette physique requise |
| Site inaccessible / HTTP 403 / timeout | PASS états de secours en test contrôlé | NON VÉRIFIÉ | NON VÉRIFIÉ | `online-unit-tests.txt` |
| Variante obligatoire / aucune couleur exacte publiée | PASS test partagé | NON VÉRIFIÉ | NON VÉRIFIÉ | choix variant ; aucun RGB généré |
| Couleur manuelle prioritaire | PASS, deux parcours interface | NON VÉRIFIÉ | NON VÉRIFIÉ | `online-browser.json` |
| Cache hors connexion / cache expiré / compte différent | PASS tests + interface hors ligne | NON VÉRIFIÉ | NON VÉRIFIÉ | `online-browser.json`, tests unitaires |
| Doublon Internet/catalogue et persistance Collection | PASS tests + rechargement | NON VÉRIFIÉ | NON VÉRIFIÉ | `online-browser.json`, test GS1 partagé |
| Free sans Collection | PASS tests communs existants ; aucune barrière de tier dans le nouveau serveur | NON VÉRIFIÉ | NON VÉRIFIÉ | suite générale ; utilisateur serveur neuf |
| Matériel, top coats, favoris, social, abonnements, palettes/techniques | Suite générale passée ; pas de nouvelle recette physique de ces fonctionnalités | NON VÉRIFIÉ | NON VÉRIFIÉ | `tests.txt` ; aucun PASS natif ajouté |

Suite finale locale : 437 tests, 435 PASS, zéro échec, deux tests d’intégration opt-in ignorés (tiers réels A/B/C et médias A/B). Tests nouveaux Internet : 14 PASS. Interface : 5 parcours existants et 3 parcours Internet PASS, aucune erreur de page. `deno check` de la fonction et build web Production PASS. Les trois parcours Internet isolent le transport dans le navigateur ; l’authentification et les requêtes réseau réelles sont vérifiées séparément sur les deux serveurs.

## 7. Android et iOS

Branches réelles : `feat/google-play-billing-beta6` et `feat/apple-storekit-ios`. Même code métier, sans divergence de scan entre plateformes. Les compilations CI natives et leurs identifiants seront joints à la livraison finale. Aucun nouveau système de permission, changement Billing/StoreKit ou numéro de version n’est ajouté dans cette passe.

Le script Android conserve pour l’instant `versionCode: 6` et `0.3.0-beta.6`. Un éventuel AAB CI non signé avec ce numéro est un contrôle de compilation, pas une bêta 7 importable dans Play. Le dernier versionCode réellement utilisé dans Play Console n’a pas pu être revérifié dans la session accessible. La création de la bêta 7 signée attend cette donnée. L’archive iOS de recette sans signature ne peut pas être envoyée dans TestFlight.

## 8. Package

Code partagé sauvegardé dans Git ; fonction serveur déployée ; sources de la fonction, tests, journaux de preuve et rapport inclus dans le package final. Aucune clé privée, jeton, mot de passe, photo personnelle de Marie ou fonction temporaire d’administration n’est inclus. Les artefacts de compilation et leurs SHA-256 seront ajoutés lorsqu’ils seront réellement disponibles.

## 9. RESTE À FAIRE MARIE

1. Valider sur un téléphone disponible avec le candidat Recette : autorisation/refus caméra, code/étiquette lisible, fiche correcte, couleur, confirmation d’ajout puis rechargement de la Collection. Tester aussi hors connexion et une référence inconnue. Transmettre le code-barres ou le numéro lisible du flacon KIKO bleu pour la recette de ce produit précis.
2. Indiquer le plus grand **versionCode numérique** déjà utilisé dans Play Console, y compris les pistes de tests et les versions importées, pour préparer le prochain AAB signé sans réutiliser un numéro.
3. Pour TestFlight, fournir ultérieurement l’accès de signature/appareil Apple requis. Cette action n’est pas nécessaire à la préparation du prochain AAB Google.

Le lot ne doit pas être déclaré « scan corrigé sur appareil » tant que la première action n’a pas réellement passé.
