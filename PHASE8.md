# Phase 8 — parcours et aides intégrées

## Modifications
- Les aides ne flottent plus au-dessus de l’interface : invitation dans le flux, puis guide court au même endroit, sans overlay ni verrouillage du défilement. Les sept guides existants partagent ce système ; un guide Matériel indépendant est ajouté. Passer, Terminer, fermeture, Échap, swipe et réouverture (?) ; les clés help_seen existantes sont conservées, événements locaux conservés.
- Voile de la couleur du thème vers le blanc, illustration filaire et pétales discrets, navigation et titres aérés. Profil réduit, collection et résumé de personnalisation allégés. Logo officiel et visuels de poses conservés.
- Profil : liens Collection, Matériel, Inspirations et Créer. Matériel ouvre directement la bonne catégorie, filtres effacés. Génération : bouton explicite pour reprendre les préférences du profil ; les générations enregistrées ne sont pas changées automatiquement.
- Collection : vue compacte et accès direct à Créer près des filtres ; recherche, filtres, tri et affichage progressif précédents conservés.
- Nouvelle utilisatrice : plus d’univers Witchy/Girly/Alternative, de capsules ou de compétences avancées présélectionnés. Réglages simples par défaut ; les profils sauvegardés restent prioritaires.

## Vérifications avant publication
124 tests réussis, incluant moteur et génération externe, collection, couleurs, snapshots, matériel, variantes, journal et persistance. Nouveau test profil vierge + première idée avec un vernis classique ; test indépendant du guide matériel. Build de production et contrôle des différences réussis.
Le navigateur de contrôle disponible possède les données QA du test précédent ; l’ouverture d’une fenêtre privée n’a pas fourni de contexte vierge pilotable. La première utilisation est couverte par tests de stockage vierge, mais cela ne remplace pas un parcours humain intégral en session privée. La prévisualisation locale reste inaccessible à ce navigateur. Vérification UI sur publication prévue ensuite.

## Limites à valider sur téléphone
Viewport 320–430 px, paysage, clavier, swipe, focus, navigation sans accompagnement et session privée complète (ajout des produits → génération → favoris → journal). Le moteur local n’a pas de compte serveur : « utilisatrice vierge » signifie navigateur sans données NailMoods.

## Préparé uniquement
L’architecture catalogue/Pro/Institut/Marques reste celle documentée à la phase 7 ; aucun portail, compte fictif ni nouvelle collecte distante. Pas de dark mode ni d’animation d’attente ajoutés.
