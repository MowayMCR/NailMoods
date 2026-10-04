# NailMoods — Lot 3 : Planning, calendrier et rappels

## État livré

Développement sur `feat/pose-planning-lot3`, depuis le Lot 2 validé (local `eb535c50590c5fa6321a0b1fd2446dfcd56bf28f`, distant `abcb546fb8a321bb4a11f2399f723e4fcc4a4457`). La DA06, les assets validés, le moteur de moods, les droits Free/Plus/Pro, les droits bêta et IA+ sont conservés.

Le parcours web et les données ont été testés dans l’application réellement exécutée, connectée à **NailMoods-Recette**. Le code natif est intégré et synchronisé. **La validation sur téléphones Android/iOS reste obligatoire : aucune réception de notification sur appareil physique ni ouverture d’un calendrier natif n’est déclarée testée.** Ce lot ne vaut donc pas un GO de diffusion mobile.

Aucun déploiement en Production, AAB, merge, SKU ou appel IA payant. Le Lot 4 n’est pas engagé.

## Parcours

- Créer → Mon Planning, ou Projet de pose → Planifier cette pose.
- À venir : à reprogrammer / cette semaine / plus tard ; Tout : inclut les moments terminés et annulés.
- Types : réalisation, événement, suivi, entretien, dépose, préparation et moment personnel.
- Choix libre de la date, heure facultative, durée, fuseau, lieu et note privée.
- Modification, annulation, clôture ou suppression d’un moment ; lien vers le même projet.
- Rappel à une date et une heure choisies, modification, activation/désactivation et suppression.
- Réglages par catégorie dans le profil ; aucune permission de notification demandée automatiquement à l’entrée.
- Calendrier : résumé avant export, détail/produits/note privée exclus par défaut, ajout via éditeur système ou fichier `.ics`.

Un compte Free peut créer un projet personnel simple et le planifier. La tenue et les imports photo restent Plus/Pro. Le Planning ne contourne aucun droit photo. Un moment terminé ne marque pas automatiquement une pose comme réalisée : « Je l’ai faite » et le suivi restent leurs parcours dédiés.

## Modèle commun réutilisé

Aucune nouvelle table. `pose_projects` reste la fiche centrale, `pose_plan_items` porte les actions/événements et `pose_reminders` leurs rappels. Le dépôt du Lot 1 est utilisé avec contrôle de session, propriétaire, espace personnel et révision. Les préférences de catégories sont dans `profiles.preferences.nailmoodsProfile.planningNotifications` ; aucun deuxième profil.

Migration `20261004151407_pose_planning_lifecycle.sql`, appliquée **uniquement en recette** :

- Un projet aux statuts idée/planifié devient planifié lorsqu’une réalisation est prévue ; revient idée lorsqu’il n’en reste plus. L’historique réalisé/en cours n’est pas rétrogradé.
- Annuler ou terminer une action désactive ses rappels dans la même transaction.
- Un rappel activé ne peut viser une action annulée/terminée. Les suppressions en cascade du Lot 1 restent actives.
- Fonctions de trigger privées en `SECURITY INVOKER`, sans accès direct des clients ; pas de nouvelle surface de RPC privilégiée ni de relâchement RLS.
- Analytics : `planning_created`, `reminder_created`, `calendar_exported`, via le consentement existant. Métadonnées limitées au type/catégorie/format ; aucun titre, date personnelle, note, lieu ou identifiant de projet dans les événements.

## Dates et calendriers

Les heures sont converties dans le fuseau choisi avant enregistrement UTC. Les heures inexistantes ou ambiguës lors des changements d’heure sont refusées avec une explication ; elles ne sont pas silencieusement déplacées. Les événements sur une journée restent des dates, sans heure inventée.

L’export `.ics` utilise une fin exclusive pour les journées, des instants UTC pour les heures, un UID stable, la révision comme SEQUENCE, un échappement des notes et un pliage UTF-8 à 75 octets. Il est marqué privé. Aucun VALARM automatique n’est ajouté au calendrier, afin de ne pas doubler les rappels NailMoods.

Android : petit bridge Capacitor `NailMoodsCalendar` vers `ACTION_INSERT` / `CalendarContract`. Aucune lecture du calendrier ni permission READ/WRITE_CALENDAR. Le retour confirme uniquement l’ouverture ; Android ne prouve pas l’enregistrement par l’utilisatrice.

iOS 17+ : `EKEventEditViewController`, événement prérempli et confirmation par l’utilisatrice, sans accès permanent au calendrier. iOS 16 : export `.ics` proposé au partage. Les clés d’accès complet au calendrier ne sont pas ajoutées. Ce fallback évite de demander l’accès complet sur les anciennes versions.

La copie du calendrier n’est pas synchronisée après coup. L’interface le précise et invite à vérifier les doublons. La note privée et les références produit ne sont copiées qu’après activation explicite de l’option. Le calendrier choisi peut lui-même être partagé ou synchronisé par l’utilisatrice.

## Notifications locales

Plugin officiel `@capacitor/local-notifications` **8.3.1**, version et lockfile figés. Une autorisation explicite est proposée dans Mes rappels, sur chaque téléphone. Le navigateur conserve le Planning et permet l’export calendrier ; il n’annonce pas de notifications fiables lorsque l’app est fermée.

