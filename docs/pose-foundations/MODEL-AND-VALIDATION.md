# Lot 1 — fondations proposées et implémentées

Statut : prêt pour revue locale, **non déployé**. 4 octobre 2026.

L'application publique et ses écrans validés ne sont pas branchés sur ces tables tant que les fondations et la migration n'ont pas été validées. Aucun nouveau build Android, merge Production ou appel IA n'a été effectué.

## 1. Un projet privé, des sources conservées

`pose_projects` est le fil conducteur. L'objet existant `library.projects` est une inspiration enregistrée, pas un cycle de réalisation : sa clé dépend de sa composition. Le Journal représente une pose déjà réalisée et n'accepte pas de date future. De plus, inspirations et Journal peuvent être partagés/publics. Les étendre directement avec une tenue privée et un agenda exposerait des informations dans des projections existantes.

Trois tables additives permettent de conserver ces contrats. Elles sont limitées à la propriétaire de l'espace personnel, même si cette personne dispose aussi d'un espace Pro partagé.

| Table | Données | Relations / règles |
|---|---|---|
| `pose_projects` | Identité, titre, statut, composition versionnée, métadonnées privées, révision | Propriétaire + espace personnel ; références facultatives inspiration et Journal ; clé d'import historique unique |
| `pose_plan_items` | Type d'action, titre, jour, fuseau IANA, heure facultative, lieu, note, état | Plusieurs actions par projet ; même propriétaire et espace exigés par clé étrangère composée |
| `pose_reminders` | Catégorie, instant explicite, activation, révision | Plusieurs rappels par action ; suppression de l'action = suppression des rappels associés |

Les statuts disponibles sont `idea`, `planned`, `ready`, `in_progress`, `done`, `follow_up`, `removal_due`, `archived`. Les trois états de réalisation/suivi imposent une date réelle. Ils ne déclenchent pas encore d'action métier, notification ou écriture dans le Journal.

### Correspondance avec le parcours cible

| Besoin | Source de vérité retenue | Disponibilité |
|---|---|---|
| Forme, longueur, palette, techniques, effets, motifs, décorations | Composition au format `snapshotIdea` existant, notamment les cinq ongles et ressources | Réutilisé et validé |
| Recette, étapes DIY, durée estimée | Composition + `buildTutorial`, sans deuxième moteur | Lecture réutilisée ; pilotage réel du parcours dans les lots suivants |
| Produits recommandés / matériel | Palette et ressources de la composition | Réutilisés |
| Produits possédés / manquants | `ideaAvailability` sur la Collection courante | Calculés à la lecture, pas de copie périmée de la Collection |
| Alternatives | Champ `details.alternatives` réservé | Moteur détaillé couleur/finition/opacité/famille au lot 4 |
| Mood et univers | Métadonnées privées du projet ; thème visuel de l'app toujours dans le profil existant | Champs préparés, sans modifier les univers du profil |
| Inspiration d'origine | `source_inspiration_id` pour une source distante personnelle ; clé historique pour une source locale | Adaptateur prêt ; copie d'une inspiration publique à intégrer via les règles existantes |
| Tutoriel / réalisation | `tutorialSessionId`, `journal_entry_id`, `realizedOn` | Adaptateurs prêts ; aucune ancienne fiche déplacée |
| Événement et date prévue | Action de planning `kind=event` ou `pose` avec date, heure, lieu, note | Modèle et CRUD prêts ; pas de duplication de la date dans le projet |
| Occasion | `details.occasion` réservé à sa classification | Saisie et contrat détaillé au lot 2 |
| Images de référence / tenue / suivi | Futures références au stockage privé ; sources existantes conservées | Nouveaux médias volontairement refusés au lot 1, nettoyage/suppression à intégrer avant ouverture |
| Partage PO / publication | Projection opt-in via le service de partage existant | Pas de publication automatique ni de lien public du projet ; intégration au lot 5 |
| IA | Références futures de tâches privées, pas de coût ni de secret client | Pas de tâche IA créée dans ce lot |

Une composition du projet peut évoluer indépendamment de son inspiration source : cette adaptation justifie le snapshot initial. La Collection, les préférences et les étapes dérivables ne sont pas dupliquées dans une deuxième base.

### Compatibilité historique et concurrence

- Import à la demande via `projectFromIdea`, `projectFromJournal`, `projectFromTutorial`, sans migration de masse.
- La session de tutoriel et sa réalisation Journal retrouvent la même clé `session:<id>` ; le Journal enrichit le projet existant avec sa date et son lien.
- Deux réalisations différentes restent deux projets. Les anciennes photos, notes et données produits du Journal restent intactes.
- `revision` est incrémentée côté serveur. Modification et suppression exigent la révision lue : une édition concurrente produit un conflit explicite.
- La suppression d'une inspiration/fiche source enlève sa référence, pas le projet. La suppression du projet enlève son planning et ses rappels. La suppression du compte cascade sur les nouvelles tables.
- Le dépôt vérifie le compte actif à chaque opération. Aucun repli silencieux vers un stockage invité après refus serveur.

## 2. Planning et rappels

