# Architecture Apple / Google / manuel

## Produits et groupe

| Offre | Product ID immuable | Groupe | Niveau recommandé | Durée initiale proposée |
|---|---|---|---|---|
| Plus | nailmoods_plus | NailMoods | 2 | 1 mois, à valider par Marie |
| Pro | nailmoods_pro | NailMoods | 1, supérieur | 1 mois, à valider par Marie |
| Free | aucun | aucun | aucun | gratuit |

Les IDs demandés sont acceptables ; aucun renommage n’est nécessaire. Une durée se configure par produit Apple, contrairement aux base plans Google. Ajouter un tarif annuel ultérieur nécessite de nouveaux produits et un mapping explicite : ne pas réutiliser ces IDs pour plusieurs durées simultanées. Les prix ne sont pas décidés dans le code. Le paywall utilise `Product.displayPrice` et la période retournée par StoreKit.

## Fonctionnement

`BillingPanel` et `BillingSync` choisissent le fournisseur selon la plateforme. Android garde son plugin Java Google et ses API existantes. iOS enregistre `NailMoodsStoreKitPlugin` dans `NailMoodsViewController`, également utilisé par SceneDelegate. Aucun SDK de paiement externe n’est chargé sur iOS.

`purchase(.appAccountToken(UUID))` utilise un UUID aléatoire créé côté serveur, distinct de l’email et de l’UUID Supabase. La réussite locale n’ouvre aucun accès. `apple-verify` vérifie le JWS avec la bibliothèque officielle Apple, appelle App Store Server API, vérifie les transactions et renouvellements signés et persiste les droits. La transaction n’est finie qu’après cette livraison serveur. Une panne laisse la transaction récupérable par `Transaction.unfinished`.

`Transaction.updates`, l’ouverture et le retour au premier plan déclenchent une nouvelle vérification. Restaurer appelle `AppStore.sync()` uniquement sur action de l’utilisatrice, puis les entitlements Apple. Gérer ouvre `AppStore.showManageSubscriptions(in:)`. Le serveur reçoit les notifications V2 indépendamment de la session utilisateur. Il recharge l’état courant Apple, ce qui empêche un ancien événement d’annuler un upgrade/remboursement récent. Les timestamps protègent les écritures concurrentes/répétées.

Le cron toutes les cinq minutes met à jour les projections expirées, puis vérifie un lot de dix abonnements par ancienneté de vérification. Il utilise un nonce aléatoire à usage unique valable deux minutes ; seule son empreinte reste dans la base privée. Pas de secret permanent dans la queue pg_net, pas de JWS ou contenu personnel dans les réponses/logs applicatifs.

## États

| État Apple | Droit calculé |
|---|---|
| Actif | jusqu’à expiresDate vérifiée |
| Renouvellement désactivé | `canceled`, accès jusqu’à expiration |
| Grâce | jusqu’à gracePeriodExpiresDate vérifiée |
| Billing retry sans grâce | pas d’accès Apple supplémentaire |
| Pending / annulé à l’achat | aucun nouveau droit |
| Expiré | aucun droit Apple |
| Remboursé / révoqué / transaction remplacée | aucun droit depuis cette transaction |
| Upgrade/downgrade | produit courant retourné par Apple, pas le produit voulu par le client |

## Droits et provenance

`private.account_entitlements` conserve les sources manuelles existantes `admin`, `beta_self_selection`, `legacy`, `beta_invitation`, exposées comme `manual_beta`. `private.google_play_subscriptions` garde sa provenance Google. `private.apple_subscriptions` ajoute `apple_app_store`, produit, tier, statut, dates, auto-renouvellement, environnement, transaction, original transaction, signature et dernière vérification. Il n’existe aucun chemin client pour écrire ces tables ou activer Sandbox.

`private.effective_tier()` prend le niveau maximal valide. Un Pro manuel reste Pro lorsque Apple expire. Un Plus manuel reste au moins Plus ; un Pro payant valide peut apporter Pro temporairement sans supprimer le Plus manuel. Les mineurs déclarés 15–17 conservent la restriction existante. Le droit manuel peut avoir sa propre expiration, sans reçu.

Un Google valide donne accès sur iPhone et un Apple valide sur Android. Le serveur empêche la proposition d’un deuxième fournisseur. iOS affiche simplement « offre déjà active », sans lien d’achat Google/web. Les codes d’invitation et la sélection libre de tier ne sont plus proposés dans le panneau d’offre iOS ; les grants manuels existants restent valides.

## Déploiement contrôlé

1. Sauvegarder les fonctions/DDL existantes et relever les versions de migrations des deux projets. Recette : `pueqkbwfwxgqzmkauxoz` ; Production : `rvqmtnqvzzxzwfxfyjcg`.
2. Appliquer les nouvelles migrations dans l’ordre chronologique, après les migrations Google de la branche de référence. Les settings Apple restent désactivés par défaut.
3. Déployer `apple-verify`, `apple-notifications` et `moderation-preview` avec leurs `_shared` et `deno.json`. `verify_jwt=false` est nécessaire pour le webhook Apple et les nonces cron ; les requêtes utilisatrices vérifient le JWT via Auth.getUser. Le preview exige aussi le rôle staff.
4. Installer les secrets selon `APPLE_SECRETS_REQUIRED.md`, puis configurer uniquement le projet choisi :

```sql
update private.apple_settings set enabled=true,
 reconcile_url='https://<PROJECT_REF>.supabase.co/functions/v1/apple-verify' where singleton;
```

5. Créer/confirmer les comptes de test, lancer une préparation Apple connectée pour créer leur mapping, puis autoriser Sandbox côté administrateur seulement :

```sql
update private.apple_account_tokens set sandbox_enabled=true where user_id='<UUID_COMPTE_TEST>';
```

6. Configurer les URL V2 dans Apple, envoyer une notification TEST et tester une vraie souscription Sandbox. Une notification forgée doit être rejetée.
7. Vérifier la ligne serveur, la projection du profil et l’accès réel avant de considérer le billing utilisable. Le nombre de lots/fréquence devra être ajusté si le nombre d’abonnements dépasse la capacité du cron.
8. Avant Production, déployer les textes et clients web/Android compatibles avec les nouvelles versions de consentement ; une photo publique importée devient en attente de revue et les anciennes photos publiques entrent aussi dans cette file. Ne pas lancer cette migration sans staff opérationnel.

Ne jamais activer Family Sharing ou Streamlined Purchasing pour cette première version : l’achat doit se faire depuis un compte NailMoods connecté afin de fournir appAccountToken. Le mapping des achats sans token n’est pas implémenté. Les abonnements ne sont pas promus sur la fiche Store.

## Limites à vérifier réellement

La bibliothèque Node Apple est importée dans l’Edge runtime Deno. Le rejet cryptographique d’un JWS forgé est testé localement ; une vérification positive avec révocation de certificats en ligne nécessite Apple Sandbox. Le cold start, OCSP, latence et timeouts doivent être surveillés avant lancement. Le cron ne remplace pas les notifications V2 ; en cas de panne prolongée, tester la reprise et l’historique de notifications Apple. Réinstaller et se reconnecter au même compte restaure le mapping. Une suppression du compte efface ce mapping ; une restauration sur un nouveau compte n’est pas une réattribution automatique.

Sources : [StoreKit](https://developer.apple.com/documentation/storekit), [App Store Server Library officielle](https://github.com/apple/app-store-server-library-node), [groupes/niveaux](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/).
