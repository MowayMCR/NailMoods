# Configuration confidentielle Apple

Aucune clé Apple n’a été reçue ni installée. Ne transmettre aucune clé privée, mot de passe, certificat ou secret durable dans le chat, Git, frontend ou capture d’écran.

| Variable Supabase uniquement | Origine / valeur | Secret ? |
|---|---|---|
| APPLE_PRIVATE_KEY_P8 | contenu de la clé In-App Purchase téléchargée une seule fois | oui |
| APPLE_KEY_ID | identifiant de cette clé Apple | identifiant, côté serveur |
| APPLE_ISSUER_ID | Issuer ID de l’équipe App Store Connect | identifiant, côté serveur |
| APPLE_BUNDLE_ID | Bundle ID réellement enregistré, exact | non, doit correspondre au binaire |
| APPLE_APP_ID | Apple ID numérique de la fiche app, pas Team ID | non ; obligatoire Production |
| APPLE_ENVIRONMENTS | `Sandbox` en Recette ; `Production,Sandbox` pour la fiche finale avec review/TestFlight autorisés | non |
| APPLE_ROOT_CERTIFICATES_BASE64_JSON | tableau JSON de certificats racines Apple DER encodés base64 | public, trust store contrôlé |
| SUPABASE_SERVICE_ROLE_KEY | secret Edge fourni par Supabase, jamais embarqué | oui |

`<APPLE_TEAM_ID_A_FOURNIR>` est utilisé dans Xcode/signature, pas dans APPLE_APP_ID. `SUPABASE_ANON_KEY`/publishable key sont publiques par conception ; leur sécurité dépend de RLS, pas de leur dissimulation.

## Installer sans divulguer

1. App Store Connect → Users and Access → Integrations → In-App Purchase → générer la clé (Account Holder/Admin habilité). Relever Issuer ID et Key ID. Télécharger le fichier `.p8` une seule fois et le conserver dans un coffre.
2. Télécharger les certificats racines depuis [Apple PKI](https://www.apple.com/certificateauthority/), vérifier qu’il s’agit bien des racines Apple officielles recommandées par la bibliothèque, notamment Apple Root CA G3/G2 lorsque nécessaires. Jamais prendre les racines d’un JWS reçu.
3. Sur le poste de Marie, créer un fichier de secrets local hors dépôt, mode 600. Le script `scripts/prepare-apple-secrets.mjs` lit les fichiers locaux : son aide expose seulement les paramètres. Il n’écrit ni n’affiche de secret tant que les paramètres ne sont pas fournis.
4. `supabase login`, puis `supabase secrets set --project-ref <PROJET_CHOISI> --env-file <FICHIER_CONFIDENTIEL_LOCAL>` ; contrôler le projet avant validation. L’authentification se fait localement. Ne pas publier le fichier ni la sortie détaillée du coffre.
5. Dans Supabase → Edge Functions → Secrets, vérifier les noms présents sans révéler les valeurs ; redéployer les fonctions si nécessaire. Restreindre les membres de projet. Révoquer une clé compromise et remplacer son secret.
6. Effacer le fichier temporaire selon les règles du poste après import, conserver seulement le `.p8` dans le coffre. Ne pas ajouter `VITE_APPLE_*`, `.p8` ou service role au bundle.

Retour attendu de Marie dans la conversation : Team ID, Bundle ID validé, Apple ID numérique de l’app, IDs groupe/produits, durée/prix choisis, confirmation que les secrets ont été installés dans le bon projet et messages d’erreur expurgés. Pas le contenu du `.p8`.
