# Validation de la Collection illustrée

- Base auditée : `2a165f8c1d745880a05544aba83db70860f9ee56`.
- `npm test` : 547 tests, 545 réussis, 2 ignorés préexistants, aucun échec. Les nouveaux tests SQL couvrent les quatre choix de visibilité, les droits du propriétaire, les blocages, les comptes non éligibles et les champs privés exclus.
- Build Web avec les variables de production : réussi.
- `scripts/test-shelf-browser.mjs` : 21 contrôles, aucune erreur navigateur. Le script utilise le vrai composant App et les RPC de migration dans PGlite, avec des données synthétiques isolées.
- Responsive : 320, 360, 390, 430, 768 et 1024 px. Quatre moods, collection vide, petite et 1 000 produits ; rendu progressif 40 puis 80. Premier affichage dans le banc de test : 747 ms, sans prétendre représenter un téléphone physique.
- Fiche existante, création avec une référence, favoris, photos et absence de photo, usage réel, tris couleur/récence/usage, animation aller/retour, réduction des animations : validés.
- PO → produit → poses → produits utilisés, références communes, style, visibilité enregistrée et restaurée : validés.
- Captures issues du banc de test (les noms et les données de démonstration ne sont jamais insérés en production). Les images sont livrées dans le dossier de captures ; `evidence/browser-results.json` conserve les résultats lisibles.

## Migration additive

Source : `supabase/migrations/20261006075120_illustrated_collection_shelf.sql`.
Appliquée en recette et en production. Enregistrement de production : `20261006081052`, nom `illustrated_collection_shelf` (horodatage attribué par l’outil de migration).
Une table privée de consentement, deux index, fonctions privées et trois façades RPC authentifiées. Aucun inventaire parallèle ; aucune réinitialisation.

Contrôle de production immédiatement avant/après : 11 produits, 3 poses et 15 profils ; empreintes de toutes les lignes identiques. Aucun réglage d’étagère créé automatiquement. RLS activée, accès anonyme refusé.

L’avis Supabase « RLS sans politique » sur `private.shelf_settings` correspond au refus total d’accès direct voulu : tous les droits de table sont révoqués et seules les RPC contrôlées peuvent agir. [Documentation de cet avis](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Utilisation

Collection → Vue étagère / Vue photos. Les couleurs restent celles des produits, indépendamment du mood. Une couleur inconnue est indiquée « Teinte à préciser » ; aucune utilisation donne « Jamais utilisé ».
Profil → Espace Pro → Visibilité de mon étagère : choisir un espace possédé puis les produits à partager. Les étagères restent masquées par défaut. La découverte conserve les droits Plus/Pro existants ; la bibliothèque personnelle conserve les droits de chaque compte.
Pour créer avec une référence de PO non possédée, l’éditeur existant s’ouvre afin de confirmer son ajout, puis « Enregistrer et créer ». Les statistiques de la PO ne sont jamais copiées dans la collection personnelle.

Aucun build Android, AAB, iOS ou TestFlight déclenché. Validation visuelle sur un téléphone physique par Marie à réaliser après livraison ; aucune partie fonctionnelle n’est reportée volontairement.
