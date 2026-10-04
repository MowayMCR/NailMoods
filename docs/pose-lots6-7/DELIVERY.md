# NailMoods — Lots 6 et 7, recette

Base : Lot 5 validé, branche `feat/pose-sharing-lot5`, arbre `82b70888ea00f28ce7fc23826dc0ba354c98a9b7`. Travail sur `feat/pose-tutorial-followup-lots6-7`. Aucune modification Production, fusion ou génération AAB.

## Correction demandée

Le sélecteur global `.productSheet input { width:100% }` écrasait la largeur de la case à cocher. Le texte anonyme du label flex se retrouvait réduit à quelques pixels. Les options PO et calendrier ont maintenant une case de 22 px, un texte dans une colonne flexible explicite et des marges conservées. Test de la largeur réelle du texte, en plus de l’absence de débordement, à 320, 360, 390 et 430 px.

## Lot 6 — tutoriel et minuteurs

Réutilisation de `tutorial.js`, `TutorialView`, des étapes et instantanés de recettes existants. Aucun moteur parallèle. Démarrer, pause, reprise, remise à zéro, terminer volontairement. Le temps repose sur une échéance absolue persistée ; fermer l’app ne le remet pas à zéro. Aucune expiration ou terminaison de minuteur ne valide une étape automatiquement.

Alertes sur opt-in : Web Audio et vibration si disponible pendant l’ouverture du navigateur ; LocalNotifications sur Android/iOS, canal discret et contenu générique. Une notification utilise un identifiant distinct des 60 rappels Planning. Les opérations sont sérialisées et invalidées au changement de compte. Pause, fin et déconnexion retirent la programmation. Le clic sur l’alerte revient uniquement au tutoriel du même compte/espace. Son du navigateur à réactiver après rechargement. Notifications natives volontairement non exactes, sans nouvelle permission d’alarme exacte : le système peut retarder la réception. Elles ne remplacent pas le minuteur de la lampe.

Correction supplémentaire détectée en test : les mutations du cache compte deviennent durables immédiatement, indépendamment d’une requête réseau déjà en cours. Sérialisation des écritures locales et conservation du refus en cas de brouillons concurrents dans un autre onglet.

Protocoles : contrat commun de référence fabricant (marque, gamme, type, référence exacte, source HTTPS, date de vérification, couche, modèle de lampe et durée / étapes de dépose). Registre éditorial actuellement vide car aucun protocole vérifié n’a été fourni. Les métadonnées personnelles, une proximité de couleur ou les watts ne sont jamais une source de durée. Aucun temps de catalysation n’est inventé.

## Lot 7 — une seule histoire de pose

`pose_projects` reste central. Le tutoriel lié est réutilisé ; terminer le guide enregistre une fiche privée dans le Journal, puis propose son suivi. « Je l’ai faite » depuis le projet réalise la même opération. Le client n’écrit pas deux objets indépendamment : une RPC transactionnelle crée ou retrouve la fiche existante, contrôle le propriétaire, la révision et les dates, puis lie `journal_entry_id`. Répéter le même enregistrement ne produit pas de doublon. Un conflit conserve l’existant et demande un rechargement.

La réalisation conserve composition, techniques et produits de la recette. Les couleurs confirmées ont priorité. Les teintes conceptuelles ne deviennent pas des produits prétendument utilisés. L’événement et les rendez-vous restent dans le Planning existant. Les anciennes entrées du Journal, leurs photos, notes et visibilité sont conservées. Le suivi du Journal retrouve d’abord le projet par `journal_entry_id`. La date réelle modifiée dans le Journal est propagée au projet ; une date incompatible avec des observations existantes est refusée.

Timeline existante enrichie : âge depuis la date réelle, photo privée, note, observation auto-déclarée et ressenti ; points J+X libres. Accès directs « Prévoir un suivi », « Prévoir un entretien », « Prévoir une dépose » avec type prérempli et date laissée au choix de l’utilisatrice. Les rappels restent facultatifs et modifiables dans le Planning. La date réelle de dépose arrête le compteur. Le guide de dépose recherche uniquement un protocole vérifié pour la référence ; à défaut il le dit et renvoie au fabricant ou à la professionnelle.

## Données et droits

Deux migrations appliquées uniquement à `pueqkbwfwxgqzmkauxoz` :

- `20261004181023_pose_realization_journal.sql` : RPC publique SECURITY INVOKER, implémentation privée SECURITY DEFINER à `search_path=''`, transaction et synchronisation des dates.
- `20261004181700_pose_cycle_completion_events.sql` : fidélité des couleurs / exclusion des produits conceptuels et catalogue des événements analytics.

Aucune nouvelle table ni nouveau stockage de tenues, tutoriels, événements ou photos. Réutilisation de `journal_entries`, `pose_projects`, `pose_plan_items`, `pose_reminders`, des préférences compte et du bucket privé existant. Le suivi n’est jamais copié dans la fiche PO ou le Journal publiable. La suppression d’un projet ne supprime pas sa fiche Journal personnelle ; les médias du suivi suivent la file de nettoyage existante.

Free conserve ses réalisations et leur suivi personnel. Photo d’inspiration / tenue et social restent Plus/Pro. Aucun droit bêta ou store modifié. IA+ reste fermé, sans SKU, paywall ni appel de génération payant.

