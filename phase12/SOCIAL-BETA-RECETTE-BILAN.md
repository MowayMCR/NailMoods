# Phase 12 — bilan intermédiaire Recette, 21 septembre 2026

Décision : **NO GO pour clôturer la Phase 12 ou promouvoir en Production.**
Le présent lot ajoute des fonctions utilisables, mais ne satisfait pas encore tous les critères de finalisation. Aucun paiement ni tracking nouveau activé.

## État initial vérifié
Auth, workspaces, collections synchronisées, recherche par identifiant, visibilité des profils/contenus et médias protégés existaient. Les tables de conversation/messages refusaient tout accès client. Le partage PO était une fiche séparée. Contrairement au contexte fourni, le code Recette utilise la politique 0.1-beta et `TECHNOLOGIES.analytics=false`; aucun système 0.2-beta actif n'a été identifié dans ce checkout.

## Ajouts
- Profil → Social Bêta → Mes connexions : demandes reçues/envoyées, acceptation/refus/annulation, retrait, messagerie.
- Invitation depuis un profil public. Une paire de comptes n'a qu'une relation. Une demande croisée ne vaut pas acceptation.
- Conversation privée 1-to-1, texte limité à 2 000 caractères, historique par pages de 40, horodatage et non-lus. Retrait de relation bloque l'accès et les nouveaux échanges, historique conservé au serveur.
- Partage PO limité aux connexions acceptées; carte palette/techniques/matériel dans la conversation. Envoi ouvre la conversation.
- Comparaison avec collection PO existante conservée; couleurs proches et matériel repéré restent indicatifs, faisabilité à confirmer.
- Découverte et favoris sociaux par référence, pages de 20, recherche titre/mood/identifiant. Contenu devenu privé exclu à la prochaine lecture; aucun snapshot privé remis au client par ces API.
- Signal « Nouveau » sur Mes connexions pour demandes et messages non lus.

## Données et migrations
Migrations appliquées uniquement à NailMoods-Recette : `social_beta_connections_messages`, `social_beta_content_sharing`, `social_share_validation`.
Nouvelles tables privées : `private.social_connections`, `private.social_favorites`.
Tables existantes touchées : conversations (clé unique de paire), messages (client_id de dédoublonnage, share_id), conversation_members (lecture), inspiration_shares, user_notifications.
API ajoutées : `nm_social`, `nm_discover`; partage `send_nailmoods_share_to_po` renforcé.
Les wrappers publics sont SECURITY INVOKER. Logique privilégiée en schéma private, search_path vide, contrôle utilisateur confirmé pour social/partage, autorisation par paire acceptée. RLS conservées; aucune nouvelle permission sur les collections ou workspaces d'autrui. Aucun accès anonyme aux trois RPC vérifié.
Edge Functions et Storage : aucun changement dans ce lot. Pas d'envoi de photos ou notes privées.
Rollback : revenir à la publication précédente et utiliser social-beta-rollback.sql pour fermer les nouvelles API sans supprimer de données.

## Tests réalisés
- Suite existante : 264 réussis, 2 tests d'intégration sautés.
- Compilation de l'application réussie.
- Scénarios SQL transactionnels avec identités des fixtures, rôle authenticated, puis ROLLBACK : invitation, doublon, demande croisée, acceptation, message, lecture, refus du troisième compte, retrait et blocage de l'envoi après retrait.
- Favori public lisible, puis disparition après passage privé; snapshot brut inaccessible par RLS.
- Partage PO reçu dans conversation; notes injectées dans payload supprimées par l'allowlist serveur.
- Ce sont des tests d'autorisation serveur; ils ne valident PAS une authentification réelle sur deux appareils.
- Advisors : nouvelles tables privées fermées signalées INFO (intentionnel); alertes préexistantes sur fonction get_public_profile et protection mots de passe compromis. Documentation : https://supabase.com/docs/guides/database/database-linter et https://supabase.com/docs/guides/auth/password-security.

