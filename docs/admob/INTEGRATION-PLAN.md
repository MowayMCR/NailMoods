# NailMoods — préparation AdMob (Android / iOS)

État : **spécification d'intégration seulement, aucune publicité activée**. Les identifiants ci-dessous proviennent des écrans AdMob fournis par la propriétaire le 9 octobre 2026. Le code et les builds natifs doivent encore être implémentés et testés.

## Identifiants officiels (ne PAS utiliser pour des impressions de test)

| Plateforme | Application | Rewarded | Bannière |
|---|---|---|---|
| Android | `ca-app-pub-3166441503282113~3147657999` | `ca-app-pub-3166441503282113/4704282245` | `ca-app-pub-3166441503282113/1643004637` |
| iOS | `ca-app-pub-3166441503282113~5431040554` | `ca-app-pub-3166441503282113/9702650022` | `ca-app-pub-3166441503282113/6320616240` |

L'application contient déjà la structure Capacitor Android/iOS, mais pas de dépendance Google Mobile Ads dans le `package.json` observé. Prévoir une dépendance native maintenue compatible Capacitor 8, une configuration propre aux deux plateformes et une interface partagée.

## Règles métier validées

- Free uniquement : bannière adaptative sur Accueil et Fil ; au maximum une à l'écran, hors zones interactives, respect des safe areas iPhone/iPad/tablettes.
- Free : annonce récompensée volontaire pour débloquer **une génération supplémentaire**, avec limites serveur et remise de la récompense uniquement après preuve de complétion/validation fiable. Aucun droit octroyé par le seul client.
- Plus, Pro individuel, Salon et droits manuels équivalents : zéro publicité et zéro invitation à regarder une publicité.
- Aucune annonce dans Créer, Collection, Mes poses, livre scrapbooking, profil/galerie/vitrine PO/Salon, paiement, compte, onboarding ou parcours critiques.
- Interstitiels : hors périmètre, aucune création automatique.
- Aucune annonce réelle pendant la bêta ; utiliser les annonces de test documentées par Google ou des appareils de test correctement configurés ; ne jamais émettre de requêtes de test avec les identifiants réels par défaut.
- Activation distante séparée par plateforme et par format, état initial OFF. L'absence de configuration, de consentement ou de réseau échoue en mode fermé et ne bloque pas les fonctions gratuites.

## Conformité et garde-fous avant activation

- Implémenter le recueil/retrait du consentement avec une CMP certifiée applicable aux utilisateurs EEE/Royaume-Uni/Suisse ; politique de confidentialité et Google Play Data safety / Apple App Privacy à mettre à jour.
- Sur iOS, ne demander ATT que si l'application effectue du suivi soumis à ATT ; pas de suivi sans autorisation ; prendre en charge les annonces non personnalisées dans le cadre applicable.
- Les catégories « beauté » peuvent être privilégiées seulement dans les limites des fonctionnalités réelles AdMob, sans prétendre à un ciblage beauté garanti.
- Configurer `https://nailmoods.com/app-ads.txt` avec la ligne `google.com, pub-3166441503282113, DIRECT, f08c47fec0942fa0`, déjà ajoutée à `public/app-ads.txt` ; attendre propagation DNS/HTTPS et validation AdMob. Ne pas modifier MX/SPF/DKIM/Resend.
- Test end-to-end : Free/Plus/Pro/Salon, droits manuels, refus/retrait consentement, iPhone et iPad portrait/paysage, Android téléphone/tablette, reprise hors ligne, fréquence des requêtes et limites de récompenses, aucune régression App Store / Google Play.

## Travail de développement restant

1. Auditer la navigation actuelle, l'offre active serveur et la logique de génération Free.
2. Créer adaptateur natif Ads avec `isAvailable`, `showBanner`, `hideBanner`, `showRewarded`, sans impression hors plateformes prises en charge.
3. Intégrer les SDK natifs Android/iOS avec IDs d'application corrects, **IDs d'annonces de test en bêta** ; bloquer production par défaut.
4. Brancher la couche commune seulement sur Accueil/Fil pour Free ; choix volontaire de Rewarded avec vérification de la récompense côté serveur (SSV ou mécanisme antifraude approprié).
5. Effectuer les tests CI et appareils réels, fournir preuves et captures, puis propager aux branches stores. Pas de déploiement public ni d'activation réelle sans accord explicite.

Ce fichier est un **cadrage de mise en œuvre** ; il ne remplace ni l'intégration SDK ni ses tests.
