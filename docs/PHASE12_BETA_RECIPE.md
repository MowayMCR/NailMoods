# Phase 12 — recette bêta média / profils

## Version frontend

La correction est disponible sur la branche `phase12b/privacy-identity-preparation`, commit `18b0ef4` puis les commits de recette suivants. Aucune URL de preview publique n’est disponible : le workflow GitHub Pages actuel ne déploie que `main`, et créer une seconde URL Pages remplacerait la production au lieu de l’isoler.

La branche utilise le projet Supabase `rvqmtnqvzzxzwfxfyjcg`, donc elle ne constitue pas un environnement backend isolé. Ne pas l’utiliser avec des comptes bêta réels avant d’avoir confirmé cette configuration.

Preview locale :

```bash
npm ci
VITE_SUPABASE_URL=https://rvqmtnqvzzxzwfxfyjcg.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=<clé-publique> \
npm run dev -- --host 0.0.0.0
```

## Checklist A/B

### Compte A

1. Se connecter.
2. Créer une pose avec photo réelle, titre, mood et visibilité **Privé**.
3. Actualiser la page.
4. Se déconnecter puis se reconnecter.
5. Vérifier la photo et l’état privé.
6. Passer la pose en **Public**.

### Compte B

7. Rechercher A par `@NailMoodsID`.
8. Ouvrir le profil public.
9. Vérifier que la pose et son média public apparaissent.
10. Vérifier qu’aucune pose privée n’apparaît.

### Retour privé

11. Depuis A, repasser la pose en **Privé**.
12. Depuis B, actualiser et relancer la recherche/profil.
13. Vérifier que la pose disparaît.
14. Tester l’ancienne URL publique, si elle a été récupérée : elle doit être refusée par le bucket privé et la route contrôlée.

Répéter avec deux contextes indépendants (téléphone + navigateur privé ou deux appareils). Ne jamais transmettre de mot de passe ou de jeton dans un ticket ou une conversation.

## Migration média historique

Depuis le compte propriétaire, ouvrir Profil → Mon compte. Le panneau « Médias historiques » affiche `détectés / migrés / échecs / restants` et permet de relancer la migration. Le résultat attendu est `1 / 1 / 0 / 0`. Une erreur conserve l’ancienne représentation.

## Rollback

Le frontend peut être remis sur le commit précédent de la branche de préparation. Les migrations Supabase et les Edge Functions sont additives ; ne pas supprimer l’original privé ni la table `media_cleanup_jobs`. Toute restauration du frontend doit conserver la route `media-read` tant que des publications existent.
