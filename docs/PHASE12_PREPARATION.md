# Phase 12 — comptes, Plus et Pro Light

## État réel

**Préparation seulement, non activée.** L'hébergement existant GitHub Pages sert une application statique. Aucun fournisseur Auth, base privée, stockage de photos ni envoi d'emails n'est connecté. Aucun faux compte ou plan local n'est ajouté. Les fonctions locales validées restent utilisables ; aucune collection existante n'est mise derrière un nouveau verrou.

## Proposition concrète de raccordement

Conserver React/Vite et le générateur actuels. Ajouter un projet Supabase dédié (Auth, PostgreSQL avec RLS, stockage privé). La documentation officielle confirme l'intégration Auth/PostgreSQL et les restrictions par ligne :
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security

Prérequis pour poursuivre : un projet backend accessible avec configuration et autorisation de déploiement, les URL de retour de connexion/récupération, et un service d'email fonctionnel. Les secrets administrateur doivent rester dans un gestionnaire de secrets, jamais dans la conversation ni le bundle web. Les coûts/conditions d'un nouveau service sont à choisir par la propriétaire.

## Préparation déjà codée

- `phase12/contracts.ts` : utilisateur distinct des espaces, profil privé distinct du profil Pro public, contrats de records versionnés, favoris Pro, conversations/messages/lecture, origine catalogue. Personnel et Pro indépendant prévus ; Institut/Créateur réservés au modèle.
- `phase12/localMigration.js` : inventaire en lecture seule des données utiles, destination explicite userId/workspaceId/profileId, erreurs bloquant la migration plutôt qu'un effacement silencieux ; ni jetons ni diagnostics/retours ne sont transférés. **Ce module ne vérifie pas une session et n'effectue aucun transfert.** L'appel devra suivre une authentification serveur et une confirmation de destination.
- `phase12/sharing.js` : liste explicite des champs d'une inspiration partageable, identifiants produits remplacés dans la copie, couleurs/disposition/recette conservées ; photos privées, notes, OCR, profil et collection complète exclus. À réutiliser et revalider côté serveur avant publication.
- Tests ciblés sur la préservation locale et l'exclusion des données privées. Ces tests ne valident pas une isolation serveur ni une synchronisation distante.

## Modèle de base à implémenter dans le projet connecté

| Entité | Clé / lien | Visibilité |
|---|---|---|
| Utilisateur | userId issu d'Auth, plan free/plus/pro géré serveur | soi uniquement |
| Espace | workspaceId, ownerId, type | propriétaire uniquement en V1 |
| Profil | profileId, workspaceId | privé |
| Produits / stickers / matériel | workspaceId + recordId | privé |
| Inspirations / journal / tutoriels / préférences | workspaceId + recordId + revision | privé |
| Profil Pro public | proProfileId, workspaceId, slug | seulement champs publiés volontairement |
| Inspiration publique | snapshot séparé et assaini, proProfileId | publiée explicitement |
| Pro favorite | workspaceId, proProfileId | privé |
| Conversation | un espace Plus et un espace Pro distincts | les deux participants |
| Message | conversationId, senderWorkspaceId, clientRequestId unique | les deux participants |
| Lecture | conversationId, workspaceId, dernier message lu | participants, propre état modifiable |
| Photo | chemin privé par workspaceId, références objets | URLs temporaires après contrôle d'accès |
| Nuancier catalogue | marque/gamme/référence, origine vérifiée | lecture publique ; aucune écriture utilisateur |

## Règles serveur indispensables

- Authentifier chaque écriture ; vérifier l'appartenance à l'espace à chaque lecture/écriture et upload. `workspaceId` fourni par le client ne fait jamais autorité.
- Le plan vient d'une table gérée serveur, pas de métadonnées utilisateur modifiables. Aucun paiement dans cette phase ; attribution bêta par administration contrôlée.
- Free conserve Scan & Génère et Inspire-moi. Plus conserve ses données ; Pro ajoute un espace professionnel et peut garder son espace personnel.
- Le partage ne donne aucun accès à la collection ou au journal source. Copier uniquement le snapshot choisi, après prévisualisation et destinataire confirmé.
- Ne publier aucune fiche Pro par défaut. Une recherche publique ne renvoie ni emails ni identifiants de connexion.
- Une conversation ne réunit que ses deux espaces autorisés ; seul le participant peut marquer ses messages comme lus. Limiter les textes, le débit et empêcher les doublons via clientRequestId.
- Synchronisation : révision attendue atomique, conflit explicite, reprises idempotentes, suppressions représentées par tombstones. Aucun écrasement aveugle au login.
- Migration locale : aperçu des quantités, confirmation de destination, upload des photos privées, transaction idempotente, vérification serveur, garder la copie locale jusqu'au succès confirmé. Ne jamais mélanger deux comptes sur le même appareil.
- Sign-out : révoquer/nettoyer la session et isoler les caches par userId/workspaceId. L'échec réseau doit être signalé, pas annoncé comme synchronisé.

## À développer après raccordement

Auth réelle (inscription, connexion, déconnexion, récupération), choix d'espace, adaptation du stockage existant aux opérations asynchrones, import local, nuancier avec sélection multiple, profil Pro publiable, recherche/favoris Pro, partage réciproque, conversation avec statut lu/non lu et indicateur de messages. Notifications push et application installable restent Phase 13.

## Recette Phase 12 avant activation publique

Comptes réels distincts Free/Plus/Pro ; Free scan→génération ; Plus ajout→génération→journal ; Pro nuancier→partage ; Plus reçoit/répond→Pro reçoit. Vérifier logout/login et second navigateur. Tests adversariaux d'accès à un autre espace/message/photo, refus d'auto-promotion de plan, conflits et reprise réseau, migration répétée sans doublons. Tester récupération par email et deep links autorisés.

Ne pas déclarer Phase 12 terminée avant ces essais. Pas de réservation, paiement, agenda, CRM ni portail marque dans ce lot.
