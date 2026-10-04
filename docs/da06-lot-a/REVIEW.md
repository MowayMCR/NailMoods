# NailMoods — Lot A, proposition visuelle à valider

Date : 4 octobre 2026. Base exacte : `f7a67ca` de `origin/feat/da06-moods-ux`.
Branche de travail isolée : `feat/da06-home-finish-lot-a`.

## Périmètre

Uniquement l’Accueil : hiérarchie éditoriale, signature du mood, univers personnels, moodboard express sans capsules, carnet de poses guidées, Collection avec couleurs réelles de la collection locale, inspiration du jour plus généreuse, accès Scan et communauté conservés.

Trois fichiers applicatifs :
- `src/HomeView.jsx` : intégration, hiérarchie, ordre des sections et métadonnées de l’inspiration ; gestionnaires existants conservés.
- `src/design/HomeBento.jsx` : quatre compositions alimentées par les données existantes ; aucun contenu fictif ajouté au produit.
- `src/design/home-editorial.css` : styles limités à l’Accueil, couleurs UI issues des tokens existants ; présentation des produits neutre.

Aucun changement de modèle, migration, route, droits, moteur de génération, moteur de thèmes ou renderer partagé. Aucun build mobile, déploiement, fusion ou publication de branche. Les autres lots attendent la validation de Marie.

## Conservation vérifiée

Les 17 fichiers contrôlés (logo, symbole, icône, atlas et autres images existantes, registre d’icônes, MoodGlyph, NailPreview et thèmes) sont identiques à la base, SHA-256 joints dans `evidence/preservation.json`. Les dernières corrections de la branche sont incluses ; aucune forme de capsule réintroduite dans Inspiration express.

Les univers viennent de `profile.styles`. Sans sélection, la carte invite à choisir : elle n’invente pas des goûts. La Collection utilise `productColor` et les produits réellement reçus par l’Accueil ; sans produits, elle montre une invitation d’ajout. La progression ne s’affiche que pour une session existante. Les liens conservent les parcours existants.

## Captures et données

Captures réelles de l’application exécutée par Vite/Chromium, ratio de capture 2×. Aucun photomontage ni image générée. Les quatre captures complètes ont la même largeur CSS de 390 px et exactement les mêmes données. Pour la capture longue, la hauteur de viewport est étendue à celle du document afin que la navigation fixe reste en bas ; les captures `premier-ecran-*` montrent aussi le viewport mobile normal 390 × 900.

Jeu local de démonstration : Marie, Witchy + Cottagecore, Amande, longueur Moyenne, trois vernis de contrôle avec HEX manuels #bd7084, #829076 et #dfb5a0. Il ne s’agit pas du compte réel de Marie ni de teintes certifiées de marques. Ces couleurs servent à vérifier leur invariance entre thèmes. Le compte et les données distantes n’ont pas été consultés ou modifiés.

La planche 6 × 8 exécute le composant NailPreview existant avec des données de contrôle. Chaque case expose le premier ongle pour comparer les silhouettes, à longueur moyenne. Le zoom Accueil montre la composition complète des cinq ongles. Les silhouettes ne sont pas retouchées dans cette passe.

## Vérification

- 29 tests ciblés réussis : Accueil, DA06/contrastes existants, composition manuelle et multi-techniques.
- 16 combinaisons thème × largeur (320, 360, 390, 430 px) : aucun débordement horizontal détecté, aucun débordement dans les boutons Bento.
- Géométrie identique des Bento dans les quatre thèmes ; quatre backgrounds distincts.
- Couleurs CSS des flacons et swatches identiques aux HEX de contrôle dans les quatre thèmes ; fills des aperçus d’ongles inchangés.
- Six destinations vérifiées depuis l’Accueil : univers, créer, guides, collection, fiche inspiration, ambiance.
- États sans univers et sans produits : aucune fausse sélection ou faux produit.
- Libellés longs et trois univers à 320 px vérifiés.
- Aucune erreur JavaScript observée. `git diff --check` passe.

Les tests navigateur concernent Chromium, pas une validation sur appareils Android/iOS réels. Les parcours d’authentification et de paiement ne sont pas retestés dans cette passe visuelle limitée. Les dimensions tactiles des cartes restent supérieures à 44 px, focus visible et réduction des animations hérités du Design System.

## Points soumis à Marie

1. Valider ou ajuster la richesse, les proportions et la douceur des nouvelles compositions de l’Accueil.
2. Vérifier les quatre ambiances, en particulier le contraste du Dark Feminine et la douceur du Pop Pastel.
3. Le renderer conservé mérite encore une décision visuelle : ovale proche de l’amande, rendu Jelly proche de la crème, effets Chrome et Cat Eye très graphiques. Cette planche sert au diagnostic ; elle ne vaut pas validation finale des silhouettes ou finitions.

Arrêt volontaire au point de validation du LOT A. Pas de généralisation aux autres écrans et pas d’AAB.

## Reproduction

Dépendances du projet déjà installées, navigateur Chromium attendu à l’emplacement indiqué dans les scripts.

`node scripts/capture-home-lot-a.mjs`

`node scripts/capture-nails-lot-a.mjs`

`node --test tests/home.test.js tests/da06.test.js tests/nail-set.test.js tests/multi-technique.test.js`
