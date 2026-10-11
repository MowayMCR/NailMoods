# NailMoods — contrôle AdMob / ATT — 11 octobre 2026

## Conclusion et limite

Le candidat iOS contient un chemin publicitaire **avec tracking Apple**, accessible uniquement après accord UMP et ATT. **ATT est nécessaire** pour ce chemin. Pour ce candidat, préparer **Suivi : Oui** sur **Identifiant d’appareil** et **Données publicitaires**, avec finalités **Publicité tierce + Analyse**, **Liées à l’identité : Oui** (le lien à l’appareil compte).

Il n’existe pas de preuve réseau permettant d’affirmer que l’ancien build 30004 a effectivement suivi une utilisatrice. Le SDK Google déclare une utilisation potentielle de Device ID pour tracking ; `npa:true`, les unités de test et l’absence de popup ATT ne permettent pas de répondre Non. La réponse Oui du candidat porte sur le chemin autorisé de mesure publicitaire ; elle ne signifie pas que tous les comptes sont suivis.

**État : correctif préparé, non fusionné ; aucune validation finale App Store. Les essais iOS sont suspendus côté serveur pendant cette transition.** La conformité réelle après refus, la liste des domaines et les données utilisées pour la mesure doivent encore être contrôlées sur appareils physiques et archive finale. Les gardes de l’application ne constituent pas une capture du trafic SDK et n’annulent pas une requête déjà envoyée avant un retrait. Ne pas déclarer ces points vérifiés tant que les preuves matérielles n’existent pas.

## Livraison

