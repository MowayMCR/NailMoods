# Préparation AdMob et confidentialité — 10 octobre 2026

Cette PR prépare le code et les documents. Elle ne déploie ni le site, ni les migrations, ni la fonction Edge, ni une application signée. Les blocs commerciaux Android/iOS sont enregistrés dans leurs fichiers de configuration ; les requêtes restent exclusivement sur les blocs de démonstration Google.

## Comportement ajouté

Le compte Free adulte éligible peut lancer explicitement une vidéo ou une bannière depuis les réglages de confidentialité, uniquement dans un build contenant `VITE_ADMOB_TEST_ENABLED=true` et lorsque `nm_ad_state` autorise `enabled=true, testOnly=true`. Ces conditions sont indépendantes ; cette PR n'active aucun indicateur serveur. Les paramètres par défaut restent désactivés. Un SDK reward ne crédite jamais le générateur.

La bannière fixe est isolée dans un dialogue plein écran, avec une zone réservée en haut. Elle est retirée à la fermeture, au démontage des réglages, à un changement de compte/offre, au refus et au passage en arrière-plan. Aucun redémarrage automatique au retour. Le SDK ne permet pas de fermer de force une vidéo plein écran déjà présentée : son bouton natif la ferme, et aucun crédit réel n'est attribué.

Le fil est actuellement réservé aux offres Plus/Pro. Son ancien emplacement sponsorisé factice est retiré : il ne constitue pas un emplacement Free. Aucun emplacement commercial dans le fil n'est ajouté.

Le contrôleur prend son verrou avant la lecture asynchrone des préférences, conserve le refus local, vérifie UMP avant toute initialisation publicitaire explicite et recontrôle les droits serveur. Une préparation terminée après une fermeture ne peut pas déclencher une vidéo ; une bannière attachée tardivement est retirée. Les changements de préférence sont sérialisés. La gestion UMP reste disponible sur les offres sans publicité. `canRequestAds` représente l'autorisation technique UMP de demander une annonce, pas une acceptation de personnalisation ; toutes les demandes test utilisent `npa:true`.

## Récompenses : préparation serveur, activation différée

- Migration additive `20261010115500_admob_consent_and_reward_guards.sql`, sans activation de configuration.
- Réservation authentifiée : réutilisation d'un ticket actif par compte/plateforme, expiration 30 minutes, contrôle Free/adulte/email confirmé/CGU/compte non suspendu/hors Institut actif, plafond quotidien UTC partagé entre plateformes.
- Le statut est visible uniquement par le propriétaire. Aucune API cliente ne peut confirmer une récompense.
- Seul le rôle serveur peut confirmer après vérification cryptographique SSV et correspondance de plateforme. Un rejeu exact est acquitté sans seconde écriture. Une transaction ne peut pas être attribuée à deux tickets. Les droits et le plafond sont revérifiés à la confirmation.
- Le vérificateur accepte le suffixe numérique `ad_unit` envoyé par Google pour un bloc explicitement configuré, tout en vérifiant la signature sur la chaîne brute originale. Les doublons, paramètres non signés, transactions excessives et montants invalides sont refusés.
- Une indisponibilité des clés Google ou de la base retourne 503 pour permettre une nouvelle tentative. Aucun secret n'est ajouté au dépôt.

Les crédits de génération commerciaux ne sont PAS activés ni consommables : il reste à relier une récompense confirmée à un avantage métier défini, avec consommation atomique unique dans le serveur du générateur. Définir aussi les montants/libellés autorisés, la conservation/purge des tickets et leur inclusion dans l'export de données avant un usage réel. Ne pas activer `test_only=false` ni `ADMOB_REWARDS_ENABLED=true` à ce stade. Les endpoints de réservation ne sont pas utilisés par les annonces de démonstration.

## Confidentialité et ordre de mise en service

La notice 0.9-beta décrit Google Mobile Ads/UMP, les données techniques possibles même en mode test, le refus local et les essais sans crédit. La notice 0.8 reste archivée. Le lien stable à saisir pour les deux applications AdMob est `https://nailmoods.com/legal/confidentialite.html`.

La notice, les versions frontend et la fonction SQL `nm_legal_versions` doivent être livrées ensemble. Les anciens choix ne sont pas réécrits. Les statistiques attendront une confirmation pour la nouvelle version. Le bouton général « Tout refuser » refuse également les essais publicitaires sur cet appareil.

1. Revoir puis publier le document public ; vérifier que l'URL stable présente bien 0.9-beta, accessible sans compte.
2. Appliquer la migration revue dans l'environnement voulu, sans activer la publicité commerciale, puis livrer le build correspondant.
3. Dans AdMob, vérifier pour les deux apps le lien, le français/anglais, le choix Refuser et le ciblage ; publier le message UMP après la notice publique. La dernière capture fournie montrait seulement un brouillon, deux apps et deux langues : les autres réglages restent à contrôler dans AdMob.
4. En environnement de test autorisé seulement, activer les essais (flag de build et configuration serveur test_only), puis vérifier UMP/bannière/vidéo sur Android, iPhone et iPad. Un build Recette utilise l'App ID Google de démonstration ; il ne valide pas le message attaché à l'App ID NailMoods. Pour ce message, utiliser un build de vérification avec l'App ID NailMoods et les seuls blocs de démonstration.
5. Vérifier les déclarations Play Data safety/App Store Privacy selon le binaire et les SDK effectifs, l'association des fiches publiques des stores et la validation app-ads.txt. La présence des ID n'est pas une approbation AdMob.

Si le futur endpoint SSV est déployé, le callback Google n'utilise pas de JWT utilisateur Supabase : configurer uniquement cette fonction pour recevoir les callbacks externes (`verify_jwt=false`), puis conserver impérativement sa signature Google et sa liste de blocs autorisés comme authentification. Ne jamais exposer la clé service_role. Ce déploiement reste hors de cette PR.

## Vérifications

`npm test` : 593 tests, 591 réussis, 2 tests d’intégration ignorés, aucun échec. Vérification ciblée finale : 21 tests réussis. Tests du contrôleur (courses asynchrones, refus, compte/offre, fermeture tardive), tests cryptographiques et tests SQL PGlite avec les rôles authenticated/anon/service_role. Vérifications de build embarqué Android/iOS et synchronisation Capacitor. Le build Android avec le flag de test explicite compile également. Le contrôle embarqué iOS exige le même `NAILMOODS_IOS_BUILD_NUMBER=30002` que sa préparation ; le contrôle est passé avec cette valeur, sans changement de numéro source. Le contrôle Deno de la fonction Edge reste à faire dans un environnement connecté : la résolution de la dépendance npm Supabase a échoué ici (connexion au registre refusée), avant l’analyse du module. Les builds locaux ne constituent ni un AAB/IPA signé ni une observation sur téléphone. Les contrôles natifs visuels, UMP réel, Apple ATT/IDFA absent et déclarations des stores restent nécessaires avant diffusion.

Sources primaires utilisées :
- https://developers.google.com/admob/android/test-ads
- https://developers.google.com/admob/ios/test-ads
- https://developers.google.com/admob/android/ssv
- https://developers.google.com/admob/ios/privacy/data-disclosure
- https://support.google.com/admob/answer/10113207
- Contrats et sources du plugin installé `@capacitor-community/admob@8.2.0`.
