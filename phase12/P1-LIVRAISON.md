# NailMoods — P1 — 21 septembre 2026

## Périmètre livré

- Journal : tuile Messagerie, compteur de messages non lus, ouverture des contacts et conversations.
- En-tête : cloche et compteur de notifications non lues, liste des événements, ouverture des échanges liés lorsque la connexion est toujours acceptée.
- Invitations, acceptations, messages et projets/inspirations partagés : notifications internes persistantes. Pas de push natif. Rafraîchissement toutes les 20 secondes quand l’application est visible, au retour sur la page et au retour en ligne.
- Lecture d’une conversation : marque les messages effectivement chargés et les notifications correspondantes ; une nouvelle arrivée après le chargement reste non lue. Notifications historiques sans acteur : conservées, à acquitter dans la liste.
- Profil : identifiant visible sous le nom, copie, accès direct aux paramètres Identité et visibilité. Le formulaire long n’est plus affiché en permanence.
- DA : boutons sociaux et photo harmonisés, onglets compacts, surfaces teintées par le thème, suppression des contours natifs épais, navigation basse opaque. Les modales de compte héritent désormais du thème de l’application.
- Conversation : dates abrégées, saisie compacte, action Envoyer identifiable, texte conservé en cas d’échec. Clé de dédoublonnage conservée lors d’une nouvelle tentative identique.
- Historique : les pages anciennes sont conservées lors du polling ; pagination avec identifiant de départ pour les horodatages identiques.
- Invitation depuis un profil : affichage différencié de la demande envoyée, demande reçue et connexion acceptée.

## Vérifications

| Contrôle | Statut | Preuve et limite |
|---|---|---|
| Suite automatisée | PASS | 270 tests, 268 réussis, 2 tests d’intégration ignorés, 0 échec |
| Compilation Recette | PASS | Compilation complète Vite |
| Invitation et acceptation → notification | PASS | RPC sous rôle authenticated, transaction annulée après assertions |
| Message et partage → notification | PASS | RPC + lecture de la notification du destinataire, transaction annulée |
| Marquage lu et isolation des notifications | PASS | Propriétaire seulement ; modification de l’acteur refusée ; les anciennes données ne sont pas supprimées |
| Historique fusionné et dédoublonné | PASS | Test indépendant avec ancienne page et nouvelle page, horodatages identiques |
| Affichage mobile | PASS | Composants réels, données fictives locales, cadres 360 et 390 px ; capture jointe |
| Envoi visuel | PASS | Scénario local fictif : texte visible après envoi ; ce test ne prouve pas un échange réseau entre téléphones |
| Formulaire ID | PASS | Ouverture et réponse du bouton disponibilité dans le scénario local ; RPC métier existante conservée |
| Ouverture application complète | PASS | Accueil réel en mode invité dans le navigateur de contrôle |
| Parcours P1 avec deux comptes sur deux téléphones | NOT RUN | À vérifier sur la Recette publiée, notamment notifications, refresh et reconnexion |
| Clavier natif iOS/Android et zoom texte 200 % | NOT RUN | Les cadres mobiles ne reproduisent pas le clavier d’un téléphone |
| Promotion des nouveaux P1 | NOT RUN | Attend la validation humaine Recette prévue dans le workflow |

Les données de démonstration visibles dans la capture ne sont pas déployées. Les tests serveur de ce lot utilisent ROLLBACK : ils ne laissent ni messages ni relations de test supplémentaires.

## Alignement du socle précédent

L’alignement antérieurement autorisé a été publié : Recette v25, source 40d0ca52eabf7e563d4addf536fcb1f88b5d18db ; Production GitHub afa1c98421caabe340aca048d143818b588d730b, arbre identique f956b576bdc80d61638913f25ab9db4f2d9bcfa8. Workflow Pages 35613771757 terminé avec succès ; page Production HTTP 200.

Les nouveaux changements P1 viennent ensuite en Recette. Ils ne sont pas inclus dans cette promotion du socle précédent. Les environnements restent séparés : bases, comptes, fichiers et clés publiques propres à chacun.

## Données et migration P1

Migration Recette `p1_social_notifications`, SQL dans `p1-notifications.sql` :
- `public.user_notifications.actor_id` nullable, FK vers auth.users avec ON DELETE SET NULL ;
- types supplémentaires `connection_request` et `connection_accepted` ;
- remplacement ciblé des fonctions privées `nm_social` et `send_nailmoods_share_to_po` pour enregistrer l’acteur ;
- lecture de conversation bornée aux messages chargés, marquage des notifications du même interlocuteur ;
- politiques propriétaire de notifications et droits existants conservés. Le client ne peut modifier que `read_at`.

Pas de changement Storage ni Edge Functions. Pas de nouvel événement analytics dans P1. Le raccordement analytics social reste P2. Les diagnostics Supabase gardent les avertissements préexistants sur `get_public_profile` et la protection des mots de passe compromis ; aucun nouvel accès public aux notifications n’a été ajouté.

## Limites et reste à faire

- Les connexions restent plafonnées à 100 dans l’API existante.
- La liste de notifications charge 50 non-lues ; acquitter la page permet d’accéder aux suivantes. Le compteur porte sur toutes les non-lues.
- Les anciens événements `message_request` ne permettent pas de distinguer invitation et acceptation : libellé neutre conservé, sans inventer leur origine.
- Un refus ou retrait de connexion ne supprime pas l’historique ; le serveur conserve le contrôle d’accès.
- Les droits Free / Plus / Pro serveur, le partage PO riche, les filtres de découverte et les imports photo complets restent P2/P3.
- Les tests Institut, downgrade, second appareil et charge représentative restent nécessaires avant clôture de Phase 12.
- L’erreur historique de renvoi du mail de confirmation n’est pas retestée dans P1.

## Retour arrière

Pour annuler l’interface P1, republier Recette v25. La migration P1 est additive et compatible avec cette version ; conserver colonnes et notifications évite toute perte. Ne pas supprimer les notifications ou modifier les fixtures utilisées par Marie pour tester.

Décision : P1 prêt pour contrôle humain en Recette ; **NO GO pour clôturer toute la Phase 12**.
