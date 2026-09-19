# NailMoods — Préparation Phase 12C : offres et abonnements

Ne pas lancer tant que 12B n’est pas validée.

## Objectif
Relier l’interface Free / Plus / Pro à de vrais droits serveur (entitlements) et aux achats par plateforme.

## Principes
- Le frontend ne change jamais account_tier tout seul.
- Paiement réussi ≠ droit accordé tant que le backend n’a pas validé la transaction.
- Données conservées après expiration d’abonnement ; fonctionnalités premium deviennent limitées, jamais supprimées.
- Plus et Pro restent sans publicité.
- Un espace Institut conserve ses données si l’abonnement expire, mais les actions Pro peuvent être verrouillées.

## Écran offres
Comparer Free / Plus / Pro sans dark pattern.
Prix et périodicité configurables, pas codés en dur.
Pour Pro : PO indépendante / Institut / Créateur-Marque.

## Paiement par plateforme
- Web : fournisseur de paiement web à choisir.
- Android : Google Play Billing pour abonnements numériques dans l’app.
- iOS : Apple In-App Purchase.
- Prévoir restauration des achats et changement d’appareil.

## Entitlements
Créer une source serveur distincte du profil :
- plan ;
- statut ;
- période ;
- provider ;
- product_id ;
- valid_until ;
- seat_limit pour Institut ;
- cancellation state.
Ne jamais se fier à localStorage.

## Cas d’expiration
Plus → Free : garder collection/journal/sauvegardes ; limiter les fonctions premium.
Pro → Free/Plus : garder workspace Pro mais le passer en lecture/gestion limitée selon règle produit.
Institut : ne jamais supprimer automatiquement les membres ou la collection.

## Tests
Achat, restauration, renouvellement, annulation, expiration, remboursement, changement de plateforme, double notification fournisseur, panne réseau et rollback.
