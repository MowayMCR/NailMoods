# NailMoods — Lot 5 : Ma fiche pose / ma PO

Branche `feat/pose-sharing-lot5`, issue du Lot 4 validé (`feat/pose-diy-lot4`, arbre `048e66f8bc9cc7ea9ad4af56d1a14956a22fb150`). Aucun déploiement Production, fusion ou AAB. IA+ reste fermé. Attendre la validation de Marie avant le Lot 6.

## Audit et réutilisation

- `pose_projects` : même projet, même composition et révision ; aucun modèle de pose supplémentaire.
- `inspiration_shares` : export privé existant, relié au projet, sans table de partage parallèle.
- `private.send_nailmoods_share_to_po` : contrôle social Plus/Pro, identité confirmée, PO Pro, connexion acceptée, blocages, limite d’envoi, contrôle des images privées, message et notification existants.
- `private.nm_share_detail`, `nm_social`, `received_nailmoods_po_shares` : participants, connexion courante et droits vérifiés à chaque lecture serveur. Un lien transféré n’accorde aucun droit.
- `RecipientIdentity`, `poShareService` : identité et sélection des connexions Pro déjà validées.
- `NailPreview`, `RecipeSummary`, `Button`, `Sheet`, `MoodPicker` : rendu, recette, accessibilité du dialogue et DA06 conservés.
- `DiyView`, `PoseFollowUp`, Planning, `poseRepository` : préparation, suivi, calendrier, contrôle propriétaire et conflits de révision existants.
- `exportCalendar`, `.ics`, plugins Android/iOS : intégration existante réutilisée.
- `ContentImage` / `media-read` : accès aux médias par la passerelle privée existante ; pas de stockage public ni d’URL signée diffusée.

## Parcours

Créer → Mes projets de pose → ouvrir une fiche centrale → **Je la fais moi-même**, **Planifier cette pose**, **Envoyer à ma PO**, **Créer une variante**. Recette, palette, tenue privée lorsqu’elle existe, calendrier, note privée et suivi restent sur ce même projet.

Envoi PO : sélection d’une connexion Pro acceptée → aperçu exact reconstruit par le serveur → options notes/photo désactivées par défaut → confirmation explicite → fiche reçue dans la conversation existante → lien privé / partage natif / QR local.

La fiche comprend silhouette, longueur, mood, techniques, teintes et références enregistrées, finitions, opacité renseignée, matériel et décorations. Les compatibilités/protocoles absents ne sont pas inventés. Les couleurs de famille imprécises ne sont pas présentées comme un HEX produit confirmé.

**Retirer l’accès** supprime la fiche partagée et invalide son lien/QR. La suppression du projet retire ses fiches PO en cascade. Les copies ou captures déjà faites par une destinataire ne peuvent pas être effacées à distance.

## Migration recette uniquement

`supabase/migrations/20261004173436_pose_project_sharing.sql` (`pose_project_sharing`) :

- `inspiration_shares.pose_project_id` nullable → `pose_projects.id`, `ON DELETE CASCADE`, index partiel. Les partages historiques non liés restent inchangés.
- RPC `pose_share_preview(project_id, include_notes, include_images)` : sélection propriétaire, composition autorisée explicitement, exclusion des données privées hors opt-in.
- RPC `send_pose_project_to_po(project_id, revision, recipient_workspace_id, client_id, include_notes, include_images)` : verrou/révision, reconstruction serveur, appel du partage social existant, envoi idempotent.
- RPC `pose_project_shares(project_id)` : historique du propriétaire uniquement.
- RPC `revoke_pose_share(share_id)` : retrait réservé à l’expéditrice, y compris après passage en Free.
- Fonctions publiques `SECURITY INVOKER`, implémentation dans `private` avec `search_path=''`. Aucun accès direct aux tables de partage pour les rôles client.

La fiche texte/composition est un instantané confirmé ; modifier le projet ne la met pas à jour. Une image jointe reste une référence au média privé existant, pas une publication ni un nouveau catalogue de photos.

## Droits et liens

