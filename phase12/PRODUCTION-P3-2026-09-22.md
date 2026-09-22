# NailMoods — Promotion P3 en Production

Autorisation explicite de Marie : « Met en production ».
Source validée : Recette v32, `f7dcb83663433f366dc5b3d26c30a27dc2abd91c`.
Base Production avant promotion : `c3b51644e034f824e9afc722b6d8d3b3b820f549`.
Application : https://mowaymcr.github.io/NailMoods/

## Lot promu

- Comparaison des références produit avec marque, gamme, référence, GTIN/catalogue ; proximité de couleur distincte de l’identité du produit.
- Aide & Support : FAQ, demande, capture facultative, suivi paginé et réponse privée.
- Diagnostics limités à 30 événements techniques ; envoi facultatif, champs sensibles exclus.
- Blocage bilatéral des interactions et nouvelles lectures ; signalements privés.
- File de traitement réservée à une liste d’opérateurs gérée côté serveur.
- Avatars par lecture authentifiée ; aucune ouverture des buckets.
- Informations publiques et contrôle de préparation à l’ouverture.

## Vérifications réalisées lors de la promotion

| Contrôle | Résultat |
| --- | --- |
| Suite applicative sur le lot Production | PASS : 296 réussis, 0 échec, 2 intégrations externes ignorées |
| Build Production | PASS : base /NailMoods/, URL Supabase Production ; le hostname Recette ne subsiste que dans la garde rejetant un mauvais environnement |
| Parité des fonctions serveur | PASS : 21 définitions comparées, identiques à Recette |
| Support/sécurité sans identité authentifiée | PASS : accès refusés par les RPC réelles |
| Tables support, signalements, blocages, opérateurs | PASS : RLS activée, aucun droit direct client/anon |
| API anonymes et wrappers publics | PASS : aucun EXECUTE anon sur les nouvelles fonctions, wrappers SECURITY INVOKER |
| Storage | PASS : deux buckets toujours privés ; captures limitées à l’autrice et aux opérateurs habilités |
| Advisor sécurité | Aucun ERROR ; tables privées volontairement fermées et avertissement Auth préexistant |

Migration Production : `phase12_p3_support_safety_validated`, regroupant les cinq scripts SQL validés en Recette dans une application atomique.
Edge Function `media-read` : **version 8 ACTIVE**.
Le workflow GitHub Pages du commit contenant ce rapport doit être terminé avec succès avant d’annoncer la publication de l’interface.

Aucun compte, donnée de test ou générateur de charge copié en Production. Aucun paiement ni rendu IA activé. Les tests sociaux complets demeurent ceux exécutés en Recette ; aucun compte réel de Production n’a été modifié pour simuler des scénarios.

## Reste avant ouverture élargie

- Renseigner les coordonnées publiques et la politique de conservation.
- Désigner le compte responsable du support/modération ; aucun opérateur n’est attribué automatiquement.
- Corriger et tester la suppression d’un compte contenant des médias : garde `storage_cleanup_required` existante.
- Terminer les validations P4 sur deux appareils et l’endurance/latence Auth à 50 connexions simultanées.

Cette promotion ne constitue pas un GO d’ouverture générale. Le blocage et les signalements sont maintenant livrés, ce qui remplace leur statut « non livrés » dans le tableau du 21 septembre.

L’alerte Auth restante est documentée ici : [protection des mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
