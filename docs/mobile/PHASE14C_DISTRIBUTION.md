# Phase 14C — préparation Android, sans distribution

Le code applicatif reste le commit 14B `793f2d56f4b83e0eb341346943f7f007e8f497d8`.
Cette branche ajoute des outils de signature et cette procédure ; elle ne modifie
ni le web, ni les ressources OCR, ni les backends. Aucun workflow de publication.

## Binaire initial

- NailMoods Production : `com.nailmoods.app`, `0.3.0-beta.1`, versionCode `1`.
- AAB release source : artefact du run Actions `36461025104`.
- SHA-256 source : `c8fcc116f3d4a7b1cd4c8f6bf397d949c251b7330be64a9f77a0b29280103ba2`.
- SHA-256 signé : `fcfdc0f9310ac174d020179559667d709060350fbace8341cb765adc0a840a5b`.
- Taille signée : 38 042 583 octets. 1 068 fichiers de contenu identiques ; 16 ressources OCR.
- Certificat d'upload SHA-256 : `58:4D:C4:C3:F4:77:C8:63:7C:CF:AF:FA:95:72:13:D8:41:25:07:34:B6:D6:67:70:D0:36:67:EE:4D:AE:08:C0`.

La clé privée et son mot de passe sont remis séparément à la propriétaire hors
dépôt. Ils doivent être sauvegardés dans un coffre et une sauvegarde chiffrée.
Le certificat public peut être partagé ; les fichiers privés ne le doivent pas.
Aucun secret n'est placé dans Vite, GitHub Actions, l'AAB ou ce document.

## Reproduire la signature

JDK 21 et bundletool 1.18.3. Utiliser la clé existante pour toutes les mises à jour.
Ne pas exécuter le générateur à chaque build. Celui-ci refuse tout dossier non vide.

```bash
# À exécuter une seule fois seulement si aucune clé n'existe encore :
python3 scripts/create-android-upload-key.py --directory /chemin/prive/nailmoods

# Les variables ci-dessous contiennent des chemins et un alias, aucun mot de passe.
export NM_UPLOAD_KEYSTORE=/chemin/prive/nailmoods/NailMoods-upload-2026.p12
export NM_UPLOAD_PASSWORD_FILE=/chemin/prive/nailmoods/NailMoods-upload-2026.password.txt
export NM_UPLOAD_KEY_ALIAS=nailmoods-upload-2026
chmod 600 "$NM_UPLOAD_KEYSTORE" "$NM_UPLOAD_PASSWORD_FILE"
python3 scripts/sign-android-bundle.py \
  --input /chemin/build/NailMoods-Production-0.3.0-beta.1-release-NON-SIGNE.aab \
  --output /chemin/livraison/NailMoods-Production-0.3.0-beta.1-release-SIGNE.aab \
  --expected-sha256 c8fcc116f3d4a7b1cd4c8f6bf397d949c251b7330be64a9f77a0b29280103ba2 \
  --jdk-bin /chemin/jdk-21/bin --bundletool /chemin/bundletool-all-1.18.3.jar
```

Le script refuse un fichier source modifié, une variante Recette, un AAB debug,
un AAB déjà signé, un secret dans le dépôt, des permissions privées trop ouvertes
et un fichier de sortie déjà existant. Il vérifie la signature avec l'alias de
confiance, valide le bundle et compare tous les fichiers de contenu après signature.

Pour une future version, incrémenter le versionCode mobile, compiler avec la
procédure 14B, valider le nouveau build et utiliser son SHA-256 réel. Ne jamais
réutiliser le SHA du premier build pour un autre fichier. Les scripts n'envoient
rien à Google Play. Un stockage CI futur utilisera un environnement protégé et
des secrets ; la branche actuelle n'ajoute pas de secrets ni de job de publication.

## Supabase et tests restant à attester

Les projets existants sont accessibles, mais le connecteur de cette session ne
fournit aucune action Auth URL Configuration. Aucune redirection distante n'a été
modifiée ou déclarée vérifiée. Conserver Site URL et toutes les URL web.

Production :

```text
com.nailmoods.app://auth/callback?auth=callback
com.nailmoods.app://auth/callback?auth=recovery
```

Recette :

```text
com.nailmoods.app.recette://auth/callback?auth=callback
com.nailmoods.app.recette://auth/callback?auth=recovery
```

Ne pas ajouter un wildcard global ni copier les callbacks d'une variante dans
l'autre projet. Examiner les modèles email avant toute modification : un lien
ConfirmationURL standard conserve le flux GoTrue ; un modèle qui force SiteURL
peut ignorer le retour mobile. Ne pas remplacer aveuglément les modèles.

Le téléphone doit initier puis terminer le PKCE dans la même installation. Tester
confirmation et récupération à froid et à chaud ; le vérificateur du navigateur
n'est pas partagé avec l'application. Les codes réutilisés/expirés doivent échouer.

Aucun appareil physique connecté : tests téléphone et PKCE email réels non
effectués. Ne pas assimiler les tests émulateur 14B à ces validations. L'AAB ne
s'installe pas directement. Un APK signé avec la clé d'upload n'utilise pas la
future signature Play : préserver/synchroniser les brouillons avant toute transition
depuis un APK debug ou de vérification ; ne jamais imposer une désinstallation.

## Arrêt

Un AAB signé ne signifie pas une bêta autorisée au lancement. Auth réel, essais
wrapper sur téléphone, dossier Play, textes légaux et sauvegarde du coffre restent
des points à fermer. Attendre la validation de Marie avant revue ou test fermé.
