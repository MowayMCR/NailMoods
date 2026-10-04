# Preuves du lot 2

Les PNG sont livrés dans le dossier de validation, hors Git. Ils proviennent de l’application exécutée à 390 px, connectée à NailMoods-Recette. La tenue est une fixture synthétique, avec deux produits temporaires. Aucun média personnel ni identifiant de connexion n’est livré.

- 01-creer.png : entrée depuis Créer.
- 02-tenue-*.png : même parcours et mêmes produits dans les quatre moods.
- 03-projet-enregistre.png : fiche relue depuis pose_projects, photo privée et événement lié.
- browser-outfit.json : parcours réel et isolation du second compte.
- recette-foundations.json : projets / Planning / rappels, deux comptes.
- recette-ia.json : accès interne IA+ temporaire, retiré après le test.
- recette-journal-free.json : compte Free, Journal privé autorisé, publication et tenue refusées.
- tests-full.txt : résultats complets, y compris les deux scénarios opt-in ignorés.
- build-recette.txt : build frontend recette.
- tests-rollback.txt : retour arrière testé dans une base locale isolée.

Pour reproduire le scénario IA+, un administrateur doit préalablement préparer un droit temporaire et l’accès interne d’un compte dédié, garder public_enabled=false, puis retirer ces changements. Ce scénario n’est pas activé par défaut.
