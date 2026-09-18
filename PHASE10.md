# Phase 10 — consolidation V1 (18 septembre 2026)

## Livré
- Catalogue V1 existant conservé : 1 801 références, 30 marques. Aucune teinte HEX inventée ; le CSV source reste celui intégré en phase 9.
- Recherche référence/SKU, marque, nom exact ou approchant ; OCR plafonné et confirmation systématique. Indices séparés marque, gamme, référence/SKU, nom et couleur. « Non évalué » pour une donnée absente ; indices heuristiques et non probabilités.
- Catalogue local consulté avant la recherche de code-barres distante. Échec du catalogue : solution distante ou saisie personnelle conservée.
- Référence absente : recherche web explicite, étiquette, couleur ou saisie manuelle. L’import URL reste soumis aux autorisations de lecture du site. Pas de moteur serveur de recherche publique ajouté.
- Provenance catalogue conservée comme lien de référence. Une correction d’identité devient personnelle et non vérifiée avec trace du catalogue d’origine ; jamais d’écriture dans le catalogue global.
- Classement de génération fondé sur le HEX enregistré, avec protection contre les verts/bleus foncés rapprochés à tort d’un brun. Aucun nom/photo utilisé pour remplacer la teinte.
- Tags multiples facultatifs sur stickers : floral, étoile, lune, cœur, doré, argenté, animal, abstrait, fruit, celestial, witchy, girly, minimal. Classement par affinité ; choix explicite prioritaire ; motif schématique adapté parmi les tags déclarés.
- Recette repliable depuis la fiche d’inspiration et la fiche journal : disposition par doigt, étapes du tutoriel existant et matériel supplémentaire. Journal avec photo ET schéma lorsque disponibles. Les snapshots historiques ne dépendent pas des modifications ultérieures de collection.
- Retour depuis (?) → Signaler un problème ou une suggestion : six catégories, brouillon local, copie et téléchargement TXT. Aucune transmission automatique ; la testeuse transmet son fichier au responsable du test.

## Préparé, sans faux portail Pro
- `catalogCollections` groupe par marque et collection avec identifiant stable composé et références `catalogId`.
- Origines existantes : `nailmoods`, `verified_creator`, `validated_community`, `discovered`, `personal`. Aucune auto-promotion communautaire ni badge Pro délivré par la saisie utilisateur.
- Matériel détaillé futur : conserver `equipmentCategory`, ajouter facultativement `toolSubtype`, `linerLengthMm`, `tipType`, `compatibleSystems` ; absence de ces champs compatible avec toutes les fiches V1. Aucun système salon/stock Pro déployé.

## Vérifications automatisées
143 tests passent, dont sept scénarios Phase 10 : indices indépendants, SKU et OCR ; identité corrigée sans altération globale ; séparation des nuanciers ; HEX vert malgré nom/famille erronés ; stickers multi-motifs ; matériel manquant sans blocage Free ; recette/couleur/mood conservés jusqu’au journal rechargé. Compilation de production réussie.

## Recette humaine à réaliser
L’application actuelle n’a pas de compte serveur : profil et collection restent locaux au navigateur. Un premier test externe doit se faire dans un nouveau profil de navigateur ou une session vierge, sans effacer une collection existante.

1. Ouvrir le lien public sur téléphone : générer immédiatement en Inspire-moi sans compléter de profil.
2. Ajouter une référence catalogue, puis une référence inconnue ; confirmer la couleur et modifier une information. Vérifier que l’autre produit est inchangé.
3. Tester URL Le Mini Macaron, puis URL refusant la lecture : continuer par photo ou saisie.
4. Avec le téléphone réel : photo, permission caméra, code-barres, OCR d’une étiquette nette puis floue. Confirmer/corriger avant ajout.
5. Ajouter une planche de stickers avec plusieurs tags et utiliser « Avec mes décorations ».
6. Générer avec 1 puis 3 vernis, sans puis avec matériel. Comparer chaque HEX enregistré au schéma, vérifier le matériel indiqué.
7. Ouvrir recette et tutoriel, marquer la pose faite, ajouter au journal ; rouvrir après rechargement. Vérifier schéma, photo, notes, date et produits.
8. Depuis (?), rédiger un retour, fermer/rouvrir et le transmettre manuellement.

À relever par testeuse (sans traçage automatique) : premier produit sans aide oui/non + durée ; reconnaissance exacte/partielle/absente ; solution de repli comprise oui/non ; première inspiration fidèle oui/non ; collection/journal retrouvés au retour oui/non ; obstacle et catégorie du retour. Aucun résultat de test utilisateur réel n’est prérempli.

Limites : pas de validation tactile/caméra sur appareil physique par l’agent ; scores non calibrés ; pas de synchronisation multi-appareil ; pas de collecte centralisée. La V1 catalogue identifie des références, pas des couleurs commerciales exactes en l’absence de HEX vérifiés.
