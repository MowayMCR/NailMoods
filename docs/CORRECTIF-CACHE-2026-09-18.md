# Correctif bêta — quota du cache connecté

## Cause et correction

L’ancien `nm-cloud-v1:<userId>:<workspaceId>` sérialisait les vues, les copies serveur et la file d’attente dans un seul JSON localStorage. Les photos et snapshots pouvaient être répétés dans ce JSON.

Le cache connecté utilise désormais `src/cloud/cache/` et IndexedDB : enregistrements séparés par produit, inspiration, entrée de journal et opération. Les images data-URL sont converties en Blobs, dédupliquées par empreinte dans chaque espace. Une modification de nom ne réécrit ni les autres produits ni leurs images. Les opérations portent sur une fiche, jamais sur tout le workspace. Les UUID d’opérations et de lignes sont stables pour les reprises.

Supabase reste la source de vérité. Les lectures sont paginées par 500 lignes. Les mutations distantes commencent après la transaction locale durable. Un contrôle de révision empêche un onglet ancien d’écraser le cache d’un autre. Les mises à jour serveur utilisent le champ `updated_at`, déjà maintenu par les triggers existants, plutôt que des snapshots/photos dans les filtres URL.

L’ancien cache est transféré atomiquement avant son retrait de localStorage. Si le transfert échoue, l’original reste intact. L’import lit la copie invitée, recharge les pages distantes et ajoute uniquement les éléments manquants. Son marqueur principal est dans IndexedDB ; le petit marqueur localStorage facultatif peut échouer sans faire échouer l’import.

## Quota et récupération

Message : « L’espace local de cet appareil est presque plein. Tes données en ligne restent intactes. »

Réessayer relance la persistance et la synchronisation. Mon compte permet un nettoyage explicite du cache reconstituable, avec confirmation. Le nettoyage est interdit tant que des opérations non synchronisées restent présentes. L’export de la copie locale demeure accessible. Aucun compte distant, aucune copie invitée ni sauvegarde de conflit n’est supprimé par ce nettoyage.

Si le disque est plein, une nouvelle modification peut rester seulement en mémoire jusqu’au succès du réessai : garder la page ouverte, libérer de l’espace ou télécharger la copie. La déconnexion vérifie d’abord la durabilité ; la fermeture du navigateur affiche un avertissement lorsque celui-ci le permet. Un arrêt forcé du téléphone ne peut pas être empêché.

## Vérifications réalisées

207 tests automatisés réussis (ensemble V1 et correctif), build de production réussi.

- 20, 100 et 500 produits : aller-retour du cache, modification d’un seul enregistrement, photo partagée stockée une seule fois.
- Imports de 100 et 500 produits et rechargement.
- 21 produits invités avec localStorage saturé : import, conservation des lignes distantes et de la copie invitée, répétition sans doublons.
- `QuotaExceededError` injectée dans une écriture IndexedDB : transaction annulée intégralement, original conservé, reprise réussie.
- Quota pendant une modification connectée : aucune mutation serveur avant cache durable, reprise sans doublon.
- Snapshots d’inspiration, plusieurs photos de journal, couleurs et notes conservés.
- File hors ligne restaurée après rechargement, comptes/espaces isolés localement, conflit entre onglets, sauvegarde avant rechargement distant explicite.
- Transfert de l’ancien cache réussi et transfert échoué sans perte.
- Requêtes de mise à jour de journal sans base64 dans leurs filtres ; lecture distante de 501 produits par deux pages.

Ces tests utilisent fake-indexeddb et un backend simulé pour les scénarios d’écriture. Ils ne remplacent pas une recette RLS entre comptes réels ni une recette sur téléphone.

## Limites et suite

- Cette correction vise le cache connecté. La copie invitée historique dans localStorage est volontairement conservée pour éviter toute perte ; le mode invité existant n’est pas réécrit dans ce correctif.
- Les photos ne sont plus dupliquées en base64 dans le localStorage du compte. Les anciens snapshots Supabase peuvent encore contenir des data-URL. La migration vers Storage privé reste un chantier Phase 12B non activé : téléverser sous des chemins propriétaire/espace, conserver seulement chemin/métadonnées, signer les accès après autorisation, vérifier le transfert avant de retirer le contenu ancien. Aucune URL publique ni suppression de photo ajoutée ici.
- Les Blobs inutilisés ne sont pas purgés automatiquement ; le nettoyage explicite retire le cache actif sans toucher aux sauvegardes ni aux opérations en attente.
- À valider sur le téléphone concerné : recharger le site, se connecter, importer les 21 éléments, vérifier collection/journal/photos, fermer puis rouvrir et retrouver les données.
- La Phase 12B et les tests réels multi-compte/multi-navigateur ne sont pas déclarés terminés. Aucune Phase 13 lancée.
