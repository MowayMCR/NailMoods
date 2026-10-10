# Configuration AdMob Android — 10 octobre 2026

Identifiants communiqués par Marie depuis AdMob le 10 octobre 2026.
Source de configuration : `src/ads/android-config.json`.

| Usage | Identifiant |
| --- | --- |
| Application Android Nailmoods | `ca-app-pub-3166441503282113~3147657999` |
| NailMoods_Free_Banner_Android | `ca-app-pub-3166441503282113/1643004637` |
| NailMoods_Free_Rewarded_Android | `ca-app-pub-3166441503282113/4704282245` |

## Configuration des identifiants (première étape)

- Gradle lit l'identifiant d'application depuis le JSON pour les builds
  `production` (`com.nailmoods.app`), y compris les bêtas fermées.
- Les builds `recette` conservent l'identifiant d'application de démonstration
  Google. Le manifeste reçoit sa valeur via `nailmoodsAdMobAppId`.
- Les deux blocs commerciaux sont enregistrés pour la prochaine étape ; ils
  ne sont pas utilisés pour charger des annonces dans cette modification.
- La vidéo conserve le bloc Google de démonstration, `isTesting: true` et
  `initializeForTesting: true`. Les garde-fous existants (Free uniquement,
  consentement, configuration serveur activée en test, hors institut) restent
  en place. Une vidéo de démonstration n'accorde pas de crédit de génération.
- L'emplacement sponsorisé existant reste un aperçu sans chargement SDK :
  enregistrer l'ID de bannière n'implémente pas l'affichage d'une bannière.
- Aucune configuration iOS, aucun indicateur serveur, aucune version mobile
  et aucun workflow de publication ne sont modifiés.

## Étapes identifiées avant le complément

Les identifiants iOS ont depuis été reçus et préparés dans la même PR ; voir
`ADMOB-IOS-2026-10-10.md`. Finaliser l'association à la fiche
Google Play et la validation AdMob/app-ads.txt. Vérifier le consentement avec
l'application réelle, terminer l'affichage de la bannière et la validation
serveur des récompenses, puis valider le parcours sur appareils de test.
La publication et l'activation commerciale restent des étapes distinctes.

Documentation Google : https://developers.google.com/admob/android/test-ads

## Vérifications réalisées

- Identifiants comparés aux valeurs fournies ; éditeur cohérent avec `app-ads.txt`.
- Test existant `tests/ad-policy.test.js` réussi : Free, consentement, arrêt
  serveur, exclusion Plus/Pro et refus du mode commercial.
- `npm run mobile:production` réussi.
- `NAILMOODS_MOBILE_ENV=production npx cap sync android` réussi ; la
  synchronisation conserve le manifeste et le branchement Gradle.
- `node scripts/check-mobile-build.mjs dist-mobile production` réussi.
- Aucun AAB natif compilé/signé, aucun test sur téléphone et aucun déploiement
  réalisés pour cette modification. La compilation native et le contrôle du
  manifeste final restent à effectuer lors de la préparation de la bêta.

## Complément dans cette PR

La préparation des identifiants décrite ci-dessus est complétée par les essais natifs de bannière/vidéo, les contrôles serveur et la notice 0.9-beta. L’ancien aperçu du fil a été retiré. Le document `ADMOB-VALIDATION-2026-10-10.md` fait foi pour le comportement actuel, les vérifications et les étapes restantes. La publicité commerciale et les crédits de génération restent désactivés.
