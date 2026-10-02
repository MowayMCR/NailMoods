# Contrôles SQL Recette exécutés

Pendant la session du 2 octobre 2026, `supabase/tests/phase13_release.sql` a retourné 16 contrôles réussis dans le projet Recette. Toutes les mutations sont encadrées par BEGIN/ROLLBACK ; aucun message à une utilisatrice réelle n’a été envoyé. Cette transcription décrit les résultats observés ; elle ne remplace pas une capture UI ni un test Storage.

1. Pro creation persisted.
2. Private creation hidden before share.
3. Profile search resolves.
4. Public profile opens.
5. Sender can read share.
6. Share retry sends one message.
7. Recipient reads shared creation.
8. Recipient reads share.
9. Recipient cannot edit author creation.
10. Third account cannot read.
11. Free cannot author.
12. Blocked creation hidden.
13. Blocked share hidden.
14. Blocked send denied.
15. Removed connection revokes creation.
16. Removed connection revokes share.

La nouvelle migration de prépublication photo n’étant pas déployée sur Recette, ces contrôles valident le social existant avec le nouveau resolver Apple désactivé. Ils ne prouvent pas le nouveau parcours complet staff/photothèque ni le signalement UI.
