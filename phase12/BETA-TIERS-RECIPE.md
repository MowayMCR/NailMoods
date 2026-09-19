# Niveaux de recette — 19 septembre 2026

## État de livraison

Préparation sur `phase12b/privacy-identity-preparation`, sans déploiement.
Migration `phase12/beta-account-tiers.sql` **NOT RUN** : non appliquée au projet
partagé de production `rvqmtnqvzzxzwfxfyjcg`. Aucun compte réel promu ou créé.
Le mode n'est pas activé dans le build de production : flag absent par défaut.
Ce lot n'est **pas validé en conditions réelles**.

## Source de vérité et autorisations

`public.profiles.account_tier` reste l'unique niveau : `free | plus | pro`.
`private.beta_tier_testers` contient seulement les autorisations temporaires de
recette, pas une deuxième copie du niveau. Aucun compte inscrit par défaut.
`private.beta_tier_events` journalise les changements effectifs.

La RPC `apply_beta_tier(p_tier)` utilise `auth.uid()`, sans paramètre userId,
vérifie l'autorisation non expirée et verrouille les lignes pendant le changement.
Une migration échoue si `authenticated` peut déjà modifier directement le tier.
La permission ne provient ni de localStorage ni des métadonnées modifiables Auth.
Les administrateurs/bêta managers doivent eux aussi être explicitement autorisés.

Les policies RESTRICTIVE ajoutent une condition aux policies d'appartenance
existantes : elles ne donnent aucun droit supplémentaire. Écritures personnelles
réservées à Plus/Pro, écritures `pro_profiles` réservées à Pro. Des triggers
INSERT/UPDATE vérifient également les écritures dans les espaces professionnels,
y compris via les RPC SECURITY DEFINER. Les lectures/export des données propres
sont conservées après downgrade. Aucun changement de tier ne supprime de ligne.
Les suppressions de compte et sorties d'Institut doivent rester possibles :
elles ne sont pas assimilées à un achat de fonction Pro.

## Matrice de cette préparation

| Fonction | Free | Plus | Pro |
|---|---|---|---|
| Accueil, compte, confidentialité | Oui | Oui | Oui |
| Inspire-moi, Scan & Génère | Aperçu/génération sans sauvegarde | Oui | Oui |
| Collection et journal dans l'interface | Onglets visibles, message Plus | Oui | Oui |
| Sauvegarde inspirations/favoris/poses guidées | Message Plus | Oui | Oui |
| Données personnelles antérieures | Conservées, lecture/export autorisés | Conservées | Conservées |
| Écritures personnelles en DB | Refus | Selon RLS propriétaire | Selon RLS propriétaire |
| Écritures profil/espaces Pro | Refus | Refus | Selon RLS et appartenance |
| Cycle Institut existant | Sorties/sécurité conservées | Sorties/sécurité conservées | Droits et entitlement existants |
| Feed, messagerie, notifications | Non développés dans ce lot | Idem | Idem |

Les offres commerciales ne sont pas définies par cette matrice.
Le changement de tier ne crée pas automatiquement un espace Pro et ne donne pas
une appartenance à un Institut. L'application charge actuellement l'espace
personnel ; le parcours Pro complet n'est donc pas attesté par ce lot.

## Mise en recette isolée

1. Fournir un projet Supabase de recette avec les migrations précédentes.
2. Appliquer `phase12/beta-account-tiers.sql` dans ce projet uniquement.
3. Créer via Auth des comptes jetables A, B, C ; attendre profils/workspaces du
   trigger. Prévoir aussi un compte D ordinaire pour les tests de refus.
4. Inscrire A/B/C dans la liste depuis un accès administrateur de recette :

```sql
-- Remplacer les UUID uniquement par ceux des fixtures confirmées.
insert into private.beta_tier_testers(user_id, expires_at)
values ('<UUID_FIXTURE>', now() + interval '7 days');
```

