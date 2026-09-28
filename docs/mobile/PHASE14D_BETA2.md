# Android beta.2 — dossier final, sans distribution

Base mobile : `7febdc4c963346b84d5fe61f47ec7cf9bf8e1402`.
Textes web actifs : `510f5777a6053e354cfd2f630cbca376e097087a`.
Version `0.3.0-beta.2`, versionCode `2`, package `com.nailmoods.app`.

Les sources applicatives, dépendances, ressources OCR et adaptations natives
restent inchangées. Les pages légales sont reprises du web. Les archives et
anciens textes 0.1 restent sur le web mais sont exclus du paquet mobile ; les
liens historiques pointent vers leurs URL web absolues. Aucun consentement
enregistré n'est modifié.

Le build ne constitue pas une validation juridique. Les informations inconnues
(coordonnées publiques à confirmer, résidus des prestataires et procédure de
purge support) restent explicitement signalées dans les textes et le dossier.

Reproduire avec Node 22, JDK 21, SDK/build-tools 36 et le Gradle Wrapper fourni :

```sh
npm ci
NAILMOODS_MOBILE_ENV=production node scripts/build-mobile.mjs production
NAILMOODS_MOBILE_ENV=production npx cap sync android
npm run mobile:assets
./android/gradlew -p android -PnailmoodsEnvironment=production bundleRelease --console=plain
```

Le workflow `android-beta2-candidate.yml` exécute uniquement ce build Production.
Il ne rejoue pas la campagne Android déjà validée. Il conserve l'AAB non signé ;
signature hors CI avec la clé d'upload durable et le script de Phase 14C, après
contrôle du SHA-256 réel. Aucun secret ne doit entrer dans Git ou dans un log.

Avant remise : bundletool validate, signature stricte, certificat identique à
beta.1, package/version/environnement, comparaison de tous les OCR et différences
de contenu avec beta.1. Conserver les validations téléphone PASS de Marie.

Arrêt absolu : aucun import Play, envoi en revue, lancement ou invitation.

## Vérifications du candidat livré le 28 septembre 2026

Build CI : https://github.com/MowayMCR/NailMoods/actions/runs/36481380255
Commit compilé : a14262b7dbf2b0b9ecc2f966f2536d388fa82e0f.
AAB signé : NailMoods-Production-0.3.0-beta.2-release-SIGNE.aab.
38 052 120 octets ; SHA-256 :
e08f9c032a61957c43d62ac55c29d23d02d0f47d6dd4e7044a0b19183995056a.

Signature stricte et bundletool 1.18.3 : PASS.
Certificat identique à beta.1 :
58:4D:C4:C3:F4:77:C8:63:7C:CF:AF:FA:95:72:13:D8:41:25:07:34:B6:D6:67:70:D0:36:67:EE:4D:AE:08:C0.

16 fichiers OCR inchangés, 51 279 577 octets décompressés,
20 479 279 octets compressés. Aucun changement des sources fonctionnelles
ou dépendances. Les chunks JS sont identiques après normalisation du numéro
de version et des noms de chunks. Seul le manifest natif change de version.

Les 6 compositions Store existantes correspondent aux sources communes de
beta.2. Elles sont conservées, y compris la vue de recherche communautaire.
Les tests Android réels et PKCE restent acquis, sans nouvelle exécution.

Les réserves légales/coordonnées, conservation opérationnelle et prestataires,
comptes de revue effectifs et ciblage d'âge ne sont pas déclarés fermés.
Recommandation de distribution : NO GO jusqu'à résolution, puis validation de Marie.
Aucun import, envoi en revue, test fermé ou invitation effectué.

Le second workflow ne fait que transférer le même artefact en deux morceaux
compatibles avec la limite de téléchargement de l'environnement ; il ne
recompile ni ne modifie le bundle. Les SHA-256 des morceaux et de l'AAB
reconstitué ont été contrôlés. Le candidat de référence reste celui du run ci-dessus.
