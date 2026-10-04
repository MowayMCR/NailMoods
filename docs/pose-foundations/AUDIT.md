# NailMoods — phase 0, audit avant migrations

État observé le 4 octobre 2026. Base : `b9b9b5a` (même arbre que le candidat v0.8 `acd7084`), issu de `feat/da06-moods-ux` puis des finitions Accueil/Profil/Onboarding et du centrage validés. Nouvelle branche isolée : `feat/pose-cycle-foundations`. L'AAB livré est mis en attente par Marie. Pas de nouveau build ni déploiement demandé.

## Inventaire et fonctions réutilisées

| Domaine | Existant constaté | Réutilisation / limite |
|---|---|---|
| Inspiration | `src/inspirations.js`: `snapshotIdea`, `validIdea`, `saveProject`, `findIdea`, `ideaAvailability`; `nm-inspirations-v1`; table `inspirations.snapshot` | Composition riche (forme, longueur, palette, 5 ongles, techniques, ressources, options, durée). Les projets actuels sont des inspirations `isProject`, identifiées par une empreinte de composition, pas par une réalisation. |
| Journal | `src/journal.js`: `newJournalEntry`, `newJournalEntryFromIdea`, `putJournalEntry`, `readJournal`; table `journal_entries` | Une réalisation, date passée/présente, produits, ressenti, tenue, notes, photo, session. Conserver toutes les anciennes fiches et le contrat version 1. Une même inspiration peut être réalisée plusieurs fois. |
| Tutoriel | `src/tutorial.js`: `buildTutorial`, `newTutorial`, `markIdeaDone`, `actOnTutorial`, minuteurs démarrer/pause/reprise | Réutiliser le moteur. Sessions dans `profiles.preferences.nailmoodsExtras['nm-tutorials-v1']`, pas de table de tutoriels séparée. Notifications en arrière-plan non établies. |
| Recette | Palette/ressources/ongles de l'inspiration, étapes produites par `buildTutorial` | Ne pas créer une copie éditable parallèle des étapes. |
| Collection | `user_products`, `user_stickers`, `user_equipment`, `metadata.nailmoods`; `productStatus` / `ideaAvailability` | Catalogue et HEX conservés ; disponibilité exacte existante. `photoInspiration.matchPhotoProducts`, `productMatch`, `poShareService.comparePoShare` pourront servir au lot DIY. Aucune proximité couleur ne prouve une compatibilité chimique. |
| Import photo | `PhotoInspirationFlow`, `photoInspiration`, `colorAnalysis.photoPalette`, médias natifs | Extraction palette existante ; pas de reconnaissance fiable de tissu/morphologie constatée. Réutilisation au lot 2, non développée ici. |
| Profil | `nm-profile`, `profiles.preferences.nailmoodsProfile`, `profilePatch` | Source de vérité actuelle ; mood visuel distinct des univers. Aucun champ IA+ d'autorisation dans les préférences éditables. |
| Persistance | `cloud/mapping`, `repository`, `store`, cache IndexedDB par utilisateur/espace ; contrôle des conflits, file de sauvegarde, médias Blob | Réutiliser le client Supabase, les contrôles de session et les contrats d'erreurs. Le cache existant est une projection fermée de tables : ne pas y ajouter silencieusement des tables non déployées. Le nouveau dépôt est préparé séparément et non branché sur le démarrage public. |
| Partage PO | `social/poShareService`: `shareSnapshot`, `prepareShareImages`, service `send` ; connexions et RPC existants | Projection explicite, images et notes opt-in. Réutiliser au lot 5 ; le projet central ne devient jamais public automatiquement. |
| Publications / Fil | Inspirations publiques, Journal public, `private.discovery_preview`, contrôles de blocage et d'offre | Ne jamais passer les détails privés du projet à ces projections. |
| Médias | `cloud/mediaStorage`, bucket privé, chemins utilisateur/espace/type/fichier, URLs temporaires ; suppression compte existante | Le lot 1 n'ajoute aucun upload ni bucket. Les médias futurs doivent rester des références privées ; avant lot 2, intégrer la reconnaissance de leurs chemins au nettoyage des médias orphelins et à la suppression. |
| Planning | Aucun modèle de projet planifié / événement / rappel de pose dans les tables Production inspectées | Les notifications sociales `user_notifications` sont une boîte de réception, pas un ordonnanceur. Ne pas détourner ce modèle. |
| Analytics | `analytics.track`, consentement existant, catalogue serveur d'événements | Ne pas envoyer titre, note, lieu, photo ou identifiant de projet dans les métadonnées. Nouveaux événements à brancher lors des lots concernés. |
| Stores | Billing Google serveur + priorité des droits manuels ; intégration Apple présente dans le dépôt et branche dédiée | Aucune modification des abonnements ni SKU IA+. |

