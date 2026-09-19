# Test d’intégration média A/B

Le test réel est opt-in et ne crée aucun compte. Il exige un projet Supabase de recette distinct du projet principal, deux comptes fixtures déjà créés et les variables suivantes :

```bash
NM_MEDIA_TEST_URL=https://<projet-recette>.supabase.co \
NM_MEDIA_TEST_ANON_KEY=<clé-publique> \
NM_MEDIA_TEST_PROJECT_REF=<ref-projet-recette> \
NM_MEDIA_TEST_A_EMAIL=<compte-a> \
NM_MEDIA_TEST_A_PASSWORD=<mot-de-passe-a> \
NM_MEDIA_TEST_B_EMAIL=<compte-b> \
NM_MEDIA_TEST_B_PASSWORD=<mot-de-passe-b> \
npm test -- tests/media-integration.test.js
```

Le garde-fou refuse explicitement `rvqmtnqvzzxzwfxfyjcg`. Le test utilise les sessions ordinaires A/B et un client anonyme ; aucune clé `service_role` ne doit être fournie. Il vérifie upload privé, lecture A, refus B/anon, publication contrôlée, révocation immédiate, conservation du privé et échec d’accès direct au bucket public.

Sans ces prérequis, le résultat est **NOT RUN / BLOCKED**, jamais PASS ou FAIL.
