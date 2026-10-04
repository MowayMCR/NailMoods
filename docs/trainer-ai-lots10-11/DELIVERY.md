# NailMoods — Lots 10 et 11

## Périmètre
- Trainer accessible depuis Créer → Changer de source → Nail Art Trainer, pour Free/Plus/Pro et invité. Huit exercices, tracé tactile/souris, points au clavier, guide masquable, épaisseur, annulation, effacement, plein écran. Progression dans la session seulement, sans note automatique, vidéo ou AR. Tracés et géométrie réutilisés de proNailEditorModel ; droits Atelier Pro inchangés.
- IA+ : endpoint ai-internal authentifié via getUser, contrôle interne indépendant côté PostgreSQL, entitlement et feature flag existants, contrôle propriété projet, verrou de quota par compte/jour UTC, idempotence, historique privé, suppression du contenu et cascade à la suppression du compte. Le journal d’usage conserve la consommation après suppression de l’historique.
- Fournisseur abstrait pour cinq fonctions. Adaptateur expérimental sans réseau fournisseur : aucun rendu, analyse de photo, secret fournisseur ou coût payant. Le résultat indique explicitement ces limites. Ce lot prépare le circuit ; la qualité générative n’est pas validée et aucun fournisseur réel n’est activé.
- Public fermé : AI_PLUS_PUBLIC_ENABLED=false ; flags serveur désactivés après recette. Aucun SKU, achat ou paywall IA+.
- Confidentialité : le client envoie uniquement projet, fonction et identifiant de requête ; aucune photo n’est transférée à un fournisseur. Coût et compteurs serveur non modifiables par le client. Aucun événement analytics contenant le contenu privé.

## Google Play
R8 et shrinkResources activés, règles de conservation des plugins Capacitor réfléchis. La chaîne AAB future exporte mapping.txt et native-debug-symbols.zip lorsqu’il est réellement fourni. FULL reste activé pour les symboles natifs. La compilation release de contrôle utilise assembleRelease, jamais bundleRelease ; aucun nouvel AAB demandé à ce stade.
Deux bibliothèques CameraX sont présentes dans l’ancien AAB sans métadonnées : libimage_processing_util_jni.so et libsurface_util_jni.so. Les symboles absents des dépendances amont ne sont pas reconstitués artificiellement. Le contrôle Play final nécessite le futur bundle.

## Validation et déploiement
Les résultats recette, compilation native et URL production sont consignés dans evidence et complétés à la livraison. Production : comparer les migrations par leur nom, pas uniquement leur timestamp (les environnements ont des versions différentes). Préserver les droits manuels et ne jamais lancer de purge de données pendant ce déploiement.

## Repli
Restaurer le commit web précédent via GitHub Pages pour revenir à l’ancienne UI. Conserver les nouvelles tables afin de ne perdre aucun projet saisi ; désactiver l’entrée cycle via VITE_POSE_CYCLE_ENABLED si nécessaire. IA+ se coupe avec addon_feature_flags.enabled=false, sans modifier les droits de base. R8 peut être désactivé pour le build Android suivant si une régression native apparaît.
