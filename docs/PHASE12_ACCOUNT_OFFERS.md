# Phase 12 — choix Free / Plus / Pro

## Comportement livré

- Le choix est proposé pendant l'inscription puis dans `Profil → Mon offre`.
- Un compte Pro accède ensuite au choix métier déjà existant : indépendante,
  propriétaire d'institut ou collaboratrice.
- Le choix bêta est modifiable et n'entraîne aucun paiement.
- Un changement ou une future expiration ne supprime aucune donnée.
- Les comptes antérieurs doivent confirmer les CGU `0.1-beta` et avoir 18 ans
  avant leur premier changement d'offre.

## Sécurité et données

- `profiles.account_tier` reste le niveau effectif lu par l'application.
- `private.account_entitlements` conserve le niveau, la provenance et prépare
  une future source `subscription` sans faire confiance au bouton du client.
- `private.account_tier_selection_events` est un journal minimal des changements.
- `private.account_offer_settings` permet de fermer la sélection bêta côté
  serveur sans redéployer le frontend.
- Le navigateur ne possède aucun droit `UPDATE` direct sur
  `profiles.account_tier` et aucun accès aux tables privées.
- Seules `account_offer_state()` et `choose_beta_account_tier(text)` sont
  exécutables par un utilisateur authentifié. La RPC vérifie le niveau,
  l'acceptation des CGU et la confirmation 18+.
- Le trigger `sync_profile_account_entitlement` couvre les nouveaux comptes et
  les futurs changements administratifs.

## Environnements

- Recette : migrations `phase12_account_offer_selection` et
  `phase12_account_entitlement_sync` appliquées au projet
  `pueqkbwfwxgqzmkauxoz`.
- Production : mêmes migrations appliquées au projet
  `rvqmtnqvzzxzwfxfyjcg` après les tests Recette.
- Les quatre comptes Production existants sont restés Free ; aucun compte n'a
  été modifié automatiquement et aucun événement de sélection n'a été créé.

## Vérifications

- Suite locale : 249 PASS, 0 FAIL, 2 intégrations optionnelles SKIPPED avant le
  dernier ajout documentaire.
- Build Production et build Recette : PASS.
- Runner backend Recette : 93 PASS, 0 FAIL, avec choix contrôlé
  Free → Plus → Free par un compte ordinaire et refus de l'UPDATE direct.
- Production après migration : 4 utilisateurs, 4 profils, 4 entitlements Free
  de provenance legacy, 0 événement de sélection, RLS privée active et droits
  directs sur `account_tier` absents.

## Limites

- La sélection est gratuite pendant la bêta. Paiement, renouvellement et date
  d'expiration relèvent d'un lot ultérieur ; le modèle d'entitlement est prêt.
- La recette visuelle automatisée 360 px n'a pas pu être exécutée dans le
  runtime de travail faute de binaire Chromium. Le build et les règles CSS
  responsive sont validés ; la vérification sur téléphone réel reste à faire.
- Le sélecteur historique réservé aux fixtures de Recette reste présent dans
  le code pour les tests serveur, mais n'est plus l'interface proposée aux
  utilisatrices.
