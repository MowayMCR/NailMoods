# NailMoods — contrôle AdMob / ATT — 11 octobre 2026

## Conclusion et limite

Le candidat iOS contient un chemin publicitaire **avec tracking Apple**, accessible uniquement après accord UMP et ATT. **ATT est nécessaire** pour ce chemin. Pour ce candidat, préparer **Suivi : Oui** sur **Identifiant d’appareil** et **Données publicitaires**, avec finalités **Publicité tierce + Analyse**, **Liées à l’identité : Oui** (le lien à l’appareil compte).

Il n’existe pas de preuve réseau permettant d’affirmer que l’ancien build 30004 a effectivement suivi une utilisatrice. Le SDK Google déclare une utilisation potentielle de Device ID pour tracking ; `npa:true`, les unités de test et l’absence de popup ATT ne permettent pas de répondre Non. La réponse Oui du candidat porte sur le chemin autorisé de mesure publicitaire ; elle ne signifie pas que tous les comptes sont suivis.

**État : correctif préparé, non fusionné ; aucune validation finale App Store.** La conformité réelle après refus, la liste des domaines et les données utilisées pour la mesure doivent encore être contrôlées sur appareils physiques et archive finale. Les gardes de l’application ne constituent pas une capture du trafic SDK et n’annulent pas une requête déjà envoyée avant un retrait. Ne pas déclarer ces points vérifiés tant que les preuves matérielles n’existent pas.

## Livraison

- Branche : `fix/admob-att-20261011`, PR brouillon [69](https://github.com/MowayMCR/NailMoods/pull/69).
- Source de compilation initiale : `23a4c20a50616ccf80fcd7d6b2b7951dc26870b2`.
- Candidat TestFlight : version **0.8.1**, build **30005**. Ce n’est pas une version commerciale 1.0.
- [Compilation et livraison](https://github.com/MowayMCR/NailMoods/actions/runs/38148866452) : statut à confirmer dans les preuves jointes ; ne pas confondre lancement et succès.
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
10. Archive signée complète conservée par CI pour l’examen Organizer. Politique 0.9-beta complétée dans le candidat ; cette branche ne publie pas automatiquement le site de production.

Les droits Plus/Pro offerts, paramètres Supabase, restrictions d’accès et quotas IA restent inchangés. Aucun identifiant d’annonce commerciale ajouté. Les essais restent soumis aux droits et au coupe-circuit serveur existants ; il n’est pas activé pour contourner un refus.

## Résultats disponibles

Tests locaux : **665 tests, 663 réussis, 2 ignorés, 0 échec**. Build web : réussi. Contrôle des espaces/diff : réussi. Ces résultats n’attestent ni la compilation Swift ni le comportement réseau Google.

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

## Vérifications restantes avant validation

- Lire dans AdMob les messages réellement publiés pour l’ID app iOS : réglementation européenne, partenaires, refus visible, lien public de confidentialité et éventuel message IDFA. Aucun accès à cette console n’a été effectué par ce correctif.
- Sur iPhone et iPad physiques, avec comptes fictifs éligibles aux essais, enregistrer versions iOS, build/source, état ATT et consentements pour chaque ligne du tableau. Tester aussi le refus global des demandes ATT dans Réglages, le relancement et le changement de choix depuis Réglages.
- Observer les connexions avant opt-in, après accord, après refus/retrait et lors des rafraîchissements de bannière. Les échanges UMP nécessaires aux choix sont distincts des requêtes publicitaires. Une liste de domaines du rapport de confidentialité iOS n’est pas une preuve de contenu ; combiner observation réseau et documentation du SDK. Ne pas prétendre voir un IDFA dans des paquets TLS non déchiffrés.
- Réinstallation : ne pas supposer qu’iOS remet forcément ATT à zéro. Tester l’état réel conservé par le système et un appareil frais/effacé pour le premier lancement. `UMP.reset()` n’est pas une procédure utilisateur et ne réinitialise pas ATT.
- Après succès CI, vérifier le rapport statique généré depuis **l’IPA 30005** : clé ATT, manifeste app, manifestes Google/UMP intacts, collectes/tracking/finalités, signature et appareils iPhone+iPad.
- Ouvrir **l’archive finale 30005** dans Xcode Organizer et générer le rapport Privacy Report. Le rapport JSON CI est une extraction statique, pas ce rapport Organizer. Comparer tous les SDK ; ne pas modifier leurs déclarations pour masquer le tracking.
- Actualiser la politique publique avec le texte validé avant publication App Store ; cette branche seule n’actualise pas l’URL publique.

## Sources primaires

- [Apple — définition du tracking et ATT](https://developer.apple.com/app-store/user-privacy-and-data-use/).
- [Google — données collectées par AdMob iOS](https://developers.google.com/admob/ios/privacy/data-disclosure).
- [Google — ATT et Publisher first-party ID](https://developers.google.com/admob/ios/privacy/strategies).
- [Google — UMP](https://developers.google.com/admob/ios/privacy).
- [Google — annonces personnalisées et non personnalisées](https://support.google.com/admob/answer/7676680).
- [Google — fournisseur 755 et consentements TCF](https://support.google.com/admob/answer/9999955).

Les règles et API ont été consultées le 11 octobre 2026. Les déclarations des SDK ne sont pas une preuve d’exécution sur un appareil.