Le planning comporte les catégories pose, événement, suivi, entretien, dépose, préparation et rendez-vous personnel. Chaque action reste liée à un projet dans ce premier modèle. Un futur rendez-vous complètement indépendant nécessiterait une extension explicite, plutôt qu'un projet fictif.

Une date sans heure reste une journée entière, pas minuit UTC. Une heure utilise un instant avec décalage explicite et un fuseau IANA ; le jour doit correspondre au fuseau choisi. Les deux occurrences d'une heure lors du passage à l'heure d'hiver sont distinguées. Aucun délai J+7/J+14, aucune anticipation de mariage ou dépose n'est imposé.

Les rappels stockent **l'intention de rappel**, pas une preuve d'envoi. Le lot 3 devra intégrer permissions, calendrier système/ICS, ordonnanceur natif, modification/annulation et catégories autorisées. Les préférences de notification devront rejoindre le profil existant. Les identifiants de notifications natives seront propres à chaque appareil ; pas un identifiant global unique dans le projet. Une entrée annulée ou supprimée devra annuler ses notifications sur les appareils concernés.

Le classement « Cette semaine » suit la semaine calendaire jusqu'au dimanche, et non sept jours glissants. Les actions terminées/annulées sont exclues de la liste à venir.

## 3. IA+ indépendant, fermé par défaut

| Élément | Contrat |
|---|---|
| `private.addon_entitlements` | Droits supplémentaires par utilisateur/fonction/source/référence ; activation, début et expiration ; plusieurs sources peuvent coexister |
| Sources prévues | Admin, bêta, Google, Apple, inclus, crédits : valeurs de registre uniquement, sans SKU ni vente créée |
| `private.addon_feature_flags` | `ai_plus`: `enabled=false`, `public_enabled=false` |
| `private.addon_internal_accounts` | Liste interne administrée côté serveur ; les comptes staff existants sont aussi reconnus |
| `nm_ai_plus_access()` | Compte confirmé/adulte/actif + flag + audience autorisée + droit IA+ actif ; aucun droit auto-accordé aux Pro ou au staff |
| Client | Projection de visibilité uniquement ; `AI_PLUS_PUBLIC_ENABLED=false` ; absence de RPC = masqué, autres erreurs propagées |

Les tables de droits ne sont jamais modifiables par l'utilisatrice. Un choix dans le profil, un flag JavaScript modifié ou le niveau Pro ne peuvent pas accorder IA+. Les registres Free/Plus/Pro, droits manuels bêta, Google et Apple ainsi que leur priorité actuelle restent inchangés. La révocation d'une source IA+ ne supprime pas un droit encore valable accordé par une autre source.

### Matrice de séparation des droits

| Cas | Fondations personnelles | Fonctions photo existantes | IA+ |
|---|---|---|---|
| Free sans IA+ | Oui, compte personnel confirmé et actif | Droit Plus/Pro actuel conservé | Non |
| Free + IA+ | Idem | IA+ n'accorde pas automatiquement `photo_projects` | Possible uniquement selon flags/audience et futurs endpoints |
| Plus ou Pro sans IA+ | Oui | Selon droits actuels | Non |
| Plus ou Pro + IA+ | Oui | Selon droits actuels | Selon flags/audience |
| Staff sans droit IA+ | Selon compte existant | Selon droits actuels | Refus, même en audience interne |
| Compte suspendu / non confirmé | Refus | Refus | Refus |

**Arbitrages avant intégration publique :** le client bloque actuellement le Journal Free malgré une capacité serveur personnelle ouverte ; les projets photo sont Plus/Pro. Le lot 1 ne change ni ce choix commercial ni l'accès Free à la génération existante. Au lot 2, décider explicitement si la tenue suit le droit photo actuel. Au lot 7, harmoniser le contrat du Journal avant d'y brancher la réalisation d'un projet.

### Architecture serveur proposée pour le lot 11 — non développée ici

Une interface fournisseur séparera `analyzeOutfit`, `analyzeInspiration`, `generateTryOn`, `generateVariation`, puis éventuellement `analyzeHand`. Chaque endpoint vérifiera identité, droit, flags, propriété du projet, accès au média et quota **côté serveur**, même si le bouton est caché.

Prévoir un registre privé de requêtes idempotentes, réservation atomique de quota avant appel fournisseur, statut réservé/en cours/réussi/échoué/annulé, fournisseur/modèle, nombre de rendus et coût estimé/réel réservé au serveur. Une exécution répétée ne doit pas consommer deux fois. Libérer ou ajuster la réservation en cas d'échec selon la politique choisie. Le mécanisme existant `feature_usage` pourra servir aux agrégats, sans remplacer l'historique privé des requêtes.

L'historique visible à l'utilisatrice sera une projection privée de ses demandes/rendus/dates/projets, sans coûts internes ni secrets. Un registre de quotas indépendant du tier permettra crédits, abonnement et quotas inclus sans figer l'offre. Aucun endpoint fournisseur, quota payant opérationnel, clé, SKU, paywall ou historique IA n'est activé dans ce lot.

