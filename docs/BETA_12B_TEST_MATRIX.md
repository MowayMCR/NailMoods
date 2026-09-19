# NailMoods — Matrice de recette bêta officielle

Aucune Phase 12B n’est fermée tant que les cas critiques ci-dessous ne sont pas réels.

## Auth / 12A
1. Inscription Free → email → confirmation → profil + workspace + owner membership.
2. Logout → login → données retrouvées.
3. Même compte, 2 navigateurs → collection/inspiration/journal cohérents.
4. Données invitées → import explicite → pas d’écrasement distant.
5. Compte B ne lit/modifie/supprime aucune donnée privée du compte A.

## Identité
6. Suggestion @ID à l’inscription.
7. Handle déjà pris refusé.
8. Changement @ID → conversation/favoris/follows inchangés.
9. Profil Plus « Personne » absent de la recherche.
10. Profil Pro public visible sans donnée privée.

## Pro
11. PO indépendante crée son espace Pro et son profil.
12. Plus recherche @studio → suit/favorise → ouvre profil.
13. Créateur/Marque ne peut pas s’auto-vérifier.

## Institut
14. Création Institut.
15. Invitation membre.
16. Invitation acceptée.
17. Invitation refusée.
18. Limite de membres respectée.
19. Propriétaire retire un membre.
20. Membre quitte.
21. Propriétaire tente de quitter sans transfert → refus.
22. Transfert propriétaire → ancien propriétaire peut quitter.
23. Ex-membre perd immédiatement l’accès aux données partagées.

## Messagerie
24. Premier contact → demande de message.
25. Refus → pas d’envoi possible.
26. Acceptation → conversation active.
27. Texte envoyé/reçu.
28. Inspiration jointe.
29. Badge non lu puis last_read_at.
30. Utilisateur tiers ne lit pas le fil.
31. Blocage → nouveaux messages refusés.
32. Signalement créé sans exposer le contenu à d’autres utilisateurs.
33. Institut répond avec identité du workspace + nom du membre si prévu.

## Suppression
34. Compte avec espace Institut partagé ne peut pas supprimer avant transfert.
35. Suppression compte personnel.
36. Sender supprimé → messages conservés mais auteur = « Compte supprimé ».
37. Avatar, handle, profil et médias privés supprimés.
38. Aucun UUID ou ancien identifiant public affiché.

## Confidentialité
39. CGU non cochées → inscription refusée.
40. Refus publicité → Free reste fonctionnel.
41. Plus/Pro → aucune permission pub active.
42. Changement des choix persiste.
43. Export ne contient que les données autorisées du compte.

## Téléphone réel
44. Caméra.
45. Scan & Génère.
46. Produit inconnu.
47. Clavier sur auth/profil/message.
48. Journal photo.
49. Fermeture/réouverture.
50. Portrait/paysage et absence de débordement horizontal.

## Critères bloquants
Tout échec sur Auth, RLS, confidentialité, suppression, Institut, messagerie privée ou perte de données bloque Phase 13.