- Programmation OS des 60 prochains rappels personnels, futurs, activés, de catégories autorisées, liés à des actions encore prévues.
- Texte discret et générique, sans titre privé, produit, lieu ou note sur l’écran verrouillé.
- Synchronisation à l’ouverture, au retour au premier plan, à la reconnexion réseau, après les modifications et toutes les 60 secondes au premier plan.
- Les choix récents locaux priment pendant leur sauvegarde ; les réglages serveur sont relus pour tenir compte des autres appareils.
- Opérations OS sérialisées ; déconnexion/changement de compte invalident une programmation en cours et retirent les rappels du compte précédent.
- Désactivation d’une catégorie : retrait local avant recalcul ; aucune nécessité d’attendre une réponse réseau pour retirer les anciennes programmations.
- Supprimer un moment ou un rappel retire les notifications programmées sur le téléphone actif lors de la synchronisation.
- Android : `isExactNotification=false`, permission spéciale `SCHEDULE_EXACT_ALARM` retirée du manifeste fusionné. Pas de demande d’accès « alarmes exactes ». L’OS peut décaler un rappel pour économiser la batterie.

Limites : il s’agit de notifications locales, pas de push serveur. Une modification effectuée sur un autre appareil n’annule pas instantanément les notifications d’un téléphone qui reste hors ligne/fermé ; ce téléphone se resynchronise à sa prochaine ouverture. Au-delà de 60 rappels, la suite est chargée au prochain passage dans l’app. Arrêt forcé, économies d’énergie, espace privé Android et réglages système peuvent empêcher/retarder la réception. La réception réelle en avant-plan, arrière-plan et app fermée doit être vérifiée sur les appareils cibles.

## Liens vers le projet

- Android/iOS : `com.nailmoods.app.recette://pose/<uuid>` en recette ; schéma Production distinct dans le code.
- Validation stricte du schéma, hôte et UUID ; pas de token, paramètre, identifiant de session ni URL de stockage dans le lien.
- Lien conservé pendant l’authentification ; ouverture après restauration du compte et du profil. La lecture finale reste soumise à RLS.
- Un tap de notification vérifie aussi le compte associé avant de naviguer.
- Un export depuis le web inclut l’URL web du projet ; depuis le natif, le lien de l’app. Pas de nouveau domaine ni de serveur web publié pour ce lot.

## Validation et preuves

Les preuves sont dans `evidence/`. Les captures affichent le même Planning de test dans Soft Glam, Dark Feminine, Cottagecore et Pop Pastel. Il s’agit de l’application exécutée, avec Auth/Supabase réels ; le projet et les données sont temporaires et supprimés après test.

Le test navigateur couvre : créer → modifier → rappel → modifier/désactiver/réactiver → recharger → exporter .ics → quatre moods → préférence mémorisée → projet/Planning → refus d’accès du second compte → annulation → suppression en cascade → compte Free autorisé.

Les tests locaux couvrent aussi : UTC/fuseaux, changement d’heure Paris, fuseau à 45 minutes, journée entière, injections de lignes ICS, limite UTF-8, cloisonnement des liens, catégories, capacité de notifications et interruption d’une programmation par une déconnexion. Ces tests avec adaptateur simulé ne remplacent pas les essais physiques.

Build web recette et build des assets mobiles exécutés ; synchronisation Capacitor Android et iOS exécutée. L’environnement n’a pas de SDK Android ni de Xcode/macOS ; Java disponible est 17 alors que la chaîne Capacitor 8 exige Java 21. Pas de compilation native ni de test OS simulé présenté comme un test appareil.

Les conseillers Supabase n’ont pas signalé de nouvelle ouverture liée au lot. Avertissements préexistants : quatre fonctions de droits/quotas en SECURITY DEFINER appelables par les comptes, et protection contre les mots de passe compromis désactivée. Voir https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable et https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Reproduire et revenir en arrière

```sh
npm ci
npm test
node scripts/build-recette.mjs
NM_POSE_FIXTURES=/chemin/prive/fixtures.json node scripts/test-planning-browser.mjs
node scripts/build-mobile.mjs recette
NAILMOODS_MOBILE_ENV=recette npx cap sync android
NAILMOODS_MOBILE_ENV=recette NAILMOODS_PLATFORM=ios npx cap sync ios
```

Les identifiants des comptes A/B/C ne sont pas inclus. Le test refuse toute URL Supabase autre que la recette et bloque le domaine Production dans le navigateur. Il restaure les préférences et supprime seulement ses projets fixtures.

Retour arrière : avant de désactiver le parcours sur une version mobile déjà testée, annuler ses notifications locales. Revenir au commit Lot 2 retire l’UI. `ROLLBACK.sql` retire uniquement les nouveaux triggers/fonctions, sans supprimer projets, événements, rappels ou préférences. Les statuts planifiés existants sont conservés. Ne pas pousser l’historique complet des migrations vers Production sans comparaison préalable.

## Bilan chiffré final

- 481 tests au total : **479 réussis, 0 échec, 2 ignorés** (anciens scénarios opt-in de tiers/médias).
- Six nouveaux tests locaux ; douze contrôles de parcours regroupés dans `browser-planning.json`, avec trois comptes Auth réels.
- Build web recette, assets mobiles et synchronisation Android/iOS réussis. Avertissement Vite de bundle >500 kB conservé.
- Dernière vérification serveur : migration présente, fonctions privées invoker, fixtures supprimées, IA+ toujours false/false.
- Captures finales inspectées, même projet et même rappel dans les quatre moods.
- Tests appareil physique, compilation Android/iOS et ouverture du calendrier système : **non exécutés**, à réaliser avant le GO mobile.
