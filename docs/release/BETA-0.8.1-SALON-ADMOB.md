# NailMoods — lot bêta 0.8.1 (préparation de livraison, 9 octobre 2026)

Source : `feat/salon-collaborative`, PR #34. NE PAS confondre un build de CI avec une distribution publique.

## Identité et versions
- Tronc commun Salon + AdMob en mode désactivé commercialement.
- Android : `com.nailmoods.app`, version `0.8.1`, `versionCode 12` (Play test fermé affiche actuellement code 11).
- iOS : identité Apple existante à conserver et vérifier, version `0.8.1` ; build number iOS indépendant, par défaut temporaire 30000 pour vérification, **choisir un numéro Apple jamais utilisé supérieur au dernier dans App Store Connect lors de la signature**.
- La CI `salon-validation.yml` compile les tests partagés, un bundle Android candidat **NON SIGNÉ**, et une application iOS simulateur **NON SIGNÉE**. Aucun de ces produits ne peut être revendiqué comme prêt à importer sans contrôles de signature/export.

## Livrables et contrôles
1. Attendre le succès complet du run GitHub Actions associé au commit de préparation.
2. Depuis l'artefact `salon-android-unsigned-aab`, vérifier la somme SHA256 et le nom/code interne : c'est **une preuve de compilation**, et NON un AAB à téléverser tel quel.
3. Construire l'AAB Production avec la clé d'upload déjà associée à Google Play, via workflow sécurisé intégrant `NM_UPLOAD_KEYSTORE`, `NM_UPLOAD_STORE_PASSWORD`, `NM_UPLOAD_KEY_ALIAS`, `NM_UPLOAD_KEY_PASSWORD` sans divulguer la clé ; vérifier signature, applicationId, code 12, Play Console, puis importer au test interne. Ne pas créer un nouveau keystore.
4. Rebaser/intégrer les sources validées dans la branche Apple et exécuter le lanceur corrigé en `verify` avec la **même source** ; la PR #37 corrige la sélection des étapes `workflow_call`, et ne doit pas masquer une régression Android en mode `testflight`.
5. Faire vérifier les sept secrets Apple de signature/envoi, le Bundle ID existant et `IOS_BUNDLE_ID_CONFIRMED` sans afficher aucune valeur.
6. Exécuter `testflight` sur cette source avec un numéro Apple unique supérieur au dernier build existant. Vérifier les étapes `Archive, export and verify signed IPA` et `Validate and upload to App Store Connect` : le statut GitHub vert seul n'est pas suffisant. Attendre le traitement App Store Connect, puis affecter au groupe de test.
7. Tests réels : invitations Salon, places, vitrine et modération, photos et galerie personnelle, Free/Plus/Pro droits offerts, absence de pubs réelles, bannières et vidéos de démonstration, navigation iPad/tablettes.
8. Ne pas activer les publicités commerciales, les nouveaux paiements Salon, ni lancer de release publique.

## Séparation des plateformes
Ne pas reprendre un ancien build iOS ou un ancien bundle Android sans les changements Salon + AdMob. `main` déclenche la production Web ; fusionner PR #34 seulement après revue et décision explicite de déploiement.
