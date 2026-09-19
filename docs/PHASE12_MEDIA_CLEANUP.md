# Media cleanup — configuration opérateur

`media-cleanup` est déployée avec `verify_jwt=true` et exige un secret d’exécution séparé :

```text
MEDIA_CLEANUP_SECRET=<valeur aléatoire conservée dans les secrets Supabase>
```

La valeur ne doit jamais être commitée, affichée dans l’interface ou transmise dans un ticket. Le déclencheur serveur/cron doit envoyer cette valeur dans `x-cleanup-secret`. Sans ce secret, le worker répond `403` et aucune suppression n’est tentée : les jobs restent persistants dans `media_cleanup_jobs`.

Traitement : 25 jobs maximum par passe, statut `processing`, puis `done` ou `pending/failed`, jusqu’à 5 tentatives avec délai progressif plafonné à 24 h. La confidentialité ne dépend pas de ce worker : `media-read` vérifie toujours la visibilité actuelle et refuse une pose privée, même si la copie publique n’a pas encore été nettoyée.

La configuration du secret et du cron reste **BLOCKED** depuis cette session : l’outil Supabase disponible permet de déployer la fonction, mais pas de renseigner les secrets Edge/cron. Elle doit être effectuée dans le gestionnaire Secrets Supabase ou via la CLI autorisée du projet.
