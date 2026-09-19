# NailMoods — Spécification UX bêta 12B

Référence de reprise pour Work. Le cœur produit reste collection + inspiration + journal, avec liens Pro ↔ Plus simples.

## Navigation bêta
Accueil · Collection · Créer · Inspirations · Journal · Messages · Profil.

## Profil
- Avatar, nom affiché, @NailMoodsID.
- Offre affichée : Free / Plus / Pro.
- Confidentialité, notifications, comptes bloqués, export, suppression.
- « Voir mon profil comme les autres » pour profils publics.
- Un profil personnel Plus est privé par défaut, recherche limitée selon visibilité.

## NailMoods ID
- Format public : @handle.
- UUID Supabase reste l’identifiant technique.
- Suggestion après inscription, vérification disponibilité, modification possible.
- Changer le handle ne casse jamais favoris, follows, workspaces ou conversations.

## Mon offre
### Free
- Scan & Génère.
- Génération simple.
- Publicité possible plus tard, jamais obligatoire pour utiliser le cœur produit.

### Plus
- Sans publicité.
- Collection synchronisée.
- Inspirations sauvegardées, journal, favoris.
- Recherche et interaction avec profils Pro.

### Pro
- Sans publicité.
- Espace Pro.
- Profil public.
- Nuancier Pro.
- Partage d’inspirations et messagerie.

Aucun paiement réel en 12B. Paiement = 12C.

## Choix Pro
### PO indépendante
Un workspace Pro, propriétaire unique, profil public, collection Pro.

### Institut
Workspace partagé. Parcours obligatoire :
1. créer l’Institut ;
2. choisir capacité indicative ;
3. inviter un compte NailMoods ;
4. accepter/refuser ;
5. retirer un membre ;
6. membre quitte ;
7. propriétaire doit transférer la propriété avant de quitter.

Pas de RH, planning, paie, CRM ni rendez-vous.

### Créateur / Marque
Même socle workspace public, profil catalogue. Distinguer visuellement Créateur et Marque. Badge vérifié uniquement serveur/admin.

## Profil Pro public
Afficher uniquement :
- avatar/logo ;
- nom ;
- @handle ;
- type de profil ;
- ville/zone si volontaire ;
- bio ;
- styles ;
- inspirations publiques ;
- Suivre / Favori / Message.

Jamais email, UUID, collection privée, journal ou messages.

## Recherche
Champ : « Nom ou @NailMoodsID ».
Priorité :
1. handle exact ;
2. préfixe handle ;
3. nom exact ;
4. nom partiel.
Filtres simples : PO / Institut / Créateur / Marque / ville.
Respect absolu des règles de visibilité.

## Messagerie
### Boîte de réception
Avatar · nom · @ID · dernier message · date · badge non lu.

### Demande de message
Premier contact inconnu :
- Accepter
- Refuser
Aucun message actif tant que la demande n’est pas acceptée.

### Conversation
- texte ;
- carte Inspiration NailMoods ;
- profil accessible depuis le header ;
- lu/non lu via last_read_at.
Pas d’appel, vocal, groupe, réservation, devis ni paiement.

### Inspiration jointe
Carte avec miniature, titre, couleurs, Voir, Sauvegarder, Adapter à ma collection.

### Institut
La conversation peut représenter l’Institut. Une réponse peut afficher « Marie · Institut Cassis » sans changer l’identité publique du fil.

## Blocage et signalement
Bloquer / Débloquer.
Signaler : spam, comportement inapproprié, faux profil, autre.
Un blocage empêche les nouveaux messages.

## Notifications internes bêta
- nouveau message ;
- demande de message ;
- inspiration reçue ;
- invitation Institut ;
- invitation acceptée.
Push mobile seulement en Phase 13.

## Confidentialité
18+ pour bêta/V1.
CGU et politique consultables avant création du compte.
Consentements facultatifs séparés.
Free fonctionne après refus.
Plus/Pro sans publicité.
Aucun contenu privé utilisé pour ciblage.

## Suppression de compte
- profil et handle supprimés ;
- avatar/bio retirés ;
- fichiers privés supprimés selon Storage ;
- messages déjà reçus conservés chez les autres seulement pour cohérence du fil ;
- auteur affiché « Compte supprimé » ;
- aucun lien vers l’ancien profil.

## Storage à prévoir avant Phase 13
Buckets privés par défaut :
- avatars ;
- journal-photos ;
- inspiration-media ;
- sticker-images.
Compression mobile avant upload.
Aucune photo de journal avec URL publique.

## États vides indispensables
Messages : « Aucun message pour le moment. »
Recherche : « Aucun profil trouvé. »
Institut : « Aucun membre invité. »
Notifications : « Rien de nouveau. »
Profil public incomplet : proposer de compléter sans bloquer.

## Règle générale
Ne jamais mélanger :
- utilisateur ;
- abonnement ;
- workspace ;
- profil public.