## Vérifications Production en lecture seule

Schéma, politiques et fonctions consultés sans lire les contenus personnels : `inspirations`, `journal_entries`, `profiles`, `workspaces`, `account_entitlements`, `feature_usage`, `support_staff`, `nm_capabilities`, `require_feature`, `effective_tier` et politiques RLS.

Les inspirations peuvent être lues lorsqu'elles sont publiques ou partagées ; les membres d'un espace peuvent lire/modifier ses inspirations et son Journal. Un projet contenant une tenue, des notes privées et un planning ne doit donc pas être ajouté à ces snapshots partagés. La table Pro existante `pro_creations` est réservée aux créations Pro, pas aux projets personnels Free/Plus/Pro.

## Décision de modèle

Créer un petit agrégat personnel `pose_projects`, plutôt que transformer les inspirations publiables ou imposer une date future au Journal. Il conserve une composition réutilisant le format existant et des références vers les sources / réalisations. L'inspiration source reste une source, la composition du projet porte ses adaptations ; la fiche du Journal reste l'historique d'une réalisation. Aucune copie globale de la Collection ou des préférences.

Le planning est porté par `pose_plan_items` ; les rappels par `pose_reminders`. Les dates prévues sont lues dans le planning, pas dupliquées dans le projet. Les statuts du projet n'envoient aucune notification automatiquement. Toute date et tout rappel résultent d'un choix explicite.

Les anciennes fiches ne sont ni déplacées ni réécrites : adaptateurs à la demande, clé de provenance stable et unique par utilisatrice. Deux réalisations de la même inspiration produisent deux projets distincts ; relire la même fiche n'en crée pas un second.

## Conflits de droits identifiés

1. Le client actuel bloque l'écriture du Journal pour Free (`main.jsx:saveJournal`) tandis que `nm_capabilities.personal` vaut true. Le lot 1 n'accorde pas le Journal via IA+ et n'introduit pas de nouvelle réalisation dans le Journal. Arbitrage nécessaire avant le branchement du lot 7.
2. `photo_projects`, social et Fil sont Plus/Pro. « Ma tenue, mes nails » avec photo ne doit pas devenir un contournement Free. Les fondations conservent le contrôle serveur `require_feature('photo_projects')` sur les sources photo/tenue ; le choix commercial du lot 2 restera explicite.
3. `realistic` est désactivé dans `require_feature`. IA+ est un nouveau droit indépendant, pas un alias du rendu réaliste ni de Pro. Les endpoints fournisseur restent lot 11.
4. Les droits manuels `admin`, `beta_self_selection`, `legacy`, `beta_invitation` ont priorité sur Google Play. Aucune fonction existante de calcul de niveau ni ligne de ces registres ne sera modifiée.
5. L'historique de migrations local n'est pas une liste à déployer en bloc : le socle ancien vit aussi dans `phase12/`, certaines versions Production ont des horodatages différents, Apple et la projection publique DA06 ne sont pas toutes appliquées. La nouvelle migration aura des prérequis explicites et sera testée isolément, sans `db push` Production.

## Périmètre lot 1

Modèles validés côté JavaScript et SQL, adaptateurs anciens projets/Journal/tutoriels, dépôt CRUD avec contrôle de propriétaire et de révision, RLS, fondation IA+ avec flags serveur fermés, démonstration locale de validation, tests unitaires/Postgres/navigateur. Pas de lot 2, pas de calendrier natif, pas d'ordonnanceur de notifications, pas d'appel IA, pas de paywall, pas de migration distante.