Analytics via le consentement existant : `pose_realized` (source), `pose_followup_saved` (présence d’image, aucun contenu), `pose_removal_guide_opened` (sans métadonnée personnelle). Aucun titre, note, path média ou identifiant de pose dans ces événements.

## Validation

Résultats automatiques, parcours réel et captures dans `evidence/`. Fixtures synthétiques et trois comptes de recette dédiés, sans contact avec une véritable destinataire. Les préférences des comptes sont restaurées et les projets, rendez-vous, rappels et entrées Journal de test supprimés après le parcours. La photo de test est une illustration de l’app importée par le vrai sélecteur, pas une photographie clinique.

Tests ciblés : transaction Free, répétition, conflit, rollback après date invalide, autre compte / anonyme, fidélité HEX ; minuteur pause / reprise / terminaison sans validation d’étape, échéance après reload ; coexistence Planning, permission refusée, déconnexion pendant une programmation ; rejet d’une prétendue durée fabricant ; fusion Journal sans perdre les brouillons ; sauvegarde locale pendant une requête réseau bloquée.

Audit sécurité recette : aucun nouvel avertissement de fonction exposée ou RLS. Les quatre avertissements de fonctions billing/entitlement et la protection contre mots de passe compromis désactivée étaient préexistants ; hors périmètre de ces lots.

## Limites et vérifications avant bêta

Aucun appareil Android/iOS physique ni SDK natif disponible dans cet environnement. Restent obligatoires : réception avec app ouverte, en arrière-plan, verrouillée et fermée ; son/vibration et réglages silencieux ; reprise par clic d’alerte à froid ; suspension Android / restrictions batterie ; effacement des notifications à déconnexion ; photographie par caméra native et persistance hors ligne sur chaque plateforme. La programmation et les courses d’annulation sont couvertes par adaptateurs de test, pas par une preuve de réception OS.

Pas de protocole fabricant réel dans le registre : les écrans affichent le fallback explicite. Les instructions détaillées ne seront disponibles qu’après vérification et ajout de références exactes. Le guide de gestes reste celui déjà disponible, avec les limites de techniques indiquées dans la fiche DIY.

## Retour arrière

Revenir au commit Lot 5 pour le client. Les migrations sont additives et peuvent rester en recette : le client précédent ignore les nouveaux champs de tutoriel et conserve les poses. Si retrait SQL nécessaire, retirer d’abord le trigger `pose_journal_date_sync`, puis la fonction de trigger, puis le wrapper public `realize_pose_project` et son implémentation privée. Ne supprimer aucune ligne de Journal, projet ou média utilisateur. Ne pas retirer le schéma de fondations ni les droits Free.

## Résultats de cette exécution

510 tests recensés : 508 réussis, 0 échec, 2 anciens tests optionnels ignorés. Build recette réussi. 8 groupes de contrôles du parcours réel réussis avec 3 comptes authentifiés. Rapport : 9 captures chargées, 4 onglets moods, aucun débordement à 320 / 390 / 1200 px. Nettoyage vérifié en base : aucun projet, Planning ou Journal de cette exécution restant.

Champs optionnels supplémentaires des sessions de tutoriel existantes : `alertsEnabled`, `poseProjectId`, `cycleCompletionPending`. Les anciennes sessions restent lisibles. Le registre de protocoles n’accepte aucune entrée utilisateur comme validation fabricant.

## Fichiers modifiés / ajoutés

- `.gitignore`
- `docs/pose-lots6-7/DELIVERY.md`
- `docs/pose-lots6-7/evidence/browser-lots67.json`
- `docs/pose-lots6-7/evidence/report-validation.json`
- `scripts/build-pose-lots67-report.py`
- `scripts/test-pose-lots67-browser.mjs`
- `scripts/test-pose-lots67-report.mjs`
- `src/TutorialView.jsx`
- `src/cloud/AccountRoot.jsx`
- `src/cloud/store.js`
- `src/main.jsx`
- `src/platform/nativeRuntime.js`
- `src/poseCycle/DiyView.jsx`
- `src/poseCycle/JournalTracking.jsx`
- `src/poseCycle/PlanningView.jsx`
- `src/poseCycle/PoseFollowUp.jsx`
- `src/poseCycle/PoseProjectSheet.jsx`
- `src/poseCycle/ProjectShare.jsx`
- `src/poseCycle/RemovalGuide.jsx`
- `src/poseCycle/TutorialCompletion.jsx`
- `src/poseCycle/TutorialTimerRuntime.jsx`
- `src/poseCycle/followUpService.js`
- `src/poseCycle/projectSheet.css`
- `src/poseCycle/protocols.js`
- `src/poseCycle/protocols/registry.js`
- `src/poseCycle/timerAlerts.js`
- `src/poseCycle/timerScheduler.js`
- `src/tutorial.css`
- `src/tutorial.js`
- `supabase/migrations/20261004181023_pose_realization_journal.sql`
- `supabase/migrations/20261004181700_pose_cycle_completion_events.sql`
- `tests/cloud-store.test.js`
- `tests/pose-realization.test.js`
- `tests/tutorial-timer-alerts.test.js`
