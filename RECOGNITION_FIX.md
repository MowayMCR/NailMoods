# Correction reconnaissance — 18 septembre 2026

## Périmètre livré

Reconnaissance uniquement, commune à l’ajout de produits et à Scan & Génère. Catalogue global inchangé : 1 801 références dont 50 KIKO Milano. Aucun EAN ajouté ou supposé ; les données actuelles ne renseignent aucun EAN/code-barres.

### Modèle facultatif

Le moteur accepte `ean13`, `gtin`, `barcodeAliases` (tableau), `shadeCode`, `shadeCodeAliases` (tableau) et `skuAliases` (tableau). Les références existantes restent utilisables sans migration. Les GTIN numériques sont comparés après validation de la clé et normalisation des zéros de tête ; la valeur brute n’est jamais remplacée par cette clé interne.

Priorité : code EAN/GTIN exact, SKU/référence exacte et alias, numéro de teinte, marque/gamme, nom, recherche tolérante. La couleur n’entre pas dans la recherche d’identité. Les scores restent heuristiques, champs indépendants et couleur non évaluée. OCR et ambiguïtés sont plafonnés ; une contradiction avec la marque/gamme empêche une confiance forte.

### Lecture et preuves

- `rawBarcode`, `barcodeFormat`, `barcodeSource`, `barcodeConfidence` sont conservés sur la fiche temporaire/personnelle, même si aucune référence n’est trouvée. ZXing ne fournit pas de confiance calibrée : valeur `null`.
- Décodage photo avec essai dans deux orientations ; EAN-13/EAN-8/UPC/ITF/Code128/Code39. L’API historique renvoyant une chaîne reste compatible.
- Distinction entre code non lu, code décodé inconnu, chiffres saisis ou relevés par OCR, référence proposée par teinte/texte, catalogue indisponible et couleur exploitable.
- OCR et décodage indépendants : un échec de l’OCR ne supprime pas le code. Le code est attaché dès sa lecture, avant la fin de l’OCR.
- Parsing KIKO/KIKO Milano/KIK0, numéros courts, zéros de tête, gammes visibles et références. Les volumes, PAO et lignes de lot ne sont pas interprétés comme des teintes.
- Seconde photo dessous/dos facultative : fusion des indices avec la première vue, conservation de la première photo couleur et de sa teinte. Une correspondance suffisante n’impose pas une seconde vue.
- Recherche locale d’abord. Le complément Le Mini Macaron reste disponible explicitement dans le volet code-barres de l’ajout produit ; un catalogue tiers indisponible ne masque plus le résultat local.

### Diagnostic

Encart repliable « Diagnostic de reconnaissance », avec copie à la demande : marque/gamme détectées, texte OCR brut des vues, texte utilisé pour le matching, codes bruts et source/format, candidats, scores par champ, raison de l’échec. Stockage local avec la fiche personnelle, aucune remontée automatique ni modification du catalogue. Pas de photo incluse dans le diagnostic copié.

## Tests

159 tests automatiques réussis et compilation Vite réussie, dont 10 tests nouveaux couvrant les 7 scénarios demandés, les aliases, les ambiguïtés entre gammes, le bruit d’étiquette, les volumes/lots, la fusion de deux vues et la conservation du code inconnu. Les EAN des fixtures de test sont synthétiques et ne sont jamais attribués à KIKO ni importés dans le catalogue.

## Recette indispensable sur les deux flacons réels

Les photos avant/dos et le diagnostic d’un premier flacon sont désormais fournis (voir correctif ci-dessous). Un nouveau scan physique après correction reste nécessaire ; les tests de parsing ne le remplacent pas.

Pour chacun : face avant → lecture code → dessous/dos si nécessaire → vérifier la proposition et la couleur → confirmer/corriger → générer. En cas d’échec, copier le diagnostic depuis l’encart repliable.

| Contrôle | KIKO 1 | KIKO 2 |
|---|---|---|
| Code-barres effectivement décodé | À tester | À tester |
| Numéro de teinte correctement lu | À tester | À tester |
| Bonne référence proposée | À tester | À tester |
| Couleur correctement confirmée/corrigée | À tester | À tester |
| Poursuite sans référence compréhensible | À tester | À tester |
| Inspiration obtenue | À tester | À tester |

Un code décodé peut légitimement rester absent du catalogue tant que ses EAN vérifiés ne sont pas renseignés. La recherche par numéro de teinte permet de continuer à identifier les références présentes, sans association de code inventée.

## Vérification sur le lien public

- Ajout produit, code saisi `3760297541507` (code Le Mini Macaron déjà utilisé dans la recette précédente, pas attribué à KIKO) : absence du catalogue local clairement affichée, code conservé, quatre solutions visibles. Copie du diagnostic réussie.
- Enregistrement d’une fiche personnelle de test avec ce code et couleur choisie, puis rechargement : code, diagnostic et couleur conservés. Aucune association catalogue inventée.
- Scan & Génère, saisie `KIKO 239` sans EAN : proposition explicite KIKO Milano / Power Pro Nail Lacquer / Minty Frost. Confirmation puis trois inspirations obtenues avec le HEX choisi `#356a59` ; ce HEX de test ne prétend pas être la teinte officielle de Minty Frost.
- Saisie `KIKO 9999` : aucune fausse proposition, bouton « Utiliser cette couleur », trois inspirations obtenues malgré l’absence de référence.
- Aucun débordement horizontal constaté dans la colonne de l’application. Ces essais utilisent la saisie et le moteur de recherche ; ils ne valident pas la capture physique, l’OCR réel des deux flacons ou le décodeur sur leurs étiquettes.

## Correctif du diagnostic réel — 18 septembre 2026

- EAN effectivement décodé : `8059385036113`, absent du catalogue. Face avant : KIKO Smart Fast Dry Nail Lacquer. Au dos, `024` est visible près du code ; `366` est aussi visible, sans attribution automatique de rôle.
- Cause du faux positif : le fragment OCR `- 1` devenait la référence `01` après normalisation, proposant à tort Power Pro Transparent.
- Les fragments numériques ponctués et chiffres OCR isolés sans contexte suffisant sont écartés et consignés dans `ignoredNumbers`. Les numéros explicitement étiquetés et la saisie manuelle restent disponibles.
- La gamme Smart visible est reconnue même si elle est absente du catalogue, pour empêcher un rapprochement Power Pro. Les 50 entrées KIKO actuelles appartiennent toutes à Power Pro ; aucun EAN ni produit catalogue n’a été inventé ou modifié.
- Trois tests supplémentaires couvrent le diagnostic exact, les chiffres isolés et le conflit Smart/Power Pro. Résultat : 162 tests réussis, compilation réussie.
- Le code brut et le recours à la couleur restent conservés. L’OCR des photos et le scan physique doivent être retestés sur téléphone ; aucune identification commerciale exacte du flacon n’est revendiquée par ce correctif.
