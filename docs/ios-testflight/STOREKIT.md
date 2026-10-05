# StoreKit — état et recette avant activation

## Architecture livrée

| Couche | Implémentation / preuve |
|---|---|
| Plugin Apple natif | `ios/App/App/NailMoodsStoreKitPlugin.swift`, StoreKit 2 ; produits, achat, restauration, unfinished transactions, gestion d'abonnement |
| Client | `src/cloud/appleBilling.js`, `AppleBillingPanel.jsx`, `BillingSync.jsx` ; fournisseur Apple sur iOS, prix/périodes StoreKit et liens légaux |
| Liaison au compte | UUID `appAccountToken`, généré serveur, transmis à StoreKit puis comparé à la transaction Apple vérifiée |
| Validation | Edge `apple-verify`, bibliothèque officielle Apple 3.1.0, vérification JWS puis App Store Server API ; aucune confiance dans un niveau envoyé par le client |
| Cycle hors app | Edge `apple-notifications` V2, transaction + renouvellement signés ; réconciliation cron toutes les 5 min via nonce éphémère |
| Droits | Ledger Apple séparé, calcul serveur Free/Plus/Pro à partir des sources manuelle/Google/Apple ; IA+ indépendant |
| Finition | Transaction finie seulement après réponse serveur vérifiée et enregistrée |
| Anti-double achat | Achat bloqué quand un droit manuel prioritaire ou un abonnement de l'autre fournisseur existe ; groupe Apple unique pour Plus/Pro |

État réel contrôlé le 5 octobre : migrations Apple et cron déjà présents ; fonctions Apple déployées par cette mission (version 1) ; **Apple enabled=false, zéro abonnement Apple enregistré, reconcile_url non configurée**. Le serveur achats n'est pas déclaré validé en Sandbox. Contrôles sans session : apple-verify HTTP 401 ; fausse notification HTTP 400. Ils prouvent le refus de ces requêtes, pas la réussite d'une transaction Apple.

Produits attendus : `nailmoods_plus`, `nailmoods_pro`. Si des IDs Apple différents existent déjà, adapter les trois couches (Swift, JS, contrainte SQL) ensemble. Groupe unique NailMoods, Pro niveau 1 et Plus niveau 2. Durée/prix décidés dans Connect. Pas de promotions arbitraires, d'« illimité » ajouté, de multiseat ou de SKU IA+. Les droits manuels Plus/Pro sont conservés lors d'une absence/expiration/restauration Apple ; ne pas les supprimer pour faire fonctionner les tests.

## Activation Sandbox limitée, après secrets et produits

La recette utilise un **compte NailMoods Free jetable confirmé, adulte, non staff, sans droit offert**. Les mots de passe et identifiants Apple restent hors chat. L'app TestFlight utilise Sandbox. Le secret Supabase `APPLE_ENVIRONMENTS` doit être **Sandbox uniquement** avant d'exécuter le SQL. Les comptes avec accès offert ne peuvent pas servir au premier achat : cette protection est voulue.

Supabase → SQL Editor, rôle propriétaire. Remplacer la seule adresse ci-dessous par l'email du compte de test créé par Marie. Le script refuse l'adresse fictive ou un compte absent/non confirmé. Il ne modifie aucun droit manuel et ne crée aucun utilisateur.

```sql
begin;
do $$
declare
  test_email text := 'REMPLACER-PAR-EMAIL-DU-COMPTE-TEST';
  test_user uuid;
begin
  if test_email = 'REMPLACER-PAR-EMAIL-DU-COMPTE-TEST' then
    raise exception 'Remplacer l’adresse par celle du compte Free de test';
  end if;
  select id into test_user from auth.users
    where lower(email)=lower(test_email) and email_confirmed_at is not null;
  if test_user is null then raise exception 'Compte confirmé introuvable'; end if;
  insert into private.apple_account_tokens(user_id,sandbox_enabled)
    values(test_user,true)
    on conflict(user_id) do update set sandbox_enabled=true;
  update private.apple_settings set enabled=true,
    reconcile_url='https://rvqmtnqvzzxzwfxfyjcg.supabase.co/functions/v1/apple-verify'
    where singleton;
end $$;
commit;
```

Le serveur vérifie aussi majorité/CGU, suspension et éligibilité lors de `prepare`. La production reste indisponible tant que le serveur n'autorise que Sandbox. N'ajoute Production qu'après tests concluants et décision d'ouverture, avec `APPLE_APP_ID` exact. Les secrets figurent dans `GUIDE-MARIE.md` ; ils ne se mettent pas dans ce SQL.

## Matrice d'essais réels

| Essai | Résultat attendu | Preuve à conserver |
|---|---|---|
| Produits | Prix et durée localisés identiques à la feuille de confirmation Apple | Capture offre + build ; pas d'invention si produit absent |
| Achat Plus Free | Confirmation Sandbox, serveur Plus, transaction finie après succès | Product ID, état et dates ; identifiants transaction privés si journal de test interne |
| Achat Pro Free | Pro depuis serveur | Capture des fonctions Pro et état serveur |
| Annulation / pending | Pas de nouveau droit ; message lisible | Capture sans données sensibles |
| Serveur indisponible | Pas de droit gratuit client ; achat non fini et reprise possible | Échec contrôlé puis restauration après retour réseau |
| Upgrade Plus → Pro | Modalités Apple, nouveau droit Pro cohérent ; pas de double souscription | État Apple et serveur |
| Downgrade Pro → Plus | Selon calendrier Apple, conservation du droit payé jusqu'au changement | Dates avant/après renouvellement Sandbox |
| Restaurer même Apple ID + même compte | Mon offre → Restaurer mes achats ; droit restitué depuis serveur | Résultat et réinstallation/changement d'appareil |
| Même Apple ID + autre compte NailMoods | Refus de réaffectation ; aucun droit accordé au second compte | Message d'erreur et niveau inchangé |
| Droit Plus/Pro offert | Aucune souscription nécessaire ; absence/expiration/restauration Apple ne réduit pas le droit offert | Niveau/dates du droit manuel avant/après |
| Expiration / révocation / refund | Seul le droit Apple cesse ; accès payé jusqu'à sa date valide ; autres sources préservées | Notification vérifiée et droit calculé |
| Grâce / billing retry | Grâce selon statut/dates Apple ; retry seul ne vaut pas accès indéfini | Statut normalisé et expiration |
| App fermée | Notification V2 traite le changement ; cron récupère un événement manqué | Notification TEST 200, renouvellement réel Sandbox, observation serveur après cron |
| Suppression compte | Token/ledger en cascade ; aucune recréation du compte par renouvellement | Compte jetable supprimé puis notification ignorée/unlinked |

Un mock ne remplace aucun de ces essais. Les deux tests d'intégration optionnels ignorés ne sont pas un succès. Ne pas activer Production simplement parce que la compilation iOS est verte.

## Fermer les achats / retour arrière serveur

```sql
update private.apple_settings set enabled=false where singleton;
```

Cette fermeture interdit les nouvelles validations/achats via ce flag ; elle n'efface aucun achat ni droit manuel. Les droits Apple déjà enregistrés restent calculés selon leurs dates, de sorte qu'un arrêt de la passerelle ne supprime pas arbitrairement un accès payé. Garder les notifications/réconciliation disponibles selon la procédure d'incident avant une ouverture commerciale. Aucun secret ou migration d'entitlements ne se supprime pour un rollback d'interface.
