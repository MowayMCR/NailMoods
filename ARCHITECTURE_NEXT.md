# Évolution du modèle NailMoods

Le profil, la collection et les créations restent locaux au navigateur. Aucun compte, rôle serveur, synchronisation ou partage Institut n’est implémenté.

## Catalogue
`provenance` distingue `nailmoods`, `verified_creator`, `validated_community`, `personal`. `source` conserve la méthode d’import (URL, scan, photo, manuel). Les anciennes fiches sont interprétées comme personnelles sans migration destructive. `reference`, `sku`, `collection`, `brand`, `url` restent indépendants. Une ingestion future devra attester la provenance, la vérification, l’identifiant du contributeur et celui du catalogue ; le formulaire personnel ne peut pas attribuer un badge vérifié. La teinte personnelle reste prioritaire via `productColor`.

`duplicateCandidates` signale marque + référence/SKU identiques, ou marque + nom exact + collection. Aucun rapprochement approximatif, aucune fusion automatique.

## Produits et matériel
Compatibilité avec la collection existante : discriminateur `type === "Matériel"`, catégories d’outils distinctes, quantité et notes. Les gels sont des produits ; spatules, pinces, lampes, palettes sont du matériel. Le moteur n’utilise que les outils disponibles et n’infère pas les compétences depuis le nombre de couleurs. Une future extraction en deux inventaires doit préserver les IDs référencés par les poses.

## Espaces futurs
Conserver un cœur partagé Particulier/PO. Lors de l’introduction du serveur, séparer : catalogue de référence ; inventaire d’un espace (`workspaceId`, personnel ou institut) ; possessions et teintes personnelles ; membership utilisateur/rôle ; créations appartenant à leur auteur. Permissions vérifiées côté serveur, jamais par une propriété localStorage. Ne pas attribuer dès maintenant un espace partagé fictif aux fiches personnelles.

## Créations et préférences
`NailPreview` est déjà partagé entre résultats, détail, favoris, accueil, tutoriels et journal. Les snapshots conservent palette, ongles, décorations et ressources. Renommer ne change pas la clé de composition ; le journal et les anciennes poses conservent leurs souvenirs historiques. Les variantes existantes utilisent la collection actuelle, sans écraser la source. La personnalisation existante exploite favoris, poses et journal avec son réglage de désactivation ; pas de nouveau suivi distant. Des signaux « ignorée »/« variante demandée » restent à définir explicitement avant collecte.
