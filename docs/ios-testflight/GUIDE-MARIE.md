# NailMoods iOS Beta 1 — de Windows à ton iPad

Procédure préparée le 5 octobre 2026. Aucun Mac local nécessaire. Le code iOS reste sur `feat/ios-testflight-beta1` ; la PR technique est [#11](https://github.com/MowayMCR/NailMoods/pull/11). Le workflow prépare un build TestFlight, sans soumission à la distribution publique.

## 1. Ce qui est prêt, ce qui attend Apple

Le projet Capacitor 8.5.2 et son projet Xcode sont corrigés pour iPhone/iPad. Version commerciale : **0.8.0**. Le numéro Apple est indépendant du code Android 9. Le runner sélectionne **Xcode 26.3 / SDK 26.2** ; iOS/iPadOS **16 minimum**. Les achats utilisent StoreKit 2 sur iOS ; Google Billing est exclu du bundle. IA+ reste fermé dans ce build. Les fonctions `apple-verify` et `apple-notifications` sont déployées, avec les achats désactivés ; les migrations Apple et le cron étaient déjà présents.

Le workflow a deux modes : `verify` compile et contrôle sans aucun secret Apple ; `testflight` ajoute signature, export IPA, validation et envoi à Apple. La signature, l'envoi et l'installation ne peuvent pas être vérifiés avant les credentials et l'accès à ton compte Apple. Le premier essai peut porter sur Free et les droits manuels existants, avec les abonnements Apple encore fermés.

## 2. Vérifier l'identité avant de créer quoi que ce soit

1. Depuis Windows, ouvre [Apple Developer Account](https://developer.apple.com/account/). Connecte-toi avec le compte membre du programme Apple Developer de NailMoods. Vérifie l'adhésion active et les accords en attente. Le compte gratuit seul ne permet pas TestFlight.
2. Dans **Membership details**, relève le **Team ID** de 10 caractères. Il sera saisi directement dans GitHub Secrets, pas dans ChatGPT.
3. Ouvre **Certificates, Identifiers & Profiles → Identifiers**. Recherche NailMoods et son identifiant explicite.
4. Ouvre [App Store Connect](https://appstoreconnect.apple.com/) → **Apps → NailMoods → General → App Information**. Si l'app existe, relève son **Bundle ID** et son **Apple ID numérique**. Le Bundle ID App Store Connect est définitif après association de l'app ; il doit correspondre à celui de Developer et au profil.
5. Le code contient déjà `com.nailmoods.app`. **Ce n'est pas une preuve d'enregistrement Apple.** S'il existe une autre identité Apple NailMoods, réutilise-la et saisis cette valeur dans la variable GitHub `IOS_BUNDLE_ID`. N'en crée pas une seconde.
6. Si aucune identité n'existe : la recommandation est l'identifiant explicite **`com.nailmoods.app`**, sous réserve de sa disponibilité. Après ta décision, **Identifiers → + → App IDs → App → Continue**, description `NailMoods`, Explicit Bundle ID `com.nailmoods.app`, vérifie la capacité **In-App Purchase**, puis **Continue → Register**. Pas de Push Notifications, Sign in with Apple, Associated Domains, microphone ou géolocalisation à ajouter pour cette version.
7. Si l'app n'existe pas dans Connect : **Apps → + → New App**, plateforme iOS, nom `NailMoods`, langue principale French, Bundle ID sélectionné ci-dessus, SKU interne stable (par exemple `nailmoods-ios` si aucun SKU existant), accès aux personnes concernées. Le SKU n'est ni le Bundle ID ni un Product ID d'abonnement. Ne crée pas une fiche doublon si Apple en possède déjà une.

## 3. Préparer le certificat sur Windows

Si tu possèdes déjà un **Apple Distribution** valide ET son fichier P12 avec la clé privée, utilise-les. Un `.cer` seul n'est pas suffisant. Si la clé privée est sur un ancien Mac, il faut exporter le P12 depuis cet ordinateur ou créer un certificat CI autorisé ; télécharger à nouveau le `.cer` ne reconstitue pas la clé.

### Télécharger les scripts

Dans [la branche iOS](https://github.com/MowayMCR/NailMoods/tree/feat/ios-testflight-beta1), **Code → Download ZIP**, décompresse, puis ouvre Windows PowerShell dans ce dossier. Les scripts se trouvent dans `scripts/windows`. Ils utilisent les outils Windows natifs ; ils n'installent pas Xcode ou OpenSSL.

### Créer la CSR, puis le certificat Apple

1. Dans PowerShell, depuis la racine du dépôt décompressé :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\New-AppleSigningRequest.ps1
```

2. Le script crée `%USERPROFILE%\NailMoods-Apple-Secrets\NailMoods.certSigningRequest`. C'est la demande publique à envoyer à Apple. La **clé privée reste dans le magasin de certificats du même utilisateur Windows**. Conserve ce PC et ce profil Windows jusqu'à l'export du P12. Le script refuse d'écraser une CSR existante.
3. Developer → **Certificates, Identifiers & Profiles → Certificates → + → Software → Apple Distribution → Continue**. Envoie la CSR. **Continue → Download** : télécharge le `.cer` dans le dossier privé précédent. Ne sélectionne pas Apple Development, Developer ID ou un certificat push.
4. Dans PowerShell, indique le chemin réel du `.cer` reçu :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\Export-AppleDistribution.ps1 -Certificate "$env:USERPROFILE\NailMoods-Apple-Secrets\distribution.cer"
```

5. Choisis le mot de passe P12 à l'invite masquée et conserve-le dans ton gestionnaire de mots de passe. Le script associe le certificat à la clé de la CSR et crée `NailMoods-Distribution.p12`. Une erreur « clé privée introuvable » signifie que le certificat n'a pas été généré avec cette CSR sur ce profil Windows. Ne contourne pas cette vérification.
6. Les scripts sont préparés à partir de la documentation Microsoft ; leur exécution avec ton certificat Apple doit encore être vérifiée sur ton Windows. Si `certreq` ou l'export échoue, conserve le message d'erreur sans copier la clé ou le mot de passe dans le chat.

## 4. Créer le profil App Store Connect

Developer → **Certificates, Identifiers & Profiles → Profiles → +** :

1. Distribution → **App Store Connect** (certaines vues indiquent encore App Store), puis Continue.
2. Choisis **l'App ID explicite NailMoods exact**.
3. Sélectionne le certificat Apple Distribution correspondant au P12 ci-dessus.
4. N'ajoute pas d'UDID iPad : un profil TestFlight/App Store n'est ni un profil Development ni Ad Hoc.
5. Nom lisible, par exemple `NailMoods App Store CI` ; Generate → Download. Conserve le `.mobileprovision` dans ton dossier privé Windows.

Le pipeline contrôle l'identité, le certificat associé, l'expiration et le type de profil avant d'archiver. Un profil d'une autre équipe, d'une autre app ou de développement sera refusé.

## 5. Créer la clé d'upload App Store Connect

Cette clé sert à envoyer l'IPA. Elle est **distincte** de la clé In-App Purchase de la section 9.

1. Connect → **Users and Access → Integrations → App Store Connect API → Team Keys**.
2. Si l'API n'a jamais été activée, le titulaire doit cliquer **Request Access** et accepter les conditions.
3. **Generate API Key**, nom `NailMoods GitHub TestFlight`, rôle **Developer** permettant l'upload. Si l'organisation impose un autre rôle ou une restriction, vérifie avec son titulaire ; n'utilise pas un compte administrateur personnel dans la CI.
4. Relève **Key ID** et **Issuer ID**. Télécharge le fichier `.p8` : Apple permet son téléchargement une seule fois. Conserve-le dans le dossier privé et dans une sauvegarde chiffrée.

L'upload utilise `xcrun altool --validate-app` puis `--upload-app` avec cette API key. La documentation Apple actuelle liste toujours cette méthode comme supportée. Aucun mot de passe Apple ID ni mot de passe spécifique à une app n'est nécessaire pour ce workflow.

## 6. Saisir exactement les sept secrets GitHub

Ouvre [NailMoods sur GitHub](https://github.com/MowayMCR/NailMoods) → **Settings → Secrets and variables → Actions → Secrets → New repository secret**. Le nom doit être exact.

| Nom | Valeur à saisir directement |
|---|---|
| `APPLE_TEAM_ID` | Team ID Developer de 10 caractères |
| `APPLE_DISTRIBUTION_P12_BASE64` | Contenu **base64** du fichier P12, pas son chemin |
| `APPLE_DISTRIBUTION_P12_PASSWORD` | Mot de passe choisi à l'export du P12 |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Contenu **base64** du `.mobileprovision` |
| `APP_STORE_CONNECT_KEY_ID` | Key ID de la clé d'upload |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID de la clé d'upload |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Texte PEM complet du `.p8`, lignes BEGIN/END incluses, avec vraies lignes |

Pour copier un fichier sans afficher sa valeur dans le terminal, utilise :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\Copy-AppleSecret.ps1 -File "$env:USERPROFILE\NailMoods-Apple-Secrets\NailMoods-Distribution.p12" -Format base64
```

Colle immédiatement dans la valeur de `APPLE_DISTRIBUTION_P12_BASE64`, puis **Add secret**. Répète avec le `.mobileprovision` et `-Format base64`, puis avec le `.p8` et `-Format pem`. Après chaque collage : `Set-Clipboard -Value ''`. Ne colle jamais ces contenus dans une issue, une PR, un fichier du dépôt ou ChatGPT. Les scripts de signature ne journalisent pas ces valeurs et nettoient les fichiers temporaires même si la compilation échoue.

Dans **Settings → Secrets and variables → Actions → Variables → New repository variable**, ajoute :

| Variable | Valeur |
|---|---|
| `IOS_BUNDLE_ID` | L'identité Apple **vérifiée**, normalement `com.nailmoods.app` si c'est celle enregistrée |
| `IOS_BUNDLE_ID_CONFIRMED` | `true`, seulement après vérification Developer / Connect / profil |
| `IOS_XCODE_VERSION` | Facultative : `26.3` ; c'est déjà la valeur par défaut |

Il n'y a pas de secret Supabase service role à ajouter dans GitHub. Les secrets achats restent exclusivement côté serveur Supabase.

## 7. Lancer depuis Windows

1. GitHub → **Actions → Build NailMoods iOS / TestFlight → Run workflow**.
2. Sélectionne **main** pour le lanceur. Il appelle le workflow complet et checkout la branche dédiée `feat/ios-testflight-beta1` ; il ne compile pas l'ancienne UI de main. La présence du lanceur sur la branche par défaut est nécessaire à l'affichage du bouton GitHub.
3. Première exécution : `mode = verify`, numéro facultatif vide, **Run workflow**. Les jobs doivent tous être verts : tests communs et responsive, Android, puis compilation/simulateurs/archive iOS. Ce mode ne signe ni n'envoie rien.
4. Après les sept secrets et les variables : `mode = testflight`. Laisse le build vide pour utiliser **10000 + numéro de run GitHub**, sauf si ce numéro est déjà utilisé pour 0.8.0 dans Connect. Dans ce cas, entre un entier inédit supérieur au dernier build Apple. Ne réutilise jamais un numéro envoyé, même si tu relances un job.
5. Ouvre le run. Attends la réussite de **Archive, export and verify signed IPA**, puis **Validate and upload to App Store Connect (TestFlight only)**. L'acceptation de l'upload n'est pas encore la fin du traitement Apple.
6. En bas du run, **Artifacts → NailMoods-iOS-Beta1-…** contient logs, inspections, captures, `commit.txt`, `build-number.txt` et, en mode signé, IPA/dSYM/checksums. Télécharge avant les **14 jours** de rétention. Les résultats Android de contrôle sont conservés 7 jours.

Le workflow ne crée pas de fiche App Store ni de produits Apple, n'accepte pas les contrats à ta place et ne clique pas sur Submit for Review ou Release This Version.

## 8. Trouver le build et installer sur ton iPad

1. Connect → **Apps → NailMoods → TestFlight → iOS Builds**. Attends la fin de **Processing** ; consulte l'email Apple si le build est refusé. Aucun délai fixe de traitement n'est garanti.
2. Si **Missing Compliance** apparaît, ouvre le build → **Manage** et réponds selon la section Chiffrement de `CONFORMITE.md` : le client utilise les services cryptographiques standards du système/HTTPS, pas d'algorithme propriétaire ou de chiffrement non exempt. Si la question ne correspond pas à cette description ou si Apple réclame un document, arrête cette réponse et vérifie sa demande précise.
3. **Users and Access → People** : ton Apple ID doit être utilisateur Connect avec un rôle autorisé au test interne (Account Holder/Admin/App Manager/Developer/Marketing), accès à NailMoods et invitation acceptée. L'Apple ID pour TestFlight et l'email du compte NailMoods dans l'app peuvent être différents.
4. **Apps → NailMoods → TestFlight → Internal Testing → +** : groupe `Marie iPad`, ajoute ton utilisateur, puis **Add Build** et sélectionne 0.8.0 avec le bon numéro. Suis l'invitation TestFlight. Aucun recrutement externe ou Beta App Review n'est nécessaire pour cette première distribution interne.
5. Sur iPad, App Store → installe **TestFlight** d'Apple. Connecte l'iPad à l'Apple ID interne invité, ouvre l'invitation, Accept → Install NailMoods.
6. Dans TestFlight, vérifie **Version 0.8.0 (numéro du run)**. Dans l'app, le nom doit être NailMoods ; compare au `build-number.txt`. Les builds TestFlight expirent après 90 jours.
7. Exécute la recette `RECETTE-IPAD.md`. Commence avec un compte jetable, puis ton compte habituel. Ne teste pas la suppression sur ton compte personnel.

## 9. Préparer les abonnements sans bloquer le premier essai

Le premier TestFlight peut fonctionner avec Free/accès manuels et achats Apple fermés. La suite est nécessaire pour tester de vrais achats **Sandbox**, et doit précéder toute ouverture commerciale.

### Produits Apple

Connect → Apps → NailMoods → **Monetization → Subscriptions** : vérifie d'abord les produits existants. Le code attend `nailmoods_plus` et `nailmoods_pro`. Si Apple possède d'autres IDs, ne crée pas de doublons : il faut adapter simultanément le plugin Swift, le client et la contrainte SQL serveur avant de reconstruire. Le Product ID Apple ne se renomme pas.

Si aucun produit n'existe et après ta validation de cette convention : crée **un groupe NailMoods**, puis les deux abonnements, noms NailMoods Plus / NailMoods Pro, IDs exacts ci-dessus. Choisis la durée et les prix décidés par toi ; ils n'ont pas été inventés ici. L'UI lit prix et période depuis StoreKit. Ajoute localisation française, description, disponibilité et capture de l'écran d'offre. **Pro : niveau 1 ; Plus : niveau 2** dans le classement du groupe. N'active pas Family Sharing pour cette offre individuelle.

Pour **chaque** produit : **Purchase Options → Edit → Allow users to purchase multiple seats → No → Save**. L'option multiseat est actuellement activée par défaut lors de la création ; il faut la contrôler explicitement. Aucun SKU IA+.

Connect → **Business → Agreements** : accepte Paid Apps Agreement si requis, complète Tax et Banking. Sans contrats/produits prêts, StoreKit peut ne renvoyer aucune offre. Cela ne doit pas empêcher Free de fonctionner.

### Clé serveur achats et secrets Supabase

Connect → **Users and Access → Integrations → In-App Purchase → Generate In-App Purchase Key**. Télécharge la clé `.p8` et relève Key ID/Issuer ID. C'est la clé App Store Server API, **pas** celle de la section 5. Si une clé IAP existe déjà et est disponible, réutilise-la.

[Supabase Dashboard](https://supabase.com/dashboard/project/rvqmtnqvzzxzwfxfyjcg) → **Edge Functions → Secrets → Add new secret** :

| Secret serveur | Valeur |
|---|---|
| `APPLE_BUNDLE_ID` | Bundle ID Apple exact, égal à GitHub `IOS_BUNDLE_ID` |
| `APPLE_PRIVATE_KEY_P8` | PEM complet de la clé **In-App Purchase**, vraies lignes |
| `APPLE_KEY_ID` | Key ID In-App Purchase |
| `APPLE_ISSUER_ID` | Issuer ID In-App Purchase |
| `APPLE_APP_ID` | Apple ID numérique de l'app dans Connect ; obligatoire pour Production |
| `APPLE_ENVIRONMENTS` | `Sandbox` pour cette recette ; ajouter Production seulement après validation et décision d'ouverture |
| `APPLE_ROOT_CERTIFICATES_BASE64_JSON` | Tableau JSON des certificats racines DER Apple fiables, encodés base64 ; préparation expliquée ci-dessous |

Les racines doivent venir de [Apple PKI](https://www.apple.com/certificateauthority/), rubrique Apple Root Certificates (racines G2/G3 utilisées par la chaîne Apple). Télécharger les `.cer` officiels. Dans PowerShell :

```powershell
$rootFiles = @('C:\CHEMIN-PRIVE\AppleRootCA-G2.cer', 'C:\CHEMIN-PRIVE\AppleRootCA-G3.cer')
$roots = @($rootFiles | ForEach-Object { [Convert]::ToBase64String([IO.File]::ReadAllBytes($_)) })
ConvertTo-Json -InputObject $roots -Compress | Set-Clipboard
```

Colle le tableau dans `APPLE_ROOT_CERTIFICATES_BASE64_JSON`. Les certificats racines sont publics ; la clé `.p8` reste privée. Ne prends jamais une racine fournie dans une notification entrante. Le serveur vérifie la chaîne, l'application, l'environnement et la révocation en ligne.

### Notifications et activation contrôlée

Connect → Apps → NailMoods → **General → App Information → App Store Server Notifications** : URL Sandbox `https://rvqmtnqvzzxzwfxfyjcg.supabase.co/functions/v1/apple-notifications`, **Version 2**. Prépare la même URL Production sans ouvrir les achats Production. Une notification Apple signée TEST devra obtenir HTTP 200 ; un faux payload est refusé.

La préparation conserve `private.apple_settings.enabled=false`. Une fois les produits, secrets et comptes de test prêts, ouvre Supabase → **SQL Editor → New query**, avec ton rôle propriétaire. Utilise le script d'activation décrit dans `STOREKIT.md` : environnement serveur uniquement Sandbox, autorisation Sandbox pour **un compte NailMoods jetable identifié**, URL de réconciliation et flag Apple. N'active pas globalement tous les comptes. Le cron de réconciliation est déjà installé toutes les 5 minutes. Aucun droit manuel existant ne doit être modifié. Les achats dans une app TestFlight utilisent Sandbox ; ne paient pas un abonnement réel.

Teste achat Plus, upgrade Pro, downgrade, restauration même compte/autre compte, expiration, grâce, révocation et compte avec droit manuel. Puis referme le flag Apple si la recette échoue. Conserve les résultats, pas les clés, et demande la poursuite avec le numéro de run et les messages non sensibles.

## 10. Authentification et préparation App Review

Supabase → **Authentication → URL Configuration → Redirect URLs** : vérifie/ajoute les deux URLs exactes `com.nailmoods.app://auth/callback?auth=callback` et `com.nailmoods.app://auth/callback?auth=recovery`, en conservant les URLs web existantes. Le schéma d'authentification historique reste identique même si le Bundle ID enregistré diffère. Le Site URL doit rester l'URL web NailMoods actuelle, pas être remplacé par le schéma mobile. Le code ne configure pas Universal Links ; ne coche pas Associated Domains pour prétendre les activer.

Sur le même iPad, création compte → email dans Mail/Safari → confirmation → retour à NailMoods → session/onboarding. Puis Mot de passe oublié, lancement à froid, lien expiré, déconnexion/reconnexion et connexion sur un second appareil. Les liens PKCE doivent être terminés sur l'appareil ayant commencé le parcours. Un lien ancien/incomplet doit donner une erreur contrôlée, jamais une session d'un autre compte.

Prépare un **compte Apple Review non staff**, dans l'app par le parcours normal : email dédié que tu contrôles, mot de passe créé dans ton gestionnaire hors chat, email confirmé, déclaration 18+, CGU acceptées, onboarding terminé. Un compte Free suffit au premier test interne ; pour une revue future, ajouter un second compte Plus/Pro offert selon la procédure d'entitlements existante, sans en faire un administrateur. N'utilise pas ton compte Marie. Renseigne email/mot de passe uniquement dans **App Review Information** ou **TestFlight → Test Information → Beta App Review Information** si une revue externe est ensuite demandée. Le brouillon `APP-REVIEW.md` explique les fonctions et doit être complété avec les vrais comptes.

La déclaration App Privacy, le questionnaire d'âge et le statut Trader DSA sont préparés dans les annexes. Le DSA de distribution publique UE ne doit pas bloquer ce TestFlight interne. Ne remplis pas artificiellement le questionnaire avec de la violence ou du contenu sexuel pour obtenir 18+ ; indique les fonctions réelles et, si nécessaire, utilise le mécanisme Apple de classement minimum adapté à la restriction contractuelle.

## 11. Diagnostiquer sans refaire tout le projet

| Échec | Contrôle précis |
|---|---|
| Pas de bouton Run workflow | Ouvrir le workflow sur main ; le lanceur doit être présent sur la branche par défaut |
| Secret manquant | Relire le nom exact dans Settings → Secrets and variables → Actions ; pas dans Variables |
| Certificat/profil incompatible | Team, Bundle ID, certificat sélectionné dans le profil et P12 de la même CSR |
| Profil expiré | Régénérer le profil App Store avec le certificat valide ; remplacer seulement son secret |
| Xcode/SDK refusé | Relire `toolchain.log` ; ne pas contourner le contrôle SDK ≥26 |
| Numéro déjà utilisé | Nouveau Run workflow avec un nouveau build, pas simplement Re-run du build envoyé |
| Upload unauthorized | Key ID/Issuer ID/p8 de la même clé d'upload, API active, rôle autorisé, accords acceptés |
| Build absent de TestFlight | Processing/email Apple, app/Bundle ID/Team exacts, statut upload dans les logs |
| Abonnements indisponibles | Normal si flag fermé ; sinon produits, contrats, clé IAP serveur, environnement et compte Sandbox |
| Confirmation email sans retour | Deux redirects Supabase, lien récent commencé sur le même appareil, schéma installé |
| Caméra refusée | Réglages iPad → Apps → NailMoods → Appareil photo ; galerie PHPicker ne demande pas l'accès global Photos |

Après ajout des credentials, l'étape attendue est un run `testflight` vert, le numéro de build dans Connect et la recette sur ton iPad. Ne communique que les résultats et erreurs non sensibles. Aucun secret n'est attendu dans ChatGPT.
