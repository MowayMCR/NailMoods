# NailMoods - Correctifs bêta du 2 octobre 2026

Code métier final : `06c8f923a9189828b125de966eb55f3c70cd1fc2`, intégré par fast-forward sur `feat/google-play-billing-beta6` et `feat/apple-storekit-ios` ; base `fix/beta-common-20261002`. Le dernier correctif change uniquement le placement des icônes de bibliothèque et la capture de preuve. `b063f0b` corrige une résolution JSX ambiguë sur macOS ; `9cb4acf` contient les corrections métier.

Android : AAB Production 0.3.0-beta.6 / versionCode 6 signé avec la clé d'importation existante. Son certificat SHA-256 correspond à Play Console. Signature stricte et bundletool : PASS ; 1 137 fichiers de payload inchangés après signature. SHA-256 signé : `189e72c0393e891c5d71d85133bea1a867fc815a3543c413e68abe2e413c5bdc`. Dernier numéro Play observé : 5. Aucun upload ni publication Play dans cette passe.

iOS : même code métier, compilation simulateur et archive appareil non signée réussies. Archive Recette com.nailmoods.app.recette, 0.3.0 / build 1. Pas de TestFlight ni d'IPA signé.

Migration additive et fonction `product-page` déployées en Recette et Production. Catalogue commercial inchangé : 2 631 références actives, 1 047 associations de codes vérifiées. Aucun EAN inventé. KIKO et CANNI n'ont pas de codes vérifiés dans cette source.

415 tests passent, 2 tests d'intégration à comptes A/B sont ignorés. Six parcours Chromium passent sur images de codes et étiquette synthétiques. Les preuves indiquent toujours leur portée. Les logs CI enregistrés sont des extraits ; les jobs complets sont disponibles aux URLs dans `evidence/ci-builds.json`. `first-tests.txt` est un diagnostic intermédiaire, pas le résultat final.

**Critère de sortie non atteint :** aucun appareil physique disponible. Scan caméra → reconnaissance → fiche → Collection, permissions natives, reconnexion authentifiée, requête Edge URL authentifiée et parcours sociaux réels restent à valider. Le package est un candidat bêta, pas une validation de caméra physique. Les deux tests ignorés ne sont pas des PASS.

Le rapport PDF livré regroupe les dix rubriques demandées, matrices et actions Marie. Les données de vérification et captures se trouvent ici. Les clés et mots de passe de signature sont exclus de Git et du package.

Pour reproduire : `npm ci`, `npm test`, `npm run test:beta-browser` (Chromium Playwright installé ou `NAILMOODS_BROWSER_EXECUTABLE`), `npm run mobile:production`, puis le workflow Android. Le PDF se reconstruit avec `NAILMOODS_DELIVERY_DIR=/chemin/du/package python docs/beta-correctifs-20261002/build_report.py` et son `build-verification.json`.
