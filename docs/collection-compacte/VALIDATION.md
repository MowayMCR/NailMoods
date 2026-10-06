# Collection — commandes regroupées (6 octobre 2026)

Demande de Marie : retirer « Ta pose en cours » de Collection, garder les tons de couleur et regrouper les recherches derrière le picto réglages.

## Réalisation

- Le bandeau de tutoriel ne se monte plus dans Collection. La session et ses autres points d’accès sont conservés.
- Une barre de trois pictos accessibles : étagère illustrée, produits / vue photos, réglages. Le bouton d’ajout reste sur la même ligne.
- Recherche, catégories, type, marque, couleur, finition, favoris et tri réunis dans la fenêtre de réglages existante. Un indicateur signale une recherche, un filtre ou un tri modifié ; « Effacer les filtres » réinitialise aussi la recherche, la catégorie et le ton.
- Les tons restent directement accessibles et filtrent les deux vues. La pagination repart à 40 après un changement de ton.
- Le réglage de densité de la vue photos et son accès à la création restent disponibles dans le panneau. L’entrée des étagères PO est conservée sous la collection.
- Aucun changement des données, du catalogue, des permissions ou des migrations. Aucun build Android/iOS demandé ni déclenché.

## Validation

- `npm test` : 549 tests, 547 réussis, 2 ignorés préexistants, aucun échec.
- Build Web production réussi. Avertissement préexistant de taille de bundle conservé.
- Script navigateur de l’App réelle avec données isolées : 26 contrôles réussis, aucune erreur JavaScript.
- Quatre moods ; 320, 360, 390, 430, 768, 1024 px ; cinq flacons par rangée et marges conservées.
- Vérification d’une session active : bandeau absent dans Collection, présent dans Mes poses ; aucun effacement de session.
- Recherche persistante à la réouverture du panneau, catégories, tri couleur/récent/usage, indicateur actif, remise à zéro, ton conservé entre les vues, ajout accessible.
- Régression : focus aller/retour, fiche, création, favoris, photos, teintes indicatives/inconnues, PO→produit→poses, confidentialité.
- Collections vide, petite (16 références), et 1 000 produits avec rendu progressif 40 puis 80. Mesure locale indicative du premier rendu : 772 ms, pas une mesure sur téléphone physique.

Commande de reproduction :

```sh
NAILMOODS_SHELF_EVIDENCE=/tmp/nm-compact-evidence NAILMOODS_BROWSER_EXECUTABLE=/chemin/chromium node scripts/test-shelf-browser.mjs
```

Les captures du banc de validation contiennent exclusivement des données de test et ne représentent pas le compte personnel de Marie.
