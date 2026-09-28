# Promotion de la refonte UX/UI — 28 septembre 2026

Autorisation de Marie : retirer le fil communautaire de Mes poses, conserver l’accès en haut et sur l’Accueil, puis passer en Production.

- Retrait de DiscoveryShortcut dans JournalView ; Mes poses reste la destination personnelle. La messagerie privée reste accessible.
- Base Production vérifiée : 055c6ecd0240b7cea134024e4d46486b1fd19075.
- Version promue : sources UX de la Recette v61 (36436ba), avec ce retrait final.
- Promotion des sources applicatives, tests et documents de la refonte. Configuration de déploiement, dépendances, documents légaux et assets Production conservés.
- Les différences applicatives comprennent les lots de refonte déjà livrés en Recette, ainsi que la page Créer et les accès au fil. Les rapports et captures de recette restent dans le dépôt de Recette.
- Pas de migration SQL ni de déploiement de fonction serveur. Pas de modification de données utilisateur, d’offres ou de permissions.
- Retour possible au commit Production précédent. Les tests multi-comptes et sur téléphones réels ne sont pas déclarés exécutés lors de cette promotion.
