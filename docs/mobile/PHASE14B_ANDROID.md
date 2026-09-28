# NailMoods — Android 0.3.0-beta.1 (versionCode 1)

Phase 14B uniquement. Aucune publication, soumission store, modification des backends ou promotion du web. La campagne fonctionnelle sur deux téléphones est déjà validée ; les essais ci-dessous concernent le wrapper.

## Une base de code

React/Vite demeure l'application. Capacitor 8 embarque `dist-mobile` dans Android ; aucun `server.url`. Les commandes web, leurs bases d'URL et leurs stockages ne changent pas. `src/entry.js` charge les adaptations uniquement dans le build natif. iOS n'est pas généré à ce jalon.

| Variante | Application ID / scheme | Backend existant | Nom |
| --- | --- | --- | --- |
| Production | `com.nailmoods.app` | `rvqmtnqvzzxzwfxfyjcg` | NailMoods |
| Recette | `com.nailmoods.app.recette` | `pueqkbwfwxgqzmkauxoz` | NailMoods Recette |

Les deux variantes peuvent coexister. La bêta est un canal de distribution ; elle ne crée pas de troisième backend. Un APK Production accède aux véritables comptes/données Production. Pour les essais destructifs, utiliser Recette et des comptes dédiés. Aucune mutation serveur n'est effectuée par les tests instrumentés.

Le versioning mobile est défini dans `scripts/build-mobile.mjs` et `vite.mobile.config.js`. Le package npm web reste à sa version historique. Tout futur binaire distribué doit incrémenter le versionCode.

## Compilation reproductible

Node 22+, npm avec `package-lock.json`, JDK 21, Android SDK 36 / build-tools 36, Android SDK command-line tools ; Gradle Wrapper 8.14.3 fourni. `ANDROID_HOME` et `JAVA_HOME` désignent les installations locales. Android minimum API 24, cible API 36.

Depuis la racine, pour Recette :

```bash
npm ci
npm test
export NAILMOODS_MOBILE_ENV=recette
node scripts/build-mobile.mjs "$NAILMOODS_MOBILE_ENV"
npx cap sync android
npm run mobile:assets
./android/gradlew -p android -PnailmoodsEnvironment="$NAILMOODS_MOBILE_ENV" assembleDebug bundleDebug bundleRelease --console=plain
python3 scripts/measure-android.py "$NAILMOODS_MOBILE_ENV"
```

Reprendre les commandes avec `NAILMOODS_MOBILE_ENV=production` pour Production. L'environnement est obligatoire ; Gradle refuse un désaccord entre variante demandée, métadonnées embarquées et identifiant Capacitor. Il refuse aussi une URL distante de démarrage.

Sorties : `android/app/build/outputs/apk/debug/app-debug.apk`, `bundle/debug/app-debug.aab` et `bundle/release/app-release.aab`. Installer l'APK avec `adb install -r chemin.apk`. Un AAB ne s'installe pas directement : il sert au traitement par bundletool/Play. Le workflow `android-beta.yml` reproduit ces étapes et conserve séparément APK, AAB, mesures et rapports. Il ne déploie rien.

Le script de mesure ouvre réellement les paquets ZIP, mesure leur taille, calcule SHA-256 et compare chaque fichier OCR à la source. Il ne déduit pas la taille d'un APK de la taille du build web. Toutes les variantes WASM et les langues français/anglais sont conservées. Android décompresse automatiquement les deux `.traineddata.gz` et supprime le suffixe `.gz` ; le natif charge les langues avec `gzip:false`. Le contrôle compare leur SHA-256 à la source décompressée, et compare les autres fichiers octet pour octet. Aucune langue ni variante WASM n’est supprimée.

## Signature et secrets

L'APK et l'AAB debug utilisent la clé debug générée par Android sur le runner. Elle n'est pas une clé de distribution pérenne ; deux runs peuvent avoir des certificats différents. Ne pas désinstaller une application contenant des brouillons pour contourner une incompatibilité de signature. Exporter/synchroniser d'abord ; pour les versions suivantes, configurer une clé de test stable dans un coffre de secrets.

Sans secrets, `bundleRelease` produit un **AAB release non signé**, non soumettable à Play. Le premier jalon fournit aussi un AAB debug signé pour les essais techniques. Aucun de ces fichiers n'est présenté comme prêt pour une publication store.

Pour une future signature release, créer et sauvegarder la clé d'upload hors dépôt, puis fournir uniquement au job autorisé :

- `NM_UPLOAD_KEYSTORE` : chemin vers le keystore temporaire ;
- `NM_UPLOAD_STORE_PASSWORD` ;
- `NM_UPLOAD_KEY_ALIAS` ;
- `NM_UPLOAD_KEY_PASSWORD`.

Utiliser un gestionnaire de secrets / secrets GitHub protégés, masquer les valeurs, limiter les accès et effacer les fichiers temporaires. Ne jamais mettre de secret dans Vite, les logs, le dépôt ou le binaire. Les clés Supabase publishable publiques restent les seules clés Supabase embarquées. Aucun service-role, secret serveur ni clé de signature n'est committé. Les keystores et fichiers locaux de SDK sont ignorés par Git.

## Authentification et liens email

Le même client Supabase et le même flux PKCE sont utilisés. Session et vérificateur PKCE sont stockés dans les Preferences privées de l'application ; ce n'est pas un second système d'authentification. Android désactive la sauvegarde/restauration système de ces données. Preferences n'ajoute pas de chiffrement applicatif : protection par le bac à sable Android.

Ajouter/vérifier les URL de retour ci-dessous dans **Auth → URL Configuration → Redirect URLs** de chaque projet Supabase, sans supprimer les URL web existantes et sans remplacer la Site URL web :

