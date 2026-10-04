# NailMoods — Mois complet et suivi personnel

Base : feat/pose-planning-lot3 (arbre a6cdec9ce62ff4b733ff6bffbd179102f7dd6a2d).
Branche de travail : feat/pose-month-followup. Extension du Lot 3 validé, sans Lot 4 ni AAB.

## Comportement

Le Planning conserve À venir et Tout et ajoute Mois : semaines du lundi au dimanche, navigation entre mois, retour à aujourd’hui, sélection d’un jour et ajout avec sa date préremplie. Les rendez-vous annulés restent dans Tout. Sept types utilisent des couleurs DA06 centralisées : pose, événement, photo de suivi, entretien, dépose, préparation et moment personnel. Les libellés, la légende et les noms accessibles complètent la couleur.

Chaque Projet de pose permet de déclarer sa date réelle, de calculer son âge par jours calendaires, d’ajouter/modifier/supprimer des observations privées avec photo, note, tenue observée et ressenti auto-déclaré. La date de dépose arrête le compteur de durée portée. Aucune échéance médicale ou durée universelle n’est proposée. Les observations peuvent continuer après la dépose.

Mes poses → Réalisées affiche les projets réalisés dans « Mes poses suivies », sans copier le projet dans une deuxième table. Une ancienne fiche Journal synchronisée dispose de « Suivre cette pose » : import idempotent par référence historique, liaison au Journal existant, photo et notes initiales conservées dans leur source. Les observations nouvelles restent uniquement dans pose_projects. La date initiale est reprise lors de cette liaison ; les éditions ultérieures des dates du Journal et du suivi ne sont pas synchronisées automatiquement.

## Modèle

Aucune table supplémentaire. Extension de pose_projects.details :

- realizedOn : date réelle existante.
- removedOn : date facultative de dépose ; absente ou null sur les anciens projets.
- followUp[] : id UUID, date, note (2 000 caractères), feeling, state, media (null ou référence privée).
- Maximum 200 observations par projet ; dates à partir de la réalisation et jusqu’à aujourd’hui.
- Référence photo : bucket nailmoods-private, chemin propriétaire/espace/followup/projet-observation-version.ext. Chaque remplacement utilise un chemin neuf.
- Les modifications restent protégées par révision/CAS : aucune fusion silencieuse après conflit.
- Suppression/remplacement d’une observation ou suppression du projet : ajout à la file de nettoyage existante. Le vérificateur protège les médias encore référencés. Aucun chemin public ni URL signée persistée.

Les migrations 20261004155630_pose_followup_tracking.sql et 20261004160931_pose_followup_journal_access.sql étendent le garde-fou et le nettoyage média existants. Elles ont été testées avec PGlite puis appliquées uniquement à NailMoods-Recette (pueqkbwfwxgqzmkauxoz).

## Droits

Suivi personnel disponible Free, Plus et Pro. Un compte repassé Free peut suivre une ancienne pose issue d’une tenue sans débloquer sa création ou l’édition premium de la source. IA+ n’accorde aucun droit photo et demeure fermé. Les RLS de projet et Storage restent propriétaires ; aucun élargissement à un autre compte ou au public.

## Réutilisation

pose_projects, pose_plan_items, pose_reminders, poseRepository, projectFromJournal, Journal existant, ProductPhoto (compression et retrait des métadonnées par canvas), stockage privé, nettoyage média, PLAN_KINDS, moteur de tokens DA06, boutons communs, renderer NailPreview et intégrations calendrier/notifications du Lot 3.

## Limites et validation mobile

La validation des notifications et des éditeurs calendrier sur appareils physiques Android/iOS reste à faire selon docs/pose-lot3/TESTS-APPAREILS.md. Cette extension ne déclare pas ces tests réussis. Pas de SDK Android/Xcode dans cet environnement, pas de build natif/AAB, aucun merge ou déploiement Production.

Les rendez-vous restent rattachés à un Projet de pose. La vue mensuelle n’est pas un CRM de salon. Les photos des captures sont une illustration NailMoods utilisée comme fixture de test, pas une photographie personnelle. Les données de démonstration en recette sont retirées après les tests.

## Retour arrière

Masquer le cycle avec VITE_POSE_CYCLE_ENABLED=false conserve toutes les données. Pour revenir à l’UI du Lot 3, revenir au commit de base sans retirer la migration : les anciens écrans ignorent les nouvelles observations. Ne pas restaurer l’ancien pose_guard tant que des followUp sont présents, sinon les anciennes validations empêcheraient les mises à jour. Sauvegarder/exporter les suivis avant toute réduction de schéma ; aucune suppression automatique des données n’est fournie.

## Sécurité Supabase

Advisors : aucun nouveau problème de cette extension. Avertissements préexistants conservés dans le périmètre précédent : quatre fonctions d’entitlements SECURITY DEFINER accessibles aux comptes connectés, protection des mots de passe compromis désactivée.

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Documentation Storage contrôlée : https://supabase.com/docs/guides/storage/security/access-control ; changelog consulté le 4 octobre 2026. Pas de nouvelle dépendance.

## Vérifications automatisées

Suite complète : 486 tests, 484 réussis, 0 échec, 2 anciens tests opt-in ignorés.
Les nouveaux tests couvrent semaines complètes/lundi, février bissextile, changement d’année, rendez-vous annulés, âge à travers un changement d’heure, arrêt à la dépose, dates invalides, références photo privées, RLS entre deux comptes, nettoyage après retrait d’une image, accès Free et maintien du verrou premium. Les résultats navigateur réels sont dans evidence/browser-month-followup.json.

Parcours navigateur connecté à la recette : 10 groupes de contrôles réussis (mois, création datée, 4 largeurs, 4 moods, réalisation et photo, Mes poses, dépose, édition/suppression, isolation et Free). Vérification supplémentaire du média encore référencé : téléchargement propriétaire réussi avant ET après le refus du second compte. Le suivi est également contrôlé aux quatre largeurs mobiles. Aucun pageerror JavaScript.
