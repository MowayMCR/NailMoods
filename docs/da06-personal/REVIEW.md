# NailMoods — Splash, Profil et Onboarding DA06

Direction visuelle validée par Marie le 4 octobre 2026. Dernière correction demandée appliquée : libellés et valeurs centrés dans les tuiles de préférences du profil, du profil public et du récapitulatif d’onboarding.
Base : `6edda7b` (Accueil lot A), elle-même issue de `f7a67ca` sur `feat/da06-moods-ux`.
Branche locale : `feat/da06-profile-onboarding-finish`.

## Changements

- Splash : signature de marque, logo existant dans une forme arrondie, décor végétal existant, palette mémorisée, progression discrète. Aucun délai de chargement artificiel. Actions exceptionnelles toujours limitées aux erreurs.
- Premier affichage HTML avant React : même style de splash. Une feuille de style commune évite deux directions visuelles différentes. Le fichier `public/boot.css` reste généré depuis les quatre palettes existantes.
- Profil personnel : identité et modification, compteurs issus des données, univers illustrés, petites tuiles de préférences, palette du mood, aperçus des poses et inspirations enregistrées, invitations explicites lorsque les sections sont vides.
- Photos privées : réutilisation du composant existant `JournalVisual` et de son service d’URL signées ; seul le composant est exporté puis raccordé au profil. Son fonctionnement interne n’est pas modifié.
- Profil public : mêmes modules visuels en lecture seule, uniquement avec les données déjà renvoyées par la projection publique. Les réglages de confidentialité et les services d’accès restent inchangés.
- Onboarding : introduction éditoriale, cartes des univers avec les icônes validées et coche de sélection, choix du mood avec miniature d’interface, récapitulatif visuel. Les univers déjà sélectionnés sont présentés en premier sans changer la taxonomie.
- Préférences : mêmes champs dans le même profil, sans nouveau stockage ni modèle. Les champs de formulaire conservent une police de 16 px ; une seule colonne à petite largeur pour les préférences.

## Conservation

Les 20 fichiers contrôlés sont identiques à la base : Accueil validé, thèmes, renderer NailPreview, MoodGlyph, registre et atlas, logos et illustrations PNG/SVG/WebP. Empreintes dans `evidence/preservation.json`.

Aucun asset supprimé ou redessiné. Aucun changement des couleurs de produits, droits Free/Plus/Pro, scan, génération, abonnement ou service d’authentification. Aucune nouvelle route, migration ou modification du schéma de profil.

Le code reste commun Android/iOS. Aucun build AAB/IPA, publication, push ou fusion effectué.

## Captures fournies

- Splash dans les quatre ambiances : composant réel exécuté dans un environnement de test isolé, pour maintenir cet écran transitoire visible sans ralentir une authentification réelle.
- Premier lancement HTML dans les quatre ambiances : application réellement chargée, import du code principal retenu uniquement par le script de test.
- Profil personnel complet dans les quatre ambiances, mêmes données.
- Les huit étapes d’onboarding en Soft Glam ; introduction, univers, choix du mood et récapitulatif également dans les trois autres ambiances.
- Profil public, vue mobile et vue étendue.

Toutes les images sont des captures Chromium de code exécuté, sans image générée ni maquette substituée. Largeur principale : 390 px, densité 2×. Pour montrer les pages complètes, la hauteur du viewport est étendue à celle du document. Les listes internes restent déroulantes.

Données locales de démonstration : profil Marie, trois univers, deux poses et trois inspirations produites par le moteur existant. Il ne s’agit pas du compte distant de Marie. Aucun identifiant @ n’est inventé pour le profil invité. Le profil public de démonstration utilise explicitement `@profil.demo` dans une réponse de test du service, sans publication distante.

## Vérifications

- 31 tests ciblés réussis : DA06, identité, confidentialité et intégration mobile existante.
- 152 contrôles navigateur : profil et huit étapes d’onboarding dans chaque mood aux largeurs 320/360/390/430 ; absence de débordement horizontal ; ajout/retrait d’univers ; changement de mood immédiat sans perte des univers ; reprise après rechargement ; finalisation uniquement sur « Entrer dans NailMoods » ; visite guidée ; modification persistée de la forme depuis Profil ; profil public sans formulaire d’édition ; aucune erreur JavaScript.
- 21 contrôles complémentaires : premier démarrage dans chaque palette aux quatre largeurs, bouton Réessayer seulement sur erreur, résolution d’une photo privée par le service d’URL signées existant.
- Retour visuel traité : mots trop serrés dans les préférences et aperçu d’ongles coupé dans une carte publique.

Ces vérifications ne constituent pas une recette sur appareils physiques. Aucun e-mail de confirmation réel, deep link natif, achat ou session de production n’a été déclenché. Ces parcours n’ont pas été modifiés dans cette passe visuelle.

## Fichiers applicatifs

`src/design/ProfileModules.jsx` : univers, préférences et états vides partagés.
`src/design/profile-experience.css` : styles des profils et de l’onboarding.
`src/design/brand-splash.css` : style commun du premier lancement et du splash React.
`src/design/UI.jsx` : miniature d’ambiance et splash.
`src/design/Onboarding.jsx` : présentation, récapitulatif et ordre visuel des univers.
`src/ProfileView.jsx` : présentation et aperçus.
`src/identity/PublicProfile.jsx` : modules visuels en lecture seule.
`src/JournalView.jsx` : export du composant visuel existant, sans changement interne.
`src/main.jsx` : transmission du service média existant au profil.
`index.html`, `scripts/build-theme-css.mjs`, `public/boot.css` : premier écran cohérent avec le splash.

## Reproduction

`node scripts/build-theme-css.mjs`
`node scripts/capture-personal-da06.mjs`
`node scripts/test-personal-boot-media.mjs`
`node --test tests/da06.test.js tests/privacy.test.js tests/identity.test.js tests/mobile-wrapper.test.js`

Les scripts utilisent Vite et Chromium local ; aucune connexion réelle requise.

## Point de validation

Splash, profil et onboarding validés visuellement par Marie ; centrage final appliqué et captures actualisées. La diffusion et le build mobile restent des étapes distinctes. Les lots Créer/Fil et Collection/Mes poses restent hors de cette passe. Les améliorations restantes du renderer signalées au lot A restent ouvertes.