- Free : projet personnel / DIY conservés ; gestion du retrait d’un ancien partage possible ; nouvel envoi PO réservé à Plus/Pro.
- Plus/Pro : droits sociaux existants ; la destinataire PO doit être Pro et une connexion acceptée.
- IA+ ne débloque ni import ni partage. Aucun endpoint IA, coût, SKU ou paywall ajouté.
- Web : `#partage/:shareId`. Retour après connexion préparé en mémoire dans la même session.
- Android/iOS : `com.nailmoods.app.recette://share/:shareId` en recette ; schéma Production distinct. Android ajoute l’hôte `share` ; iOS possède déjà le schéma. Aucun token d’accès dans le lien.
- QR calculé sur l’appareil avec `bwip-js` déjà présent dans le projet, passé en dépendance d’exécution. Chargement différé uniquement à l’ouverture du QR.
- Analytics : événement existant `share_to_pro_sent`, selon le consentement déjà géré ; aucun identifiant, contenu ou photo ajouté à ses métadonnées.

## Tests et captures

Bilan : 502 tests, 500 réussis, aucun échec, deux anciens tests optionnels ignorés. Onze contrôles de parcours connecté réussis, trois vrais comptes. Rapport autonome vérifié : huit captures, quatre moods, 320/390/1200 px.

Voir `evidence/tests-full.txt`, `browser-sharing.json`, `build-recette.txt` et les tests ciblés `tests/pose-sharing*.test.js`.
Les tests SQL locaux emploient des remplaçants explicites pour l’ancien service social ; ils vérifient la nouvelle migration. Les autorisations sociales et médias sont testées séparément sur les RPC réellement déployées en recette avec trois comptes dédiés.
Les projets / produits de démonstration sont synthétiques, l’authentification et la persistance sont réelles. Aucun envoi à une utilisatrice réelle.
Captures de l’application exécutée à 390 px, quatre moods / mêmes données / HEX inchangés ; contrôles responsive à 320/360/390/430 px. Hauteur adaptée au contenu pour les captures longues.

## Limites à vérifier avant une bêta

- Aucun appareil physique Android/iOS disponible ici : feuille de partage, ouverture native à froid/à chaud et éditeur de calendrier doivent être validés sur téléphones. Aucun AAB construit.
- Les liens natifs supposent l’application installée. Les liens web utilisent l’origine de l’app exécutée ; aucun nouvel hébergement / universal link public n’est déployé dans ce lot. Les liens localhost des captures sont des preuves de recette, pas des liens de diffusion.
- Une image téléchargée ou capturée par la destinataire ne peut pas être rappelée. Une fiche déjà à l’écran est revérifiée au retour au premier plan et toutes les 60 secondes ; le serveur refuse immédiatement toute nouvelle lecture après révocation.
- Les données produit absentes restent à préciser. Le rendu illustré reste indicatif, sans photographie générée ni garantie de compatibilité.
- Vite signale des chunks volumineux ; le module QR est différé. Pas de nouvelle dépendance à un prestataire QR.
- Alertes recette antérieures conservées : quatre RPC publiques historiques en SECURITY DEFINER et protection contre les mots de passe compromis désactivée. Aucune nouvelle alerte liée à ce lot.
  - https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
  - https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Retour arrière

Revenir au parent de la branche pour l’interface. Conserver de préférence l’extension SQL additive : elle ne change pas les anciens envois et garde la suppression des fiches liées au projet.
Si l’annulation SQL est nécessaire après sauvegarde : retirer les nouvelles RPC publiques puis privées, le helper `pose_share_product`, l’index et enfin la colonne `pose_project_id`. Les instantanés envoyés restent dans le système existant, mais perdent leur lien/cascade au projet ; ne pas faire cette annulation en laissant des liens diffusés sans traitement des accès. Aucun retour arrière automatique en Production.

## Fichiers

Nouveaux : `PoseProjectSheet.jsx`, `PoseSharedSummary.jsx`, `ProjectShare.jsx`, `shareLinks.js`, `projectSheet.css` dans `src/poseCycle` ; migration ; tests ciblés ; script navigateur ; générateur/validation du rapport ; présent dossier.
Modifiés : `CreateView.jsx`, `main.jsx`, `OutfitFlow.jsx`, `PlanningRuntime.jsx`, `nativeRuntime.js`, `ShareCard.jsx`, `SocialHub.jsx` (le gestionnaire historique de lien cède la place à la page dédiée lorsque le cycle de pose est activé), manifeste Android, dépendances, `.gitignore`.
Logo, assets graphiques, icônes univers, taxonomie, Collection, moteur de génération et droits bêta conservés.