## Performance et analytics
Chargement des relations plafonné à 100; historique à 40; découverte à 20. Rafraîchissement messages toutes les 20 s lorsque visible, connexions toutes les 60 s. Pas de polling pour un invité. Index de paires, de messages et de membres ajoutés. Base observée : 14 MB; cette mesure ne démontre pas une capacité bêta.
Événements sociaux et filtre de consentement préparés dans src/social/events.js; transport désactivé et non raccordé, aucun événement émis. L'activation 0.2-beta et le raccordement au collecteur existant sont à compléter après rapprochement Recette/Production. Pas d'acceptation inventée.

## Écarts encore ouverts / NOT RUN
- Parcours navigateur et second téléphone : NOT RUN. Authentification API réelle A/B/C et reconnexion : réussies.
- Charge de 10/25/50 utilisateurs distincts, photos, Storage, Edge Functions, egress et marge du plan : NOT RUN. Les essais ci-dessous portent sur des requêtes concurrentes de trois comptes.
- Imports JPEG/PNG/WebP 1–4 en conditions réelles (interruption, reprise, refresh/reconnexion) : NOT RUN dans ce lot; tests unitaires existants conservés.
- Rôles institut, invitations, changement d'espace et isolation après retrait de membre : NOT RUN dans ce lot.
- Partage riche lié au contenu source : miniature par ongle, références produits cliente/manquants, lien résolvable, choix explicite de partage des images/notes restent à compléter. La carte actuelle est un résumé minimal, pas toute la fiche demandée.
- Favoris d'une proposition Pro privée partagée : non implémentés. Favoris sociaux séparés des favoris personnels existants.
- Découverte par teinte, occasion, technique et pagination des connexions >100 : à compléter.
- Notifications détaillées d'acceptation/partage : à compléter; indication demandes/messages seulement.
- Mise à jour immédiate d'un écran public déjà ouvert après révocation : pas de push; serveur refuse les nouvelles lectures mais données déjà affichées restent jusqu'au rafraîchissement.
- Raccordement effectif analytics et politique 0.2-beta : à compléter, désactivé actuellement.

## Recette humaine
Avec deux comptes de test confirmés, rendre B-Pro trouvable, rechercher B depuis A, inviter, accepter depuis B, échanger un texte puis partager un projet depuis A. Vérifier sa carte dans la conversation B et sa comparaison dans l'espace PO. Refaire après refresh/reconnexion et sur second appareil. C doit échouer à accéder aux échanges ou collections privées. Tester ensuite favori d'un contenu public puis passage privé et retrait de connexion.

La Production n'est pas modifiée. Les critères manquants interdisent d'annoncer une Phase 12 terminée.

## Tests API réels et concurrence
Résultats détaillés : social-beta-live-results.json. Trois comptes de test préexistants ont réussi la connexion réelle, invitation/doublon, acceptation, envoi/dédoublonnage, lecture B, refus C, blocage après retrait et reconnexion.

| Requêtes simultanées | Médiane | p95 | Erreurs |
|---|---:|---:|---:|
| 10 | 7 753 ms | 7 956 ms | 0 |
| 25 | 7 273 ms | 7 325 ms | 0 |
| 50 | 8 379 ms | 8 796 ms | 0 |

Ces durées sont mesurées depuis cet environnement via son proxy réseau, sans séparation du temps serveur. Elles restent élevées et ne prouvent pas une capacité de 50 utilisateurs actifs. Aucun upload ni génération n’a été chargé.

## Configuration Recette
Le bundle précédent ne disposait pas des variables publiques Supabase dans cet environnement de compilation. Le build est désormais reproductible avec une configuration publique explicitement limitée à Recette. Aucun secret serveur n’est embarqué. Ce correctif permet de retrouver les fonctions connectées; le parcours visuel reste à vérifier au navigateur.
