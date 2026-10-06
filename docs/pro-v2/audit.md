# Audit Pro V2 — 5 octobre 2026
Base commune : origin/main 340c201 (DA06, cycle complet, correction contour des ongles).

## Structures conservées
- profiles : compte et @ID personnel ; le métier n'est pas un droit.
- workspaces, pro_profiles : identité professionnelle et collective, @ID stable.
- workspace_members, workspace_invitations, workspace_entitlements : rôles, invitations, accès et limites de sièges. Pas de seconde table d'organisations.
- effective_tier : résolution manuelle/bêta/Apple/Google ; aucune réécriture.
- Journal et inspirations publiques, discovery_preview, médias protégés, connexion, blocage, signalement : réutilisés.
- DA06 : quatre palettes, UniverseTiles/MoodGlyph et taxonomie existante.

## Écarts et décisions
Le statut indépendant/propriétaire/collaboratrice mélange métier et structure. Ajouter un métier nullable (aucune déduction arbitraire pour les anciens comptes), un type de structure et une présentation V2. Les rôles de stockage historiques manager/creator restent compatibles : manager est présenté comme admin ; creator comme membre. Le propriétaire garde la gestion des sièges/rôles.

Les champs de vitrine et les produits sont stockés dans le schéma privé et publiés uniquement par projection filtrée. Cela évite d'élargir les SELECT historiques de pro_profiles. Chaque champ éditorial porte une visibilité public/private/organization. Les membres et leurs créations sont invisibles dans l'équipe collective tant qu'ils n'ont pas opté explicitement pour cet affichage.

Le catalogue actuel est un fichier distribué avec l'application, pas une table SQL. Une référence de vitrine n'est donc jamais automatiquement considérée comme une référence catalogue vérifiée. L'ajout à la Collection exige une correspondance exacte avec ce catalogue côté application.

## Déploiement
Migration additive en recette uniquement. Validation web sur la même base React/Capacitor. Pas de SKU, pas de build Store, pas d'IA+ publique. Conserver les limites de sièges bêta existantes, et 1 siège pour une nouvelle structure sans attribution manuelle supplémentaire.
