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

## Résultats de validation
- 522 tests réussis, 0 échec, 2 tests optionnels préexistants ignorés (524 au total).
- Recette : trois vrais comptes Free/Plus/Pro ; endpoint interne autorisé uniquement au compte Plus temporairement habilité, public refusé, projet d’un tiers refusé, reprise idempotente, quota conservé après suppression, finalisation client refusée. Permissions temporaires et historique de test retirés, flag refermé.
- Navigateur : vrai Trainer sur compte Free ; souris, clavier, annulation, plein écran, fin d’exercice. Captures finales après correction d’un conflit avec les styles globaux du header. Quatre choix de mood effectués dans la vraie UI ; 16 mises en page (4 moods × 320/360/390/430 px), aucun débordement ni chevauchement du titre.
- Android : workflow 37230410828, assembleRelease avec R8/shrinkResources réussi ; mapping.txt présent. Aucun AAB créé par ce chantier. Validation tactile/native et notification sur appareil physique restent à faire avant la bêta.
- Production : installation des migrations du cycle, projection privée du profil et socle IA ; garde de références médias manquante ajoutée avant pose_outfit_source. Les versions serveur diffèrent de recette : consulter le manifeste de livraison.
- Vérification transactionnelle sous rôle authenticated avec deux identités de production : création propriétaire, lecture réservée au propriétaire, projets/plannings/rappels invisibles pour l’autre compte, modification tierce impossible, IA publique refusée. ROLLBACK complet, aucun contenu de test conservé.
- Contrôles avant/après : 15 profils, 11 produits, 3 poses Journal, 1 photo Journal publique conservés ; empreinte du registre des droits manuels identique. Achats Google/Apple et IA désactivés.
- Publication/modération iOS : migration apple_ugc_prepublication_review volontairement non appliquée à la production web pour préserver les publications existantes. Le panneau de revue s’efface proprement si son RPC n’existe pas. Apple StoreKit reste préparé et fermé ; aucune offre activée.
- Conseiller sécurité : la nouvelle projection billing est SECURITY INVOKER, adossée à une fonction privée liée à auth.uid(). Les avis hérités (pg_net, trois RPC historiques, protection des mots de passe) ne sont pas créés par ce lot.

## Ordre de migration de rattrapage
apple_storekit_entitlements → apple_privacy_retention_24months → apple_reconciliation (désactivée) → pose_cycle_foundations → media_cleanup_reference_prerequisite → pose_outfit_source → pose_outfit_access_analytics → pose_planning_lifecycle → pose_followup_tracking → pose_followup_journal_access → pose_project_sharing → pose_realization_journal → pose_cycle_completion_events → profile_private_lifestyle_projection → ai_internal_jobs → billing_state_private_projection.
La migration de rattrapage de référence médias est datée du jour de sa création, mais doit être appliquée AVANT l’ancienne migration tenue sur un environnement qui n’a pas le RPC. Ne pas lancer aveuglément db push sur les historiques divergents.

## Limites
IA+ ne génère pas d’image et n’analyse pas réellement une photo : la préparation interne est vérifiée à coût nul. L’historique contient les essais de circuit, pas de faux rendus. Les symboles natifs amont absents ne peuvent pas être garantis avant inspection du futur bundle ; ne pas annoncer que Play a validé un bundle non téléversé. Le Trainer n’évalue pas le geste et ne persiste pas les dessins hors session.
