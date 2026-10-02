# NailMoods — préparation iOS du 2 octobre 2026

Cette livraison prépare les sources, pas une IPA signée ni une autorisation de publication. Lire d’abord `ACTIONS_MARIE_RESTANTES.md`, puis suivre `APPLE_SUBMISSION_STEPS.md` dans l’ordre.

Base réelle : `feat/google-play-billing-beta6`, commit `2ad90410549b5b0da31e2541d731742264f00717`. Branche de travail : `feat/apple-storekit-ios`. `main` est plus ancien ; partir de `main` perdrait la préparation Android. Aucune fusion dans Android/main n’est effectuée.

✅ Sources iOS générées avec Capacitor 8.5.2 ; StoreKit 2 natif, paywall, vérification serveur, modèle de droits indépendant et réconciliation écrits. Tests locaux et preuves : `APPLE_TEST_RESULTS.md` et `evidence/`.

🟡 Bundle proposé dérivé de l’identifiant Android : `com.nailmoods.app`. Ce n’est pas la preuve d’un identifiant Apple enregistré. Marie doit le confirmer avant toute création. Team ID, App ID numérique, contrats, prix, signature, vrais achats Sandbox, captures et compte de review restent nécessaires.

⛔ Cette machine Linux ne possède ni Xcode, ni certificats Apple, ni appareil iPhone. Aucune archive, compilation Swift, validation d’archive, IPA ou transaction Apple réelle n’est prétendue. Le workflow macOS fourni constitue une vérification à exécuter, pas une preuve de réussite.

❌ Le domaine officiel est protégé par Netlify au moment de la vérification sans connexion. Les routes légales existent dans le dépôt ; leur accessibilité publique sur ce domaine n’est pas acquise.

Les migrations légales/UGC changent un comportement partagé : les déployer avec les clients web/Android correspondants. Ne pas appliquer aveuglément une nouvelle version de consentement à des clients Android anciens.

## Démarrage technique

Node 22+, `npm ci`, `npm test`, `npm run ios:recette`. Les assets sont reconstruits à partir du symbole officiel existant. Sur Mac : ouvrir `ios/App/App.xcodeproj`, attendre la résolution Swift Package Manager, sélectionner le schéma App. Les scripts ne signent pas et ne publient rien.

Pour le TestFlight de l’application finale tout en utilisant Recette :

```sh
NAILMOODS_IOS_BUNDLE_ID=<BUNDLE_ID_VALIDE_PAR_MARIE> npm run ios:recette
```

Puis reconstruire explicitement avec `ios:production` pour la version de production. La configuration native/schéma d’URL est régénérée à chaque commande ; vérifier `dist-mobile/mobile-build.json` avant l’archive.