5. Construire le frontend avec les variables publiques du backend isolé et
   `VITE_BETA_ACCOUNT_TIERS=true`. Aucun secret/service_role dans le frontend.
6. Mon profil → Mon compte → Type de compte — mode bêta. A choisit Plus,
   B Pro, C Free. Le compte D ne voit pas le sélecteur.
7. Utiliser trois navigateurs/profils indépendants. Vérifier les onglets,
   sauvegardes, refus et seconde connexion. Depuis C faire Free → Plus → Pro
   → Free : les éléments créés doivent réapparaître après retour Plus.
8. Tester aussi les appels directs avec D et la modification des valeurs locales.

Le sélecteur vide d'abord la queue de modifications : en cas d'échec de
synchronisation, le changement est refusé pour ne pas laisser de brouillons
inaccessibles. Le rechargement serveur recalcule le tier sans sacrifier les
brouillons existants. Une modification depuis un autre appareil est effective
immédiatement côté serveur ; l'interface se met à jour au refresh/reconnexion
ou par « Actualiser depuis mon compte », sans polling global.

## Test backend livré

Fournir via l'environnement sécurisé (jamais dans le dépôt) :
`NM_TIER_TEST_URL`, `NM_TIER_TEST_PROJECT_REF`, `NM_TIER_TEST_ANON_KEY`,
`NM_TIER_TEST_A_EMAIL`, `NM_TIER_TEST_A_PASSWORD`, les équivalents B et C.
Pour ce test automatisé, **C est le compte ordinaire non autorisé**, contrairement
au C temporairement autorisé dans la recette manuelle ci-dessus. A autorisé,
B initialisé Pro. Utiliser uniquement des fixtures jetables.

```sh
NM_TIER_TEST_RUN=isolated-fixtures node --test tests/beta-tier-integration.test.js
```

Le test refuse l'hôte de production, ne crée aucun utilisateur, emploie les
sessions ordinaires et restaure le tier initial d'A. Il couvre les transitions,
le refus d'auto-promotion, l'écriture Free refusée, le downgrade conservant un
produit, une nouvelle session et l'isolation A/B. Il ne remplace pas la recette
UI ni un test positif complet de toutes les fonctions Pro.

## Résultats et limites

- **PASS** : 235 tests automatisés ; build avec flag bêta activé.
- **BLOCKED** : tests backend réels média et tiers, faute d'environnement isolé
  et de fixtures. Le runner les compte comme 2 tests ignorés (237 au total).
- **NOT RUN** : recette visuelle A/B/C, téléphone, droits Pro complets,
  reconnexion réelle, déploiement migration et preview.
- Limite : SQL préparé mais non exécuté, donc aucune garantie de déploiement SQL
  ni affirmation de droits RLS réellement validés pour cette nouvelle migration.
- Limite : le flag frontend ne constitue jamais une sécurité ; les policies
  doivent être installées avant toute activation de ce mode sur la recette.
- Les droits Storage existants sont inchangés. Le tier limite la sauvegarde
  métier, pas à lui seul tous les uploads temporaires/avatar. Aucun élargissement.
- L'import invité d'un compte Free doit être effectué après passage Plus ; le
  backend refuse ses écritures. Tester ce parcours avant activation générale.
- Une erreur de test peut laisser une fixture : contrôler le nettoyage avant
  réutilisation de l'environnement, ne jamais employer un compte personnel.
- Build : avertissement existant sur certains bundles > 500 ko.

## Retour arrière

Désactiver le flag et reconstruire uniquement la preview. Sur le backend isolé,
révoquer les autorisations en supprimant les lignes `private.beta_tier_testers`.
Cela ne change pas les tiers déjà enregistrés : les remettre administrativement
aux valeurs voulues si nécessaire. Ne pas supprimer les données personnelles.
Ne pas appliquer ni retirer des policies sur le backend de production dans ce lot.

Pas de paiement, abonnement, publication principale ou nouvelle fonction sociale.
