# Web production — lot personnel, 5 octobre 2026

Autorisation Marie : « continue les maj sur la prod pour que je puisse valider tout avant de faire une nouvelle beta ».

Base main 340c201. Intégration ciblée du lot engagement et du correctif Réglages, sans importer les changements Pro V2 et leurs migrations non validées en production. Aucun changement Billing, IA+, StoreKit, schéma ou données Supabase. La recette séparée reste au sous-chemin validation-pro-v2, construite depuis sa révision vérifiée 8808a5f.

## À valider
- Profil : Mon planning et prochaines échéances ; ouvrir le mois complet et les projets.
- Profil : Ton NailMoods et sortie temporaire des habitudes.
- Réglages : marges, prénom et bio pleine largeur ; sauvegarde après rechargement.
- Avec ma collection : uniquement ma collection, 3 couleurs maximum, redécouverte d’un vernis lorsque le Journal contient des usages.
- Inspiration/ancienne pose : Adapter à ma collection, contrôler les substitutions, ouvrir et conserver la variante privée dans les projets.
- Favori/produit retiré : Annuler restaure uniquement l’objet retiré.
- Contrôler les quatre moods et les droits Free/Plus/Pro existants. L’adaptation Collection reste Plus/Pro.

## Vérifications effectuées avant publication
- Suite complète : 532 tests, 530 réussis, 2 ignorés, 0 échec (les trois tests Pro V2 de la branche recette ne sont pas importés).
- Build VITE_DEPLOYMENT_ENV=production, pose cycle activé : réussi. Avertissement existant sur le poids des bundles conservé.
- Navigateur : vrais composants App, comptes synthétiques, PGlite et RLS pour projets/planning, stockage du shell simulé. 17 contrôles passent, aucune erreur JavaScript. Pas de nouvel essai authentifié sur un compte production ni sur appareil natif.
- Réglages : 16 combinaisons largeur/mood (320/360/390/430 ; quatre moods), géométrie des champs, persistance invitée après rechargement ; aucune erreur JavaScript.

Les résultats sont dans common-engagement/evidence/browser-results.json et reglages-checks.json. Les captures de référence de la branche de validation restent consultables dans la PR14.

## Périmètre restant
Catalogue central/admin, boucle complète cliente-PO-retour, signature Pro dérivée, récap et mesures agrégées : non livrés par ce déploiement. Android et Apple restent inchangés. Retour arrière : revenir au code main 340c201 puis redéployer ; aucune migration inverse nécessaire. Les projets créés restent compatibles avec le schéma existant.