- Branche : `fix/admob-att-20261011`, PR brouillon [69](https://github.com/MowayMCR/NailMoods/pull/69).
- Source du premier candidat ATT 30005 : `23a4c20a50616ccf80fcd7d6b2b7951dc26870b2`. Ce candidat intermédiaire ne reprenait pas encore le correctif StoreKit livré en 30004 ; ne pas le retenir comme candidat final.
- Candidat TestFlight : version **0.8.1**, build **30006**. Ce n’est pas une version commerciale 1.0.
- [CI intermédiaire 30005](https://github.com/MowayMCR/NailMoods/actions/runs/38148866452). [CI finale 30006](https://github.com/MowayMCR/NailMoods/actions/runs/38149907464), source `134c1287dec9b7a2042453a6379a59c0ea9ca197`, à contrôler séparément. Ne pas confondre lancement et succès.
- Google Mobile Ads **13.6.0**, UMP **3.1.0**, plugin Capacitor AdMob **8.2.0**. Aucun adaptateur de médiation supplémentaire déclaré dans le package audité.

## Modifications

1. Ajout de `NSUserTrackingUsageDescription`, avec explication du lien aux autres apps/sites et du maintien des accès après refus.
2. UMP demandé avant toute demande publicitaire ; ses erreurs bloquent les essais. `canRequestAds` seul n’est pas interprété comme accord de tracking.
3. En zone concernée, le candidat exige des consentements positifs aux finalités TCF 1, 3, 4 et au fournisseur Google 755. C’est volontairement plus restrictif que l’éligibilité aux annonces limitées. Hors zone, UMP doit retourner `NOT_REQUIRED`, puis ATT reste obligatoire.
4. Lecture ATT réelle, requête uniquement si `notDetermined`, aucune répétition de popup après refus/restriction. Si UMP gère déjà le message IDFA, son résultat ATT est relu ; pas de deuxième demande lorsque le statut est déterminé.
5. Gardes JavaScript et natives devant l’initialisation, le chargement et l’affichage. Session native fermée au retrait, à un changement de consentement ou au passage en arrière-plan. Bannière en cours supprimée, callback tardif bloqué.
6. Publisher first-party ID désactivé avant `MobileAds.start`. `GADDelayAppMeasurementInit` conservé. Pas d’UUID, adresse email ou profil NailMoods transmis au contrôleur d’annonces.
7. Refus UMP ou ATT : **aucune demande d’annonce iOS** dans ce candidat. Le chemin contextuel/non personnalisé sans ATT est suspendu faute de preuve réseau de non-tracking. Après double accord seulement : unités Google de démonstration, `npa:true`, sans récompense réelle.
8. Patch natif restreint au plugin épinglé, appliqué pendant le build iOS, avec arrêt si version/méthodes changent. Aucun manifeste Google modifié pour effacer ses déclarations.
9. Manifeste app : `NSPrivacyTracking=true`, Device ID et Advertising Data liés et utilisés pour tracking. Corrections de l’audit précédent incluses : Santé limitée à Fonctionnalités ; Contacts conservés pour le graphe social privé ; Historique de recherche ajouté.
10. Correctif StoreKit déjà livré en 30004 repris dans le candidat : environnement Sandbox TestFlight, actualisation des prix sans redemande d’authentification Apple, priorité des accès offerts et vérification serveur conservées. Aucun droit de compte ou réglage serveur modifié.
11. Archive signée complète conservée par CI pour l’examen Organizer. Politique 0.9-beta complétée dans le candidat ; cette branche ne publie pas automatiquement le site de production.

Les droits Plus/Pro offerts, restrictions d’accès et quotas IA restent inchangés. Seul le coupe-circuit publicitaire iOS a été mis en pause. Aucun identifiant d’annonce commerciale ajouté. Les essais restent soumis aux droits et au coupe-circuit serveur existants ; il n’est pas activé pour contourner un refus et reste désactivé sur iOS avant validation.

## Configuration serveur réelle contrôlée

Lecture seule de la configuration publicitaire en production, le 11 octobre : iOS et Android ont `enabled=true`, `test_only=true`, `daily_limit=1`. Les essais peuvent donc être accessibles aux comptes Free éligibles ; les publicités commerciales restent bloquées. Après cette lecture, l’interrupteur iOS a été mis sur `enabled=false`, avec `test_only=true` conservé, puis relu pour vérification. Android reste en test uniquement. Aucun compte, droit Pro, consentement ou accès IA n’a été modifié. Cette pause empêche les nouveaux essais d’annonces sur les anciens builds qui ne contiennent pas ATT ; elle ne peut pas effacer un échange déjà parti. Les identifiants d’annonces commerciales déjà stockés dans ios-config.json ne sont pas utilisés par le contrôleur : il appelle exclusivement les constantes Google de démonstration.

## Résultats disponibles

Tests du premier candidat ATT : **665 tests, 663 réussis, 2 ignorés, 0 échec**. Après reprise StoreKit, 32 tests ciblés ATT/achats/contrats iOS réussis ; **suite complète finale : 679 tests, 677 réussis, 2 ignorés, 0 échec**. Build web : réussi. Contrôle des espaces/diff : réussi. Ces résultats n’attestent ni la compilation Swift ni le comportement réseau Google.

| Scénario | Résultat automatisé du contrôleur | iPhone/iPad physiques |
|---|---|---|
| UMP accord puis ATT accord | Ordre UMP → ATT → session → initialisation vérifié | À réaliser |
| UMP refus, même si canRequestAds=true | Ni ATT ni initialisation/annonce | À réaliser |
| ATT refus / restreint / état inconnu | Aucune initialisation/annonce | À réaliser |
| ATT non déterminé puis demande non accordée | Aucune initialisation/annonce | À réaliser |
| Retrait UMP/ATT pendant préparation | Aucune présentation ; session suspendue | À réaliser |
| Bannière attachée tardivement après retrait | Retrait vérifié par doublure du SDK | À réaliser |
| Revoir le choix / nouvelle instance sans autorisation ATT | Pas d’accord inventé ou stocké par l’app | Réinstallation réelle à réaliser |
| Comptes Pro/Plus/institut, web et coupe-circuit | SDK non chargé par le contrôleur | À réaliser |

## App Store Connect — saisie préparée

Ne pas publier automatiquement. Appliquer les réponses au **binaire effectivement retenu**, après comparaison au rapport final.

| Catégorie | Finalités | Liée | Suivi |
|---|---|---|---|
| Identifiant d’appareil | Publicité tierce, Analyse | Oui | **Oui** |
| Données publicitaires | Publicité tierce, Analyse | Oui | **Oui** |
| Localisation approximative | Fonctionnalités, Publicité tierce, Analyse | Oui | Non selon audit/SDK, à confirmer en réseau |
| Interaction avec le produit | Analyse, Publicité tierce, Fonctionnalités | Oui | Non selon audit/SDK, à confirmer en réseau |
| Données de crash | Analyse | Non pour le flux SDK trouvé | Non |
| Données de performances | Publicité tierce, Analyse, Fonctionnalités | Oui par prudence | Non selon audit/SDK, à confirmer en réseau |
| Autres données de diagnostic | Fonctionnalités, Analyse, Publicité tierce | Oui par agrégation prudente | Non selon audit/SDK, à confirmer en réseau |

Les 12 autres catégories restent dans [le tableau complet de 19 catégories](../../app-store/APPLE_PRIVACY_ANSWERS.md). Aucun usage publicitaire des données Santé, Contacts, messages, photos ou prompts IA trouvé dans le contrôleur audité : ne pas cocher Suivi sur ces catégories par simple présence d’AdMob. Ne pas ajouter Marketing du développeur sans traitement correspondant.

Le manifeste Google annonce seulement Device ID comme tracking ; Advertising Data est déclaré Oui par prudence pour les impressions/interactions liées à l’identifiant dans le chemin autorisé. La capture matérielle doit confirmer ce classement et révéler d’éventuelles catégories supplémentaires effectivement utilisées pour tracking. Les réponses ne sont donc **pas encore une attestation des flux finaux**.

## Politique publique contrôlée

Le 11 octobre, l’URL https://nailmoods.com/legal/confidentialite.html répond HTTP 200 et affiche 0.9-beta. Le texte récupéré ne contient ni OpenAI ni le nouveau paragraphe ATT. Le rectificatif a ensuite été publié via deux commits ne modifiant que les documents publics : `14286c895aa7e6bcef02310c9aed284962637719` et `fe0055a5367a6edc0f3513f983126691a1c0ecde`. Contrôle après déploiement réussi : politique et archive HTTP 200 ; OpenAI et paragraphe ATT présents dans la politique actuelle. Cette vérification d’accessibilité et de contenu ne remplace pas l’examen des bases juridiques et contrats mentionnés dans l’audit initial.

## Console AdMob et vérifications restantes avant validation

- Lire dans AdMob les messages réellement publiés pour l’ID app iOS : réglementation européenne, partenaires, refus visible, lien public de confidentialité et éventuel message IDFA. Contrôle visuel en lecture seule effectué : message européen publié pour Android et iOS, français et une langue supplémentaire, Refuser et Gérer les options activés, lien public correct, ciblage EEE/Royaume-Uni/Suisse. Message IDFA en brouillon, non publié ; ATT reste piloté par l’application. Le texte UMP annonce 210 partenaires : la liste et leur nécessité doivent être revues avant activation. Aucun réglage de console changé.
- Garder les essais iOS suspendus. Pour la recette supervisée, définir un accès de test qui exclut les anciens builds sans ATT avant de réactiver temporairement les essais ; ne pas ouvrir le mode commercial.
- Sur iPhone et iPad physiques, avec comptes fictifs éligibles aux essais, enregistrer versions iOS, build/source, état ATT et consentements pour chaque ligne du tableau. Tester aussi le refus global des demandes ATT dans Réglages, le relancement et le changement de choix depuis Réglages.
- Observer les connexions avant opt-in, après accord, après refus/retrait et lors des rafraîchissements de bannière. Les échanges UMP nécessaires aux choix sont distincts des requêtes publicitaires. Une liste de domaines du rapport de confidentialité iOS n’est pas une preuve de contenu ; combiner observation réseau et documentation du SDK. Ne pas prétendre voir un IDFA dans des paquets TLS non déchiffrés.
- Réinstallation : ne pas supposer qu’iOS remet forcément ATT à zéro. Tester l’état réel conservé par le système et un appareil frais/effacé pour le premier lancement. `UMP.reset()` n’est pas une procédure utilisateur et ne réinitialise pas ATT.
- Après succès CI, vérifier le rapport statique généré depuis **l’IPA 30006** : clé ATT, manifeste app, manifestes Google/UMP intacts, collectes/tracking/finalités, signature et appareils iPhone+iPad.
- Ouvrir **l’archive finale 30006** dans Xcode Organizer et générer le rapport Privacy Report. Le rapport JSON CI est une extraction statique, pas ce rapport Organizer. Comparer tous les SDK ; ne pas modifier leurs déclarations pour masquer le tracking.
- Politique publique rectifiée et vérifiée après déploiement. Relire le texte à la lumière des flux physiques finaux et des contrats restant à vérifier dans l’audit initial.

## Sources primaires

- [Apple — définition du tracking et ATT](https://developer.apple.com/app-store/user-privacy-and-data-use/).
- [Google — données collectées par AdMob iOS](https://developers.google.com/admob/ios/privacy/data-disclosure).
- [Google — ATT et Publisher first-party ID](https://developers.google.com/admob/ios/privacy/strategies).
- [Google — UMP](https://developers.google.com/admob/ios/privacy).
- [Google — annonces personnalisées et non personnalisées](https://support.google.com/admob/answer/7676680).
- [Google — fournisseur 755 et consentements TCF](https://support.google.com/admob/answer/9999955).

Les règles et API ont été consultées le 11 octobre 2026. Les déclarations des SDK ne sont pas une preuve d’exécution sur un appareil.