## 4. Migration et mise en service

Fichier unique : `supabase/migrations/20261004125620_pose_cycle_foundations.sql`.

La migration est transactionnelle, additive, sans backfill. Elle exige les fonctions existantes de compte adulte, capacité personnelle et staff. Elle crée trois tables protégées par propriétaire dans `public`, trois tables privées de droits/flags et la RPC de lecture IA+. Les clés étrangères, triggers et RLS interdisent l'attribution d'un projet à une autre personne, le rattachement à son Journal ou le déplacement de l'identité d'une ligne.

Les tests SQL exécutent la migration réelle sur PostgreSQL embarqué PGlite. Les prérequis Auth, offres et espaces sont des fixtures contrôlées : **ce n'est pas une exécution sur Supabase distant** ni un test de bout en bout Google/Apple. Les définitions Production ont été consultées en lecture seule lors de l'audit.

Après validation : appliquer d'abord cette migration isolément dans un environnement de recette représentant le schéma déployé ; tester avec deux vrais comptes ; vérifier les policies et les suppressions ; brancher ensuite le parcours. Ne pas lancer `db push` sur tout l'historique local, qui diffère du journal de migrations Production. Les migrations Apple/DA06 antérieures en attente restent hors de ce changement.

## 5. Vérifications exécutées

| Vérification | Résultat et portée |
|---|---|
| Suite Node complète | **469 tests : 467 réussis, 0 échec, 2 ignorés** |
| Nouveaux tests | **16 réussis** : modèles, compatibilité historique, dépôt, SQL/RLS, concurrence, flags et droits |
| Navigateur Chromium | **11 contrôles réussis**, aucune erreur JavaScript ; React + dépôt réel + PostgreSQL local |
| Mobile web | Aucun débordement horizontal à 320, 360, 390 et 430 px |
| Build web | Réussi ; avertissement de bundle JavaScript >500 kB, pas d'AAB produit |
| Migration / rollback | Création locale exécutée ; contrôle des politiques ; rollback de schéma vide exécuté |

Les deux tests ignorés existent déjà : droits réels A/B/C et intégration média A/B sur un projet de recette isolé avec identifiants dédiés. Ils n'ont pas été transformés artificiellement en succès.

Les nouveaux tests couvrent notamment : CRUD/reprise, import idempotent, lien tutoriel→Journal, fidélité HEX, dates et changement d'heure, annulation, désactivation de rappel, suppression en cascade, refus anonyme et autre compte, source appartenant à autrui, compte suspendu/non confirmé, conflits de révision, impossibilité client d'accorder IA+, droit expiré/révoqué/futur, staff sans entitlement, séparation Free/Plus/Pro et rollback.

Les captures `atelier-soft-glam.png` et `atelier-dark-feminine.png` montrent **les mêmes données fictives** dans un atelier local exécuté. Il réutilise logo, icône Witchy, thèmes et rendu NailMoods. Il n'est pas présenté comme un nouvel écran public terminé. Sa base de démonstration persiste pendant le processus local et repart de zéro à son redémarrage ; le rechargement navigateur et le dépôt ont été testés.

### Reproduire

```sh
npm test
npm run build
node scripts/serve-pose-foundations.mjs
node scripts/test-pose-foundations-browser.mjs
```

Le dernier script accepte `NAILMOODS_BROWSER_EXECUTABLE` pour un Chromium installé ailleurs. L'atelier est disponible uniquement sur `127.0.0.1:4228/review/pose-foundations.html`, sans identifiants Production.

## 6. Limites et prochaines validations

- Le dépôt n'est pas encore raccordé au cache hors ligne/file de synchronisation ni aux écrans publics. Les nouvelles tables peuvent rester absentes en Production sans casser le lancement existant.
- Les médias nouveaux, calendrier, deep links Projet, notifications fermées/arrière-plan, export ICS, partage/QR et intégration Journal sont réservés à leurs lots. Les tests sur vrais Android/iOS restent à faire à ce moment.
- Aucun moteur d'alternatives chimiques, protocole fabricant ou recommandation médicale n'a été inventé.
- Les transitions de statuts sont validées comme données ; l'orchestration atomique des effets métier entre projet, Journal et planning appartient aux lots qui les brancheront.
- Les contrôles SQL ne remplacent pas une recette distante avec le vrai système Auth, son RLS complet et les interactions de suppression de compte.
- Aucun analytics nouveau n'est envoyé dans ce lot ; les futurs événements devront utiliser le consentement existant et exclure les contenus privés.

## 7. Rollback

Avant branchement public, revenir au commit de base suffit pour le code. Si la migration a été appliquée en recette sur des tables encore vides, `ROLLBACK.sql` retire uniquement les objets de ce lot, sans `CASCADE` et sans toucher aux tables existantes. Le script refuse de supprimer des projets ou droits déjà enregistrés.

S'il existe des données réelles : désactiver l'intégration et les flags, conserver les tables additives, exporter les données avant toute opération destructive. Ne pas exécuter un rollback qui abandonnerait des projets/rappels. Le présent lot n'a modifié aucune donnée Production.
