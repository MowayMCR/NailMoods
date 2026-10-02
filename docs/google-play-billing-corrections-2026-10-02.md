# Billing bêta 6 - corrections et état de livraison

2 octobre 2026. Ce bilan complète l'audit historique du 1er octobre. Les défauts de code ont été traités ; la diffusion payante attend la configuration et les tests Google.

## Corrections

| Audit | Correction |
| --- | --- |
| B01 | Billing 9.1.0, callbacks adaptés, reconnexion et lecture des abonnements suspendus |
| B02 | Prix/période Google, renouvellement et résiliation ; forfait standard mensuel ou annuel sans promotion |
| B03 | SQL exécutable, wrappers service-only, état client limité à auth.uid() |
| B04 | Produit, forfait et compte obscurci vérifiés ; propriétaire du jeton immuable ; majorité/conditions exigées au premier rattachement |
| B05 | Endpoint d'acknowledgement correct, HTTP contrôlé, reprise idempotente |
| B06 | Ledger séparé ; projection du profil ne fabriquant pas de droits administratifs |
| B07 | Droits admin/legacy/beta_self_selection/beta_invitation valides protégés ; Free ne bloque pas l'achat |
| B08 | Résiliation jusqu'à échéance ; classement sur tous les droits ; cron cinq minutes, lots de dix avec rotation ; restauration/retour au premier plan et second abonnement bloqué |
| B09 | Messages fondés sur la confirmation serveur, avec pending/échec/absence d'achat distincts |

CGU 0.5-beta et confidentialité 0.7-beta préparées, archives conservées, données d'achat décrites, lien de résiliation dans la suppression. Les versions serveur restent celles du client public jusqu'à la publication coordonnée des textes ; aucun ancien consentement n'est réécrit.

## Catalogue

L'Excel est joint dans `release/beta6`, SHA-256 `5ee75d3dfba63791a99a3761486db494bf27d7a9e067d88a809f473f3d1fc9ff`. Le catalogue embarqué contient 2 631 identités actives et 1 047 associations vérifiées. La correspondance de tous les IDs V1 est documentée : IDs actifs conservés, alias rapprochés, incertitudes exclues de la reconnaissance. Aucun contenu de collection personnelle n'est réécrit. UPC-E développé, zéros initiaux et GTIN testés ; les SKU CANNI partagés ne reconnaissent pas une teinte. Aucun attribut historique non revalidé n'est présenté comme sourcé.

## Serveur et vérifications

Recette et Production : migrations Billing/réconciliation installées, `google-play-verify` version 1 active. Les achats sont **désactivés**, plans et URL d'activation non renseignés ; aucun appel Google du cron dans cet état. Aucune opération d'achat utilisateur réalisée.

La passerelle JWT est désactivée pour le scheduler ; la fonction authentifie elle-même soit le JWT via Auth.getUser et email confirmé, soit un jeton aléatoire contrôlé par une RPC service-only. Le jeton de réconciliation expire après deux minutes et est consommé atomiquement une seule fois ; seul son hash est conservé dans une table privée. Aucun secret réutilisable ni jeton d'achat n'est placé dans la file pg_net. La révocation du droit SELECT sur cette file ne retire pas le grant PUBLIC de son propriétaire géré ; elle n'est donc pas revendiquée comme protection effective. Un rôle ayant accès à la file pourrait au plus déclencher le rafraîchissement prévu pendant la courte validité du jeton ; la réponse ne contient que des compteurs. POST non authentifié : HTTP 401 dans les deux environnements.

- 366 tests locaux réussis, 2 tests d'intégration existants ignorés faute de fixtures réelles.
- Migrations et régressions exécutées sur PostgreSQL isolé : provenance, annulation/grâce/hold/pending, propriétaire, droits/dates manuels et fondateurs, ordre de restauration, projection et permissions ; jeton de réconciliation consommé une seule fois, expiration et absence d'appel quand Billing est désactivé. Auth/signup, pg_net et cron ont des fixtures minimales ; ce n'est pas une réplique complète de Supabase ni un achat Google.
- Contrôles déployés des permissions et réglages réalisés. Le test complet à utilisateurs jetables en Recette n'a pas pu être exécuté : deux appels ont échoué avec `Invalid or expired requestState`. Aucun succès de ce test distant n'est revendiqué.
- Build web et contenu web mobile Production réussis. Compilation Java contre le véritable SDK et résolution de dépendance Billing réussies dans la [CI du 2 octobre](https://github.com/MowayMCR/NailMoods/actions/runs/36990686221), commit `6399b9f1e57cb6c43c921f76199191985bf2e045`. La préparation CI inclut l'environnement Capacitor Production et les ressources mobiles. Cette compilation ne produit pas un AAB signé.
- Advisories Recette : RLS sans politique intentionnel sur les tables privées ; SECURITY DEFINER de l'état client intentionnel, sans paramètre d'identité et gardé par auth.uid(). La protection des mots de passe compromis était déjà désactivée avant Billing. Références : https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable et https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Étapes restantes

Configurer produits/forfaits/API/secrets ; publier textes et client avec versions serveur cohérentes ; construire un candidat signé avec manifeste/package/versionCode/certificat vérifiés ; le distribuer en test interne ; tester achats, restauration, cycle de vie et caméra ; promouvoir le candidat validé au test fermé. L'Excel accompagne le lot ; seul l'AAB s'importe dans Play Console.

Pas d'AAB final signé livré à cette reprise. [Guide en 105 étapes](google-play-beta6-pas-a-pas.md).
