# Préparation AdMob et confidentialité — 10 octobre 2026

La livraison du 10 octobre est autorisée. Les deux migrations sont appliquées et contrôlées en recette puis en production ; la publication du site et les livraisons natives sont suivies par les workflows. La fonction Edge commerciale reste hors déploiement. Les blocs commerciaux Android/iOS sont enregistrés dans leurs fichiers de configuration ; les requêtes restent exclusivement sur les blocs de démonstration Google.

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
2. Les deux migrations ont été appliquées en recette puis en production, compatibilité legacy en premier. Les notices 0.8 et 0.9 sont acceptées pendant la transition, le consentement réellement présenté est enregistré, et un ancien client ne peut pas activer les statistiques. Les deux plateformes conservent enabled=false et test_only=true. Livrer le build correspondant.
3. Dans AdMob, vérifier pour les deux apps le lien, le français/anglais, le choix Refuser et le ciblage ; publier le message UMP après la notice publique. La dernière capture fournie montrait seulement un brouillon, deux apps et deux langues : les autres réglages restent à contrôler dans AdMob.
4. En environnement de test autorisé seulement, activer les essais (flag de build et configuration serveur test_only), puis vérifier UMP/bannière/vidéo sur Android, iPhone et iPad. Un build Recette utilise l'App ID Google de démonstration ; il ne valide pas le message attaché à l'App ID NailMoods. Pour ce message, utiliser un build de vérification avec l'App ID NailMoods et les seuls blocs de démonstration.
5. Vérifier les déclarations Play Data safety/App Store Privacy selon le binaire et les SDK effectifs, l'association des fiches publiques des stores et la validation app-ads.txt. La présence des ID n'est pas une approbation AdMob.

Si le futur endpoint SSV est déployé, le callback Google n'utilise pas de JWT utilisateur Supabase : configurer uniquement cette fonction pour recevoir les callbacks externes (`verify_jwt=false`), puis conserver impérativement sa signature Google et sa liste de blocs autorisés comme authentification. Ne jamais exposer la clé service_role. Ce déploiement reste hors de cette PR.

## Vérifications

Les tests applicatifs, cryptographiques et SQL PGlite passent, y compris la compatibilité des anciens clients. Le contrôle Deno du serveur AdMob est réussi dans GitHub Actions. Les compilations natives sont suivies dans le workflow AdMob beta ; elles ne remplacent pas les essais UMP et annonces sur appareil réel.

Android cible le code 14 (le code 13 a déjà été livré), Apple le build 30003. Le manifeste Android compilé et les archives Apple doivent contenir les App IDs NailMoods et l'initialisation de mesure différée. Les requêtes publicitaires restent des annonces Google de démonstration. La clé Android historique a été retrouvée et son certificat contrôlé ; en l'absence de secrets Android complets dans GitHub, la signature est réalisée hors dépôt après téléchargement du bundle CI.

Le conseiller sécurité ne relève pas de nouvelle catégorie d'avertissement après les migrations. Les avertissements préexistants restent suivis :
- https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Sources primaires utilisées :
- https://developers.google.com/admob/android/test-ads
- https://developers.google.com/admob/ios/test-ads
- https://developers.google.com/admob/android/ssv
- https://developers.google.com/admob/ios/privacy/data-disclosure
- https://support.google.com/admob/answer/10113207
- Contrats et sources du plugin installé `@capacitor-community/admob@8.2.0`.
