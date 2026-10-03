# NailMoods — correctif scan et vérification Excel V2, 3 octobre 2026

## Résultat et périmètre

Le correctif de code est testé dans l’interface commune et intégré au commit `94e8ee3358ebd0285f84f063d2b5d5d79b702fdd`, identique sur `feat/google-play-billing-beta6` et `feat/apple-storekit-ios`. La reconnaissance complète du flacon réel envoyé par Marie n’est pas encore validée. Son numéro de teinte et son code ne sont pas lisibles sur la capture reçue. Aucun PASS de caméra Android/iOS ou de scan physique n’est revendiqué.

## 1. Bugs et causes reproduits

- **KIKO Smart absent** : le catalogue V2 embarqué compte 50 KIKO, tous dans Power Pro. Smart Fast Dry lu sur la photo ne peut donc correspondre à aucune fiche V2. Reconnaître la marque n’identifie pas la teinte.
- **Couleur catalogue non appliquée dans Scan & Génère** : `chooseCandidate` reprenait `catalogColor` sans choisir cette couleur ni activer sa validation. La couleur dominante de toute la photo restait celle affichée et confirmée, y compris le beige du fond.
- **Ajout Collection non raccordé** : les capacités et le callback prévus par ScanGenerate n’étaient jamais transmis depuis main.jsx. L’action d’ajout ne pouvait pas apparaître.
- **Recherche peu accessible** : la référence était recherchée dans une correction repliée ; marque/gamme lues n’étaient pas utilisées comme contexte pour un numéro seul.

Preuve source avant modification : `evidence/baseline-audit.json`, parent `c3ef1a2`. Preuve du retour physique : capture reçue montrant KIKO bleu et estimation beige #b5a088, sans identité de teinte démontrée. La capture personnelle n’est pas publiée dans le dépôt.

## 2. Corrections et fichiers

- `src/catalog.js` : contrat unique `catalogSelectionPatch` pour Collection et Scan & Génère. HEX catalogue sourcé prioritaire sur une estimation ; couleur manuelle/pipette conservée. Chargement du complément KIKO.
- `src/ScanGenerate.jsx` : proposition préremplie d’une identité unique suffisamment étayée, contexte marque/gamme, recherche visible, champs gamme et référence, ajout Collection raccordé et confirmation obligatoire. Une couleur dominante du fond n’est plus sélectionnée automatiquement. Les échantillons et la pipette restent disponibles.
- `src/productIdentity.js`, `src/recognitionReport.js` : alias de gamme, traitement numéro + gamme sur une même ligne, distinction identité insuffisante / code absent du catalogue. Marque et gamme restent conservées dans le brouillon.
- `src/scanGenerate.js`, `src/collection.js`, `src/main.jsx` : persistance des métadonnées, couleur confirmée et déduplication par identité, sans confusion Power Pro/Smart pour un même numéro.
- `src/ProductImport.jsx` : réutilisation du même contrat de couleur pour l’import Collection.
- `public/catalog-kiko-smart.json`, `scripts/import-kiko-smart.mjs` : 64 identités officielles Smart, 64 EAN et 61 HEX explicitement publiés. Aucune teinte/HEX déduite d’une photo, aucune référence devinée.
- `tests/scan-resolution.test.js`, `scripts/test-scan-browser.mjs` : cas réel de données KIKO, étiquettes/codes synthétiques lus par les véritables moteurs locaux, confirmation, Collection, rechargement et priorité couleur manuelle.

## 3. Déjà présent avant cette passe

L’Excel V2 était déjà importé et embarqué dans l’AAB bêta 6. Le lecteur WASM EAN/UPC-E, la lecture OCR locale, l’import URL côté serveur, la palette NailMoods, le matériel, les moods/techniques et les correctifs sociaux du lot précédent ne sont pas présentés ici comme de nouvelles livraisons.

## 4. Base de données et fonctions serveur

Aucune migration, seed Supabase ou nouvelle Edge Function dans cette passe. La fonction `product-page` existante lit une URL fournie. Elle ne recherche pas automatiquement une référence sur Internet à partir du scan.

## 5. Catalogue et Excel V2

Comparaison effective du fichier source reçu et de `base/assets/public/catalog-v2.json` dans l’AAB signé bêta 6 :

