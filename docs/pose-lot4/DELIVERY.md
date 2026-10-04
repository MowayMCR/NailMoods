# NailMoods — Lot 4 : Inspiration → DIY

État de départ : branche approuvée `feat/pose-month-followup`, arbre `cdcf54ae5535a1d3fe91714976502a8adb9b30c6` (DA06 conservée).
Travail isolé : `feat/pose-diy-lot4`. Production et build bêta non concernés.

## Correction demandée sur les marges

Deux tokens de spacing communs : `--nm-page-gutter` (16–24 px) et `--nm-card-inset` (16–22 px). Appliqués aux pages Projet / Tenue / Planning / DIY et au bloc Suivi, dont le texte n’est plus collé à sa bordure. Les autres écrans DA06 conservent leurs gouttières déjà présentes. Le calendrier garde 16 px de marge intérieure sur les petits écrans. Boutons multilignes et timeline vérifiés aux largeurs 320, 360, 390 et 430 px.

## Audit et réutilisation

- `inspirations.js` : `snapshotIdea`, `validIdea`, identité stable de composition.
- `poseCycle/model.js` : `projectFromIdea`, composition conservée dans `pose_projects.details.composition`.
- `poseCycle/repository.js` : contrôle de session, périmètre propriétaire/espace, import idempotent par `legacy_key`, sauvegarde avec révision optimiste.
- `techniqueRules.js` et taxonomie existante : besoins par technique. Les besoins de dessin sont affinés pour les pois ; aucune lampe n’est imposée au vernis classique seulement parce qu’une famille de motifs peut exister en gel.
- `colorAnalysis.js` : teinte précise, sans couleur de famille inventée.
- `photoInspiration.js` : distance colorimétrique déjà utilisée, seuil conservateur pour les alternatives.
- `productKinds.js` : séparation Couleur / Base / Top / construction.
- `RecipeSummary` et `buildTutorial` : recette, placement par doigt et même moteur de tutoriel.
- `NailPreview`, `Button`, `MoodPicker`, moteur DA06 : rendu et composants conservés.
- Auth, Collection, Planning et Suivi : mêmes services ; aucun stockage supplémentaire.

## Parcours livré

Inspiration enregistrée → **Je veux la réaliser** → import/réutilisation du même Projet de pose → **Ma fiche DIY** → produits et matériel → **Ouvrir le tutoriel** existant ou **Planifier cette pose**.

Un projet issu d’une tenue dispose du même accès, en réutilisant son identifiant. La fiche est consultable par son propriétaire uniquement. Deux ouvertures d’une même inspiration réutilisent le projet. Les produits de la Collection restent accessibles via leur fiche existante.

## Modèle et migrations

Aucune table, migration ou copie persistée de checklist. La comparaison est calculée à partir de la composition et de la Collection actuelle. La session du tutoriel est liée au champ existant `details.tutorialSessionId`. Les autres attributs, révisions et statuts restent préservés. La route ajoutée est `#creer/diy/:projectId`.

`startTutorial` conserve son comportement initial par défaut ; l’option interne `open:false` prépare/reprend la session, renvoie son identifiant, puis la navigation a lieu après l’enregistrement du lien au projet. Si celui-ci échoue, la fiche affiche l’erreur et permet le rechargement ; la session existante peut être reprise sans duplication.

## Contrat de comparaison

- **Je possède** : identifiant de Collection, identifiant catalogue ou référence marque/gamme concordante ; quantité positive. Une référence modifiée est signalée **À vérifier**.
- **Teinte proche** : HEX précis proche, même type/famille produit et finition renseignée concordante. Opacité comparée lorsqu’elle est renseignée des deux côtés ; différence exclue, absence explicitement indiquée. Tri par proximité, jusqu’à trois références.
- **Il me manque** : aucune référence ni alternative suffisamment renseignée. L’absence de métadonnées n’est pas transformée en certitude de compatibilité.
- Matériel : catégories de Collection existantes, avec distinction pinceau liner/détail et outils de stamping. Possession ≠ adéquation à un protocole fabricant.
- Aucune substitution silencieuse, aucune mutation des HEX, aucun « dupe exact » et aucune inférence chimique.

## Droits et confidentialité

La préparation DIY d’une inspiration personnelle est accessible à Free. L’import photo / tenue reste Plus ou Pro ; IA+ ne débloque rien. Une fiche premium historique reste consultable, sans ouvrir la reprise de création photo aux comptes Free. Les contrôles serveur existants restent actifs. Pas de nouveau partage, média, SKU, paywall ni appel IA.

## Validation

Voir `evidence/tests-full.txt`, `tests-diy.txt`, `browser-diy.json` et `build-recette.txt`.
Bilan : 498 tests, 496 réussis, aucun échec, 2 tests optionnels ignorés ; 12 tests unitaires DIY. Le dossier HTML autonome (7 captures, 4 onglets) est également vérifié, ainsi que le mois complet avec ses marges à 320/360/390/430 px.
Tests unitaires ciblés : références, stock nul, couleur/finition/famille/opacité, absence de couleur fiable, changements de référence, outils spécifiques, guides partiels et absence de mutation.
Navigateur : application exécutée avec vrais comptes Supabase recette Plus, Pro (isolation) et Free ; produits et inspiration synthétiques nettoyés après test. Parcours, reprise, déduplication, liens vers Collection/tutoriel, évolution de Collection, quatre moods, HEX constants, marges responsive et isolation vérifiés.
Les captures sont issues de l’application exécutée ; ce ne sont pas des maquettes. Les captures longues utilisent une largeur mobile de 390 px et une hauteur adaptée au contenu pour éviter que la barre fixe recouvre le milieu de l’image.

## Limites connues

- La proximité RGB existante est indicative ; pas de colorimétrie instrumentale ni vérification physique de l’opacité.
- Le guide existant décrit les couleurs, French, lignes, pois et ressources enregistrées. Les techniques avancées (Chrome, Aura, etc.) sont signalées comme guide partiel. Aucun protocole, temps fabricant ni produit spécialisé manquant n’est inventé.
- Les alternatives restent des suggestions consultables, non des remplacements de recette. Les choix/moteurs de variantes restent ceux de l’application.
- Pas de nouveau système de télémétrie DIY dans ce lot ; l’infrastructure de consentement existante n’est pas modifiée.
- Aucune exécution sur téléphone physique Android/iOS dans cet environnement ; notifications et calendriers natifs ne sont pas revalidés ici.
- Limite antérieure conservée : après liaison, modifier la date historique du Journal et modifier la date réelle du Projet ne sont pas deux opérations automatiquement synchronisées.
- Avertissement Vite existant : certains chunks dépassent 500 kB. La compilation réussit.

## Rollback

Revenir au commit parent de cette branche retire les composants/route DIY et restaure les espacements précédents. Aucune migration à annuler. Les projets restent lisibles par les lots précédents, y compris leur champ de session déjà prévu. Aucune modification Production.

## Fichiers

Nouveaux : `src/poseCycle/diy.js`, `DiyView.jsx`, `diy.css`, `tests/pose-diy.test.js`, `scripts/test-diy-browser.mjs`, `scripts/test-diy-report.mjs`, `scripts/build-diy-report.py`, présent dossier.
Modifiés : `src/CreateView.jsx`, `src/InspirationView.jsx`, `src/main.jsx`, `src/design/da06.css`, `src/poseCycle/OutfitFlow.jsx`, `outfit.css`, `planning.css`, `followUp.css`, `.gitignore`.
