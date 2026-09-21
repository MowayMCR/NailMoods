# NailMoods — Production et reste à faire
État au 21 septembre 2026, après autorisation explicite « Met à jour production ».

## Lot promu
Application issue de la Recette v31, source `529a785b64ca8023fe06dcf4c717583d81d655c7`.
Production : https://mowaymcr.github.io/NailMoods/
Backend Production : `rvqmtnqvzzxzwfxfyjcg`. La Recette conserve sa base séparée.

- Connexions acceptées proposées directement, recherche locale par nom / identifiant, sélection PO compatible, aperçu puis confirmation.
- Partage social Plus ↔ Plus par référence révocable ; contrôle des droits à chaque lecture.
- Correction de l’upload public par insertion sur un chemin neuf ; suppression des anciennes références lors du retrait/remplacement d’une photo.
- Bouton « Reprendre les suggestions » harmonisé avec la DA.
- Inscription compatible avec le consentement de confidentialité 0.2-beta, optimisation Découvrir, lectures initiales limitées à trois en parallèle et lecture média avec délais bornés.

Les quatre migrations suivantes ont été appliquées en Production :
`phase12_signup_current_privacy_version`,
`phase12_discovery_author_scope_performance`,
`phase12_connected_private_po_recipients`,
`phase12_connected_revocable_publication_sharing`.
La fonction `media-read` version 7 est active.
Aucune donnée de Recette n’est copiée en Production. Aucun générateur de charge, compte de test, paiement ou rendu IA n’est activé en Production.

Les fichiers applicatifs, les tests associés et les quatre scripts SQL sont promus. Les comptes, résultats bruts de charge et générateurs de test restent en Recette. Le workflow GitHub Pages du commit contenant ce document constitue la preuve de publication de l’interface ; vérifier son état terminal avant d’annoncer la mise en ligne.

## Vérifications
| Contrôle | Résultat et portée |
|---|---|
| Suite applicative relancée | PASS : 294 tests, 292 réussis, 2 ignorés, aucun échec |
| Build Production | PASS : base /NailMoods/, URL Supabase Production, aucune URL Supabase Recette dans le bundle |
| Parité serveur | PASS : les 17 définitions des fonctions contrôlées ont les mêmes empreintes qu’en Recette |
| Accès sans identité | PASS : refus réel des appels destinataires, découverte et partage ; aucune écriture de données |
| API anonymes | PASS : les fonctions contrôlées n’accordent pas EXECUTE à anon ; les wrappers publics restent SECURITY INVOKER |
| Stockage | Les deux buckets restent privés ; aucune politique Storage élargie |
| Advisor sécurité | Aucune nouvelle alerte : 12 informations sur tables fermées et avertissement préexistant mots de passe compromis |
| Intégration sociale/photo | 37 contrôles API PASS réalisés en Recette avant promotion, pas rejoués avec des comptes réels de Production |
| Retour Marie | Photo publique, lecture depuis un autre compte et vue du profil ID validées |

La vérification du déploiement ne vaut pas recette complète sur deux téléphones. Les validations humaines non encore reçues restent ouvertes ci-dessous.

## Reste à faire
| Priorité / horizon | Sujet | État réel | Prochaine action |
|---|---|---|---|
| Avant clôture Phase 12 | Partage PO et Plus ↔ Plus sur deux téléphones | Développé ; API et composants testés ; validation humaine complète encore ouverte | Invitation, acceptation/refus, sélection PO, envoi, réception, réponse, notification et partage d’une publication ; vérifier retrait de connexion et Public → Privé |
| Avant clôture Phase 12 | Parcours complet d’un nouveau compte | Fonctionnel côté application ; emails et longue session à revalider | Inscription, confirmation et renvoi du mail, récupération de mot de passe, reconnexion sur un autre appareil |
| Avant clôture Phase 12 | Changement d’offre / expiration | Droits serveur testés | Essai réel Plus/Pro → Free pendant une session ; données conservées et fonctions premium verrouillées |
| Avant clôture Phase 12 | Institut multi-membres | Cycle implémenté, recette matérielle complète encore ouverte | Invitations, dernière place simultanée, retrait, départ, transfert de propriétaire et expiration Pro |
| Avant clôture Phase 12 | Réseau mobile et synchronisation | Reprise testée automatiquement ; essais matériels incomplets | Perte de réseau pendant upload, reprise, second appareil, changement de compte et absence de doublons |
| Avant ouverture sociale plus large | Blocage / signalement | Le parcours actuel permet le retrait de connexion ; blocage durable et signalement non livrés dans ce parcours | Définir puis implémenter les règles serveur, l’interface et le traitement des signalements |
| Avant ouverture publique élargie | Mentions éditeur et confidentialité | Coordonnées publiques et politique de conservation non renseignées dans editor.json | Fournir les coordonnées destinées au public, compléter les textes et valider leur version définitive |
| Avant élargissement de charge | Endurance et 50 connexions simultanées | 10/25 PASS ; 50 FAIL de latence Auth, sans erreur métier | Tester une durée plus longue et les réseaux mobiles ; investiguer Auth avant lancement groupé à 50 |
| Suivi bêta | Sécurité et performance | Avertissement Auth préexistant ; recommandations RLS/index documentées | Examiner la protection des mots de passe compromis ; traiter les optimisations selon les mesures et surveiller les premiers usages |
| Lot ultérieur | Rendu IA photoréaliste / analyse avancée de photo | Désactivé ; suggestions actuelles issues des compositions/couleurs, pas de vision distante | Valider qualité, fournisseur, coûts, quotas, consentement et droits avant activation |
| Lot commercial ultérieur | Paiements / abonnements | Non activés ; droits et registre préparatoire existants | Intégration et tests de renouvellement, expiration, annulation et paiement |
| Après stabilisation sociale | Application installable / notifications push | Hors du lot actuel | Préparer l’encapsulage mobile et les notifications push après validation Social Beta |
| Roadmap ultérieure | Catalogue officiel / comptes marques-créateurs / atelier Pro enrichi | Vision produit conservée ; pas présentée comme livrée par ce lot | Cadrer les sources officielles, la validation des références et l’alimentation par marques/créateurs |

## Charge : verdict conservé
| Utilisatrices simultanées | Verdict | Moyenne | p95 global | Erreurs métier |
|---|---|---:|---:|---:|
| 10 | PASS | 98 ms | 459 ms | 0 % |
| 25 | PASS | 176 ms | 1 030 ms | 0 % |
| 50 | FAIL : p95 Auth 3 123 ms > 3 000 ms | 281 ms | 1 320 ms | 0 % |

Charge suffisante pour une bêta de 5–20 vraies testeuses : **OUI**, dans la portée du test court réalisé en Recette (~90 secondes par palier). Ce résultat ne valide pas une endurance longue ni 50 connexions initiales groupées.

## Sources et limites
Ce tableau remplace les anciens statuts « reste P2 » devenus obsolètes. Il s’appuie sur P2-LIVRAISON, CHARGE-PHASE12 et CORRECTIONS-PARTAGE-PHOTOS conservés avec la source Recette, les fichiers actuels et les validations de Marie.
L’alerte Auth est décrite dans la [documentation Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Les recommandations futures ne sont pas des modifications effectuées pendant cette promotion.