- source audité : `NailMoods_V2_Fusion_V1_V2_auditee_2026-10-01.xlsx` ; SHA256 `5ee75d3dfba63791a99a3761486db494bf27d7a9e067d88a809f473f3d1fc9ff` ; identique au `sourceSha256` embarqué ;
- JSON embarqué identique octet pour octet au JSON du dépôt ; SHA256 `2b1f785adee0b8a2fefe47a473dd93473696d2f843eb4582533aa1a55e8c9740` ;
- 2 631 références actives, dont 1 173 actives nouvelles au-delà du V1 et 1 458 issues du V1 ;
- 1 047 associations scan vérifiées ; 351 lignes à clarifier et deux alias non importés comme nouvelles identités ;
- le complément ajouté donne 2 695 références actives, avec 64 associations scan supplémentaires. Le V2 et son mapping historique restent intacts ;
- KIKO Smart 30 Cobalt vérifié : EAN 8025272911573, couleur officielle #002c76, URL https://www.kikocosmetics.com/fr-fr/p/smart-nail-lacquer-30-7426/ ; ce cas de test ne permet pas d’affirmer que le flacon de Marie est la teinte 30.

Trois teintes Smart n’ont pas de HEX explicite dans les pages récupérées : aucune couleur exacte inventée. L’importateur conserve les empreintes des pages et les champs `selected.hex_color` dans `evidence/kiko-official-sources.json`.

## 6–7. Android et iOS

Même commit métier intégré aux deux branches. Aucun changement Google Play Billing, StoreKit, permissions natives ou droits Free/Plus/Pro. Le numéro Android reste celui existant (6) tant que le dernier versionCode Play n’est pas vérifié ; aucune bêta 7 importable n’est déclarée livrée. La session Play Console demande une reconnexion. Aucun upload/publication Play ou TestFlight effectué.

Compilations Android et iOS terminées avec succès sur le commit ci-dessus : [Android](https://github.com/MowayMCR/NailMoods/actions/runs/37114766852), [iOS](https://github.com/MowayMCR/NailMoods/actions/runs/37114767276). Voir `evidence/native-builds.json`. Les fichiers V2 et le complément Smart sont présents et identiques au code source dans les trois artefacts, vérifiés dans `evidence/embedded-assets.json`. Un build sans signature iOS ne permet pas de soumettre à TestFlight. Les builds techniques conservant versionCode 6 ne doivent pas être présentés comme une nouvelle version Google Play.

## 8. Tests et preuves

- `npm test` : 423 tests, 421 réussis, 0 échec, 2 scénarios comptes Recette non exécutés.
- Navigateur Chromium, viewport mobile : 5 parcours réussis, aucun pageerror. Étiquette sans numéro -> référence à préciser sans beige automatique ; numéro Smart 30 -> fiche/HEX ; véritable lecteur EAN -> préremplissage ; ajout puis rechargement de la Collection sans doublon ; couleur manuelle conservée après deuxième vue ; même couleur officielle dans l’import Collection.
- Les captures `scan-reference-needed.png`, `scan-smart-found.png`, logs et JSON détaillent le périmètre. Aucun test navigateur n’est un PASS de caméra native.
- Matrice `Matrice_Scan.csv` distingue commun vérifié et plateformes physiques non vérifiées.

## 9. Package

Code conservé dans Git, patch, catalogue complémentaire, rapport, preuves, matrice et checksums. Inclus : sources du commit, AAB de production technique non signé et versionCode 6, APK Recette debug pour essai physique, archive iOS Recette non signée. L’APK Recette utilise le compte/environnement de test ; il ne constitue pas une mise à jour du compte Production. Aucun secret ou clé privée. Aucun AAB bêta 7 signé et importable tant que le dernier versionCode n’est pas établi.

## 10. Reste à faire Marie

1. Donner une photo nette du dessous/dos ou le numéro/code complet de ce KIKO pour vérifier la référence exacte du flacon signalé.
2. Valider sur un vrai appareil le parcours scan -> bonne fiche -> bonne couleur -> confirmation -> ajout Collection. Il reste obligatoire pour clôturer le P0.
3. Pour préparer l’AAB suivant : confirmer le plus grand versionCode de tous les app bundles Play Console, ou terminer la reconnexion sécurisée à Google. Aucun mot de passe/code secret à envoyer dans le chat.

## Recherche Internet : possibilité, pas fonctionnalité déclarée livrée

Le parcours souhaitable est catalogue local/cache -> recherche côté serveur si référence absente -> confirmation d’une fiche sourcée. Priorité aux pages officielles et métadonnées produit. Un fournisseur de recherche doit être choisi pour retrouver les URL quand aucune fiche n’est connue ; l’import `product-page` existant peut ensuite analyser le lien. Sans EAN ou numéro de teinte, lire « KIKO Smart » ne permet pas de déterminer une couleur unique. Le backend doit conserver SSRF, timeout, quota, taille maximale et la saisie manuelle ; une panne réseau ne doit jamais bloquer une génération gratuite. Aucune promesse de reconnaissance exhaustive de toutes les marques sur Internet.
