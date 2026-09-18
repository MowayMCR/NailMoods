# Phase 9 — Collection, inspiration et journal

## Livré
- Fiche enregistrée → **Créer avec cette teinte** ou **Créer avec ce sticker**. Les modifications sont enregistrées avant de quitter la fiche ; en cas d’échec de sauvegarde, elle reste ouverte.
- Dans Créer, choix facultatif de 1 à 5 teintes d’un même type de pose. Les teintes sélectionnées sont incluses dans chaque proposition. Les autres couleurs restent libres selon les choix existants.
- Un sticker explicitement choisi reste présent même si le temps ou le nombre de couleurs demandé doit être adapté. Aucun sticker inventé.
- Produits réellement possédés regroupés dans les résultats et les fiches, avec accès aux produits. La zone est absente lorsqu’aucun produit possédé n’est utilisé.
- **Sauvegarder cette pose** réutilise les favoris existants, de façon idempotente. Palette, ongles, stickers, mood et date de création sont conservés. Le journal retrouve ces mêmes favoris dans « Mes envies sauvegardées », sans les compter comme poses réalisées.
- Journal → **Créer une variante** : autre disposition, plus sobre ou plus chic. Réutilisation du moteur existant et des produits encore disponibles. Si les produits ont disparu, palette historique présentée comme couleurs de style. La pose d’origine n’est jamais modifiée.
- Les couleurs conceptuelles ne sont plus préremplies comme produits possédés dans le journal.

## Catalogue V1 intégré
- Source : `nailmoods_catalog_v1(20260917-152820).csv`, export du 17 septembre 2026.
- 1 801 références uniques, 30 marques ; statut « confirmé » repris du fichier fourni, sans nouvelle vérification externe des fiches commerciales.
- Catalogue local en lecture seule : `public/catalog-v1.json`. Reproduction de l’import avec `python scripts/import-catalog.py chemin/source.csv`.
- **Aucune des 1 801 références ne contient de HEX**. Aucun HEX n’a été déduit d’un nom ou d’une photo de catalogue. La fiche explique que la teinte doit être confirmée personnellement.
- Matching : référence exacte (marque/gamme lorsqu’elles sont connues), nom exact, texte OCR et proximité textuelle. Trois candidats maximum. Les numéros voisins ne sont pas substitués par recherche floue.
- Score de proximité heuristique affiché sur 100, avec niveau élevé/moyen et motif. Ce score n’est pas une probabilité statistique. Les collisions et l’OCR abaissent la confiance. Toujours confirmation avant reprise des informations.
- Priorité couleur préparée : donnée catalogue explicitement validée → couleur personnelle confirmée → prélèvement photo → famille. Les anciennes teintes restent compatibles.
- Provenance : catalogue NailMoods, référence découverte (URL/OCR), produit personnel. Les modifications de la collection ne modifient jamais le catalogue global. Pas de badge de marque vérifiée attribué par un import personnel.
- En cas d’absence : recherche web, photographie de l’étiquette, accès au sélecteur couleur, saisie manuelle. Les imports URL et code-barres existants restent disponibles.

## Préparé seulement
- Nuanciers : identifiants stables et champs marque/collection/référence. Aucun ajout massif ni interface Pro.
- Recherche publique : ouverture de la recherche web puis retour par URL avec validation. Pas de moteur web multi-marques automatisé, ni alimentation automatique du catalogue.

## Vérifications
- 136 tests automatisés réussis, incluant sélection dans une collection de 105 produits, deux teintes imposées, sticker malgré des choix incompatibles, collection vide, sauvegarde/relecture, journal, variantes, matching ambigu, faux numéros et priorité couleur.
- Build de production et contrôle Git réussis.
- Tests du parcours public : à compléter après déploiement.
- Téléphone physique / viewport 320–390 px et session publique entièrement vierge : restent à valider ; ne pas confondre avec les scénarios de données vides couverts automatiquement.
