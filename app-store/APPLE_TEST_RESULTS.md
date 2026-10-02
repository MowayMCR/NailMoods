# Résultats et limites des tests

2 octobre 2026. Tous les tableaux distinguent tests de logique, PostgreSQL isolé, SQL Recette réel, requêtes HTTP et véritables achats Apple. Aucun achat Apple Sandbox/Production n’a été exécuté.

**Dernier code validé : `7bf7493`, run [37042670070](https://github.com/MowayMCR/NailMoods/actions/runs/37042670070)**. Après le retrait des métadonnées des photos support : 395 tests réussis, 2 ignorés, simulateur et archive appareil iOS non signée réussis, compilation Java Android réussie. Voir `evidence/final-code-ios-ci.txt`, `final-code-android-ci.txt` et `final-code-artifacts.json`. Les runs antérieurs ci-dessous donnent aussi les preuves des corrections intermédiaires.

## Preuves exécutées

| Test | Résultat | Preuve | Correctif / limite |
|---|---|---|---|
| Suite finale locale | ✅ 395 réussis, 0 échec, 2 ignorés / 397 | `evidence/tests.txt` | intégrations Auth bêta et vrais médias ignorées sans credentials dédiés |
| Compilation web | ✅ | `evidence/web-build.txt` | avertissement taille du chunk ; performance iPhone à mesurer |
| Build mobile et sync iOS | ✅ | `evidence/ios-web-build.txt` | aucun certificat utilisé |
| Xcode simulateur Swift / StoreKit | ✅ CI macOS | run `37038804502`, commit `f9aa1cd`, Xcode 26.6 / SDK 26.5, `ios-ci-success.txt` | imports React `.jsx` explicités pour filesystem macOS |
| Android Java + Google plugin | ✅ CI | même run, `android-ci-success.txt` | preuve de compilation, pas achat Google réel |
| Archive iOS appareil non signée Recette | ✅ CI | run `37040835653`, `ios-archive-ci.txt`, ARCHIVE SUCCEEDED | ne permet pas upload/signature TestFlight ; vraie archive signée à créer sur Mac |
| Icône App Store / permissions | ✅ inspection plist/images | `ios-assets-permissions.json` | 1024×1024 RGB sans alpha ; seulement caméra UsageDescription |
| JWS forgé Apple | ✅ rejet bibliothèque officielle | `tests/apple-billing.test.js` | ne prouve pas un JWS positif avec OCSP en Edge |
| Apple Edge sans JWT / nonce forgé | ✅ 401 | `recette-edge-negative.json` | confirmation getUser et chemin serveur ; config Apple inactive |
| Notification forgée | ✅ 400 | même fichier | validation positive attend Apple Sandbox et secrets |
| Worker nettoyage sans auth / ancien header / nonce forgé | ✅ 403 dans les deux projets | `cleanup-auth-negative.json` | ancien secret permanent n’est plus accepté |
| Nonce nettoyage une fois / reprise refusée | ✅ SQL réel et PostgreSQL isolé | `cleanup-sql-live.json`, `media-cleanup-nonce.test.js` | fixtures live annulées par ROLLBACK |
| ACL pg_net après REVOKE | ❌ reste accessible selon SQL privilèges | `cleanup-sql-live.json` | propriétaire géré supabase_admin ; action propriétaire/Supabase requise |
| Scan secrets | ✅ effectué, portée limitée | `git-secret-scan.json` | motif littéral de vérification PKCS8, pas une clé ; audit heuristique, aucune garantie globale |
| Pages officielles sans login | ❌ Netlify invite sign-in | `public-pages.md` | ouvrir le domaine et publier ces textes |
| Textes historiques GitHub Pages | ✅ accessibles, ❌ versions anciennes | même preuve | ancienne privacy 0.6 / terms 0.4 |

## Cas d’abonnement A–S

`apple-billing.test.js`, `google-play-sql.test.js` et `tests/sql/apple-regression.sql` utilisent des états synthétiques de transactions déjà vérifiées. Le test SQL exécute les vrais DDL dans PostgreSQL embarqué, avec stubs Auth/cron/net explicitement limités. Aucun JWS synthétique ne peut être envoyé comme achat réel au serveur.

| Test | Résultat | Preuve | Correctif / test restant |
|---|---|---|---|
| A Free sans abonnement | ✅ calcul Free | SQL A | tester paywall Free iPhone |
| B Plus Apple actif | ✅ logique Plus | unité B + SQL B | acheter Plus Sandbox et inspecter ligne serveur |
| C Pro Apple actif | ✅ logique Pro | unité C + SQL C | acheter Pro Sandbox |
| D Expiré | ✅ aucun droit Apple | unité D + SQL D | attendre expiration accélérée Sandbox |
| E Annulé mais période payée valide | ✅ conserve accès | unité E + SQL E | désactiver renouvellement dans Apple et vérifier échéance |
| F Grâce | ✅ accès jusqu’à date de grâce | unité F et dates limites + SQL F | activer/configurer grâce et simuler problème Sandbox |
| G Paiement pending | ✅ aucun accès additionnel | unité G, branche native `.pending` | provoquer pending Apple ; aucun reçu ne doit devenir actif |
| H Refund/revocation | ✅ retire seulement la source Apple | unité H + SQL H | notification signée et état API réel |
| I Restore Purchases | ✅ persistance/logique ; 🟡 StoreKit | SQL I, sources `.sync()` / currentEntitlements | restaurer sur iPhone avec même Apple Account et compte NailMoods |
| J Plus → Pro | ✅ niveau courant Pro | unité J + SQL J | upgrade réel dans le même groupe |
| K Pro → Plus | ✅ produit courant détermine droit | unité K + SQL K | downgrade Apple différé : contrôler Pro avant échéance, Plus après |
| L Plus manuel seul | ✅ indépendant | unité L + SQL L | ne nécessite aucune transaction Apple |
| M Pro manuel seul | ✅ indépendant | unité M + SQL M | idem |
| N Manuel + Apple expiré/révoqué | ✅ niveau manuel préservé | unités L/M/N + SQL M/N/H | point critique couvert ; aucune modification du registre manuel |
| O Google valide utilisé iPhone | ✅ résolution serveur Pro et doublon refusé | unité O + SQL O / canPurchase | connexion iPhone d’un vrai compte Google payant |
| P Apple valide utilisé Android | ✅ projection Google existante cohérente | unité P + SQL P | connexion Android d’un vrai compte Apple payant |
| Q Suppression compte | ✅ cascade ledger/token isolée ; ⛔ E2E | SQL supprime Auth fixture et vérifie cascade | compte jetable avec vrais objets Storage ; abonnement reste géré par Apple |
| R Réinstallation / autre iPhone | ✅ mapping serveur durable ; 🟡 appareil | SQL I/R et mapping par user | réinstaller, se reconnecter, restaurer ; tester un autre iPhone |
| S Événement hors session | ✅ writer serveur et architecture sans session ; 🟡 Apple | SQL S, `apple-notifications`, service-only RPC | renouvellement webhook authentique pendant déconnexion / désinstallation |

Contrôles supplémentaires réussis : produit/bundle/environnement/token incorrects refusés ; propriété de transaction non transférable ; Sandbox désactivé pour compte normal ; RPC client ne peut écrire d’abonnement ni s’autoriser Sandbox ; grâce expirée sans accès ; Pro payant peut dépasser un Plus manuel sans l’effacer.

## Social, UGC et suppression

16 contrôles du script `supabase/tests/phase13_release.sql` ont réussi sur Recette pendant cette session, avec toutes les écritures annulées. Ils couvrent création Pro privée, recherche/profil, partage idempotent, autorisations destinataire/tierce personne, blocage et retrait de connexion. `evidence/social-sql-observations.md` transcrit leur portée ; ce n’est pas un test de l’UI iPhone.

| Test | Résultat | Preuve | Correctif / test restant |
|---|---|---|---|
| 1 Publication photo | ✅ queue SQL isolée ; 🟡 bout en bout | `ugc-publication.test.js` ; `cloud-store.test.js` | source impose privé/pending puis approbation staff ; déployer migration + preview |
| 2 Signalement | ✅ mécanisme code audité ; ⛔ parcours réel ici | `SafetyActions`, `nm_safety`, staff journal | créer signalement fictif, le lire/traiter staff et contrôler la réponse |
| 3 Blocage | ✅ SQL réel | phase13 tests blocage | tester action UI, symétrie des effets et déblocage |
| 4 Conséquence blocage | ✅ partagé masqué / envoi interdit | phase13 | compléter Découvrir, profils, photos, messages existants sur appareil |
| 5 Public → privé | ✅ triggers/code audités ; ⛔ médias E2E | révoque route media-read, bucket jamais public ; test média ignoré | vérifier 404 public immédiat et original privé toujours accessible |
| 6 Suppression contenu | ✅ suppression queue isolée | `ugc-publication.test.js` | tester blob et disparition des listes sur plusieurs comptes |
| 7 Suppression compte | ✅ cascade Apple isolée / code Storage puis Auth ; ⛔ réel | SQL Q + `account-delete` / finalizer | supprimer compte jetable et contrôler toutes tables/médias/sessions |
| 8 Découvrir | ✅ code filtrage et recherche SQL partielle ; 🟡 UI | phase13 recherche/profil + sources Discovery | vérifier pending/privé/blocked absents, approuvé visible |
| 9 Messagerie | ✅ SQL réel isolation / blocage / partage | phase13 16 contrôles | compléter messages simples, signalement message et suppression/anonymisation |

## Recette à faire sur appareil

Pour chaque scénario : noter build, iOS, compte NailMoods, Apple Sandbox Account, produit, environnement, transaction ID non secret, échéances et résultat backend. Ne pas coller de JWS complet, token de session ou photo personnelle dans le rapport.

Sur petit et grand iPhone : tailles de texte normales et maximales, VoiceOver, clavier ouvert dans connexion/message/titre Journal, safe areas/notch, portrait, annulation appareil photo/PHPicker, refus caméra, partage/export et récupération de mot de passe. Les captures et les déclarations Accessibility Nutrition Labels ne sont pas validées avant cette recette.
