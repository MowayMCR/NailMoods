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