| Projet | Retours à autoriser |
| --- | --- |
| Production | `com.nailmoods.app://auth/callback?auth=callback` et `com.nailmoods.app://auth/callback?auth=recovery` |
| Recette | `com.nailmoods.app.recette://auth/callback?auth=callback` et `com.nailmoods.app.recette://auth/callback?auth=recovery` |

Les valeurs doivent être vérifiées dans le tableau de bord ; leur configuration distante n'a pas été attestée par l'accès disponible. Les modèles d'email doivent respecter la RedirectTo demandée. Une demande PKCE initiée dans l'application doit être terminée dans la **même installation/variante** : le vérificateur du navigateur web n'est pas celui de la WebView. Pour un lien échoué, relancer une demande depuis l'application.

Le manifeste enregistre le scheme propre à la variante ; le code valide scheme, host `auth`, chemin `/callback`, mode et code, rejette les fragments de jetons et l'autre environnement. Liens à froid et application ouverte passent par le même service d'échange. Les custom schemes restent une première solution bêta ; les liens HTTPS vérifiés (App Links / Universal Links) demanderont ultérieurement un domaine et les fichiers d'association. Aucun lien profil/publication n'est annoncé comme déjà pris en charge.

## Adaptations natives et données

- Caméra/galerie : pont vers les entrées photo existantes, sélection multiple seulement si autorisée, limite existante de quatre images. L'annulation garde le formulaire. Caméra via activité système, galerie via sélecteur système, sans demande de permission au premier lancement.
- `appRestoredResult` : écouteur Camera, copie privée durable, association au compte et au formulaire d'origine ; proposition « Réutiliser » après interruption. La simulation instrumentée ne remplace pas un vrai arrêt du processus par Android pendant la caméra.
- Retour : clavier/champ actif, puis modal/bottom sheet, puis historique, accueil, minimisation. Sauvegarde locale avant navigation ; une erreur de sauvegarde empêche cette sortie.
- Clavier : `adjustResize`, hauteur visible, défilement du champ et safe areas Android. La compatibilité des claviers constructeurs reste à tester sur appareil.
- Session : restauration existante, rafraîchissement démarré/arrêté avec le cycle de vie, reprise réseau. Un rejet d'authentification ne devient pas une session hors ligne.
- Données : le stockage web existant reste inchangé. Le natif ajoute des copies dans les fichiers privés, des écritures temporaires puis renommage, et un cache par compte compatible avec la file de synchronisation existante. Un échec réseau conserve la dernière copie connue ; un premier accès sans cache affiche une erreur et Réessayer.
- Reprise : checkpoint à la mise en arrière-plan et avant caméra/retour. Les résultats déjà produits et brouillons persistés peuvent être repris. Une opération réseau en vol n'est pas promise comme continuant après arrêt forcé ; elle doit être relancée, à partir du brouillon conservé. Les gros uploads interrompus ne deviennent pas des uploads segmentés par cette phase.
- Suppression de compte : le backend conserve ses règles existantes ; les copies natives du compte sont purgées, avec marqueur de nettoyage à reprendre après interruption.

Les **brouillons strictement locaux d'un navigateur ne migrent pas automatiquement** vers l'application. Les comptes et contenus déjà synchronisés restent récupérables après connexion. Ne pas vider les stockages web. Une désinstallation Android efface les données locales natives : synchroniser/exporter auparavant.

Aucun SDK notification, paiement ou tracking ajouté. Analytics et consentement existants conservés. Aucun achat fictif, aucune facturation store. Les icônes Android et le splash nude proviennent automatiquement de `public/nailmoods-symbol.png`, symbole officiel déjà présent, sans redessin.

## Vérifications ciblées

Automatique : tests Node existants + tests wrapper (isolation PKCE, retour, reprise média, écritures à réessayer, timeout) ; compilation des deux variantes ; intégrité des OCR dans chaque paquet ; manifeste/signature ; tests instrumentés sur émulateur API 35 (démarrage local, Preferences/fichiers privés, recréation, arrière-plan, retour modal, résultat caméra restauré simulé).

Avant distribution aux testeuses, compléter **uniquement** les essais wrapper non attestés :

1. Installation de l'APK voulu ; démarrage à froid et hors réseau, puis reconnexion.
2. Vraie caméra (Scan, Journal, produit), annulation/refus, galerie simple/multiple et format non accepté.
3. Activer « Ne pas conserver les activités » pour une première reprise caméra ; vérifier aussi l'arrêt réel du processus et le résultat restauré. Ne pas confondre les deux scénarios.
4. Clavier sur formulaire/recherche/message bas de page ; retour à chaque niveau sans perte de saisie.
5. Compte test : login/logout, expiration/reconnexion, email de confirmation et récupération PKCE à froid/à chaud dans chaque environnement.
6. Photo/upload et génération : couper le réseau, minimiser/verrouiller, relancer ; contrôler brouillon, résultat et absence de doublon après retry.
7. Vérification rapide des parcours critiques déjà validés (Créer, Pro/dessin, Journal, social, compte), sans relancer la campagne générale.

Le rapport de livraison distingue PASS automatique, FAIL et NON TESTÉ/BLOQUÉ. Ne pas cocher les tests téléphone ou les liens email réels sur la base des seuls tests simulés. Les exports via lien blob/download et les liens `mailto:` méritent aussi un essai Android, car leur gestion dépend de la WebView.

Arrêt après le rapport 14B : pas de captures/fiche store, pas de soumission, pas de publication publique et pas de bascule Production/Recette.
