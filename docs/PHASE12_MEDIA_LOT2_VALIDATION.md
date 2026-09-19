# Phase 12 — Validation médias / Lot 2

## État

La chaîne applicative est raccordée et testée localement. Les fonctions sociales ne sont pas publiées sur le site principal. La recette UI multi-comptes reste **BLOCKED** ; la migration du média historique est **NOT RUN**.

## Schéma et migrations

- Projet Supabase : `rvqmtnqvzzxzwfxfyjcg`.
- Migration `phase12_private_media_storage` appliquée : bucket privé `nailmoods-private`, limite 5 Mo, JPG/PNG/WebP et policies Storage par propriétaire.
- Migration `phase12_media_visibility_public_profile` appliquée : `visibility`, `media_path`, `public_media_path` sur les contenus concernés, bucket `nailmoods-public` et RPC `get_public_profile(text)`.
- Les tables métier existantes n’ont pas été recréées et la RLS n’a pas été désactivée.
- Migration complémentaire `phase12_media_revocation_and_cleanup` puis `phase12_private_media_helpers` : bucket public repassé privé, lecture directe supprimée, contrôle du workspace et du lien avec la ligne métier, jobs persistants de nettoyage et triggers public → privé.
- Edge Functions déployées : `media-read` v3 (lecture contrôlée sans redirection Storage) et `media-cleanup` v2 (worker protégé par secret, jusqu’à 5 tentatives avec backoff).

## Stratégie média

Les originaux et les copies publiées restent dans des buckets privés. Une publication explicite crée une copie dans `nailmoods-public`, mais cette copie n’est plus lisible directement : `media-read` retrouve la ligne métier, vérifie la visibilité et le workspace, puis renvoie les octets avec `Cache-Control: private, no-store`, sans redirection. Repasser un journal en privé retire la référence publique et crée une tâche de nettoyage persistante ; même si le nettoyage échoue, une nouvelle demande média est refusée par la route.

Le cache connecté utilise IndexedDB pour les blobs temporaires. `localStorage` ne reçoit plus la copie complète du compte. PostgreSQL ne reçoit que des chemins Storage et des métadonnées, jamais une photo base64.

## Migration non destructive

La routine `migrateMedia()` inspecte les entrées de journal et les inspirations, conserve l’ancienne représentation tant que l’upload n’est pas confirmé, puis expose `{detected, migrated, failed, remaining}`. Les avatars peuvent suivre le même chemin Storage privé ; aucun média existant n’a été supprimé automatiquement pendant cette passe.

Inventaire Supabase effectué : 1 entrée de journal contient encore une ancienne représentation photo (référence `photo_url` et snapshot historique), 0 inspiration et 0 avatar ne portent actuellement de média. Cette entrée est comptée comme restant à migrer ; son transfert doit être exécuté dans une session authentifiée du propriétaire afin de pouvoir uploader dans le bucket privé.

## Tests

- **230 tests automatisés passés, 0 échec, 1 test d’intégration marqué skipped faute d’environnement de recette** (231 tests comptés).
- Couverture ajoutée : upload avant écriture distante, absence de base64 dans la ligne envoyée, migration non destructive, migration d’inspiration, retour public → privé avec suppression de la copie publique, quotas IndexedDB/localStorage, cache multi-compte et reprise de queue.
- Le test opt-in A/B est livré dans `tests/media-integration.test.js` avec sa procédure dans `docs/PHASE12_MEDIA_INTEGRATION.md`.
- Build de production réussi (`npm run build`).

## Tests réels encore requis avant validation finale

Le scénario complet avec deux comptes réels, téléphone et second navigateur n’a pas été exécuté depuis cette session. Il reste à vérifier sur Supabase : upload A, refresh/reconnexion, accès B refusé au privé, publication visible par B, repassage en privé immédiatement invisible, ancienne URL, puis conservation chez A. L’inventaire serveur signale actuellement 1 média historique restant à migrer ; le compteur applicatif à produire après connexion du propriétaire est : détectés / migrés / échoués / restants.

## Limites et dette connue

- La récupération publique passe par la RPC sécurisée et `media-read`; il faut encore effectuer le test backend multi-comptes et confirmer les URLs signées en conditions réelles.
- Le secret de déclenchement du worker `media-cleanup` doit être configuré côté Edge Function/cron avant ouverture large ; il n’est pas présent dans le dépôt.
- L’avertissement Supabase sur la protection contre les mots de passe compromis reste documenté et doit être activé avant une ouverture publique large, selon les capacités du plan.
- Aucun feed, favoris social ou messagerie n’est développé/poussé dans cette étape.
