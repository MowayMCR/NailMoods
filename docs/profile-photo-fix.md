# Photo de profil — correctif préparé le 29 septembre 2026

Base : branche mobile `feat/phase14d-final-18`, commit `9df1ae8` (candidat beta.4).
Branche de travail : `fix/profile-photo-persistence`.

## Diagnostic prouvé

Le profil principal n'affichait jamais `profiles.avatar_url` : il choisissait uniquement une initiale ou un avatar illustré. L'éditeur photo conservait un état React indépendant, sans mise à jour de la copie locale du compte. Les erreurs de lecture étaient ignorées et une écriture ne vérifiait pas qu'une ligne avait effectivement été modifiée.

Contrôle Production en lecture seule du compte signalé : référence de photo présente, objet privé présent, mode d'affichage « avatar ». Aucune photo utilisateur téléchargée ni modifiée pendant le diagnostic.

## Correctif

- Une source d'état photo commune, liée au compte, alimente le profil et l'éditeur.
- Les photos existantes redeviennent automatiquement l'avatar ; un choix ultérieur explicite « initiales » ou avatar illustré reste conservé.
- Le sélecteur « Ma photo — bientôt disponible » est remplacé par un vrai choix photo. Aperçus circulaires sans déformation.
- Confirmation de la ligne Supabase modifiée ; contrôle de l'identifiant du compte et comparaison du chemin précédent pour éviter d'écraser un changement concurrent.
- Aperçu et brouillon conservés dans le cache existant du compte (IndexedDB web / stockage natif), jamais dans les préférences envoyées au serveur ou les analytics.
- L'import interrompu propose une reprise après réouverture, avec le même identifiant d'objet. Une réponse réseau perdue est réconciliée sans nouvel upload.
- Les erreurs de lecture ne deviennent plus une fausse suppression. Rechargement à la reprise de visibilité et au retour réseau.
- Aucune migration, modification de RLS, nouvelle dépendance applicative, modification Auth ni modification de compte Production.
- Le retrait d'une photo enlève sa référence du profil. Les anciens objets ne sont plus détruits aveuglément depuis ce composant, car une autre référence peut encore les utiliser. Leur éventuel nettoyage exige une preuve de non-référence ; aucune purge n'est activée ici. Le parcours existant de suppression complète du compte n'est pas modifié.

## Vérifications ciblées

- PASS : 57 tests Node, dont 12 nouveaux cas sur le choix photo, les écritures réellement confirmées, le cache, la reprise, le conflit entre appareils et l'isolation de comptes.
- PASS : build React/Vite.
- PASS : vraie interface React dans Chromium, viewport 393×852, backend local simulé : import, avatar principal, changement d'onglet, réouverture, choix initiales/photo, interruption réseau, reprise du brouillon et retrait. Aucune erreur JavaScript. Contrôle visuel de l'éditeur et du profil.
- Production : lecture des policies et vérification de présence de la photo uniquement. Aucun test destructif, aucun compte de revue utilisé.
- Pas de nouveau test téléphone Android : la campagne acquise n'est pas rejouée. Le contrôle ciblé sur téléphone restera à faire avec la prochaine version installable contenant ce correctif.

Commandes :

```sh
node --test tests/profile-photo.test.js tests/cloud-store.test.js tests/media-storage.test.js tests/professional-profile.test.js
npm run build
```

Vérification navigateur facultative : `tests/profile-photo-ui.mjs`, avec Playwright installé dans l'environnement de test ; `PLAYWRIGHT_MODULE` et `CHROME_EXECUTABLE` permettent d'utiliser une installation existante. La fixture locale utilise uniquement des données synthétiques. Les résultats sont écrits sous `artifacts/profile-photo/`, ignoré par Git.

## Livraison

Correctif source préparé pour le prochain lot. Aucun déploiement Production web, import Play Console, envoi en revue ou lancement de test fermé.
L'AAB signé beta.4 reste intact et ne contient pas ce correctif. Après regroupement des corrections, le prochain candidat Android devra incrémenter sa version et son versionCode et conserver la même clé d'upload.
