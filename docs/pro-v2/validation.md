# NailMoods Pro V2 — validation de la base commune

Branche : `feat/pro-v2-showcases`, issue de `main` 340c201. La même implémentation React, les mêmes RPC et les mêmes règles s'appliquent au web et aux futures applications Capacitor Apple/Android.

## Parcours disponibles

- Profil → espace professionnel : activité, structure, identité et visibilité de chaque champ.
- Vitrines PO, institut, créateur, marque et formateur via les blocs partagés ProfessionalHero, ProfessionalPortfolio, UniverseBlock, SpecialtiesBlock, TeamBlock, ProductShowcase, CollectionsBlock, PublicationsBlock et SocialLinksBlock.
- Équipe : invitations explicites, acceptation/refus, départ, retrait, rôles, sièges et choix personnel d'apparition publique.
- Portfolio : sélection de ses créations déjà publiques. La visibilité est revérifiée à chaque lecture, y compris après départ, blocage ou passage en privé.
- Produits/collections : création, modification, suppression, HEX fidèle, source obligatoire pour les données techniques, états communautaire/revendiqué/vérifié.
- Découvrir → recherche professionnelle : nom, ID, ville facultative, univers, spécialité, produit. Les contenus éditoriaux publics peuvent apparaître dans « Dans les ateliers » du Fil.
- Collection : ajout proposé seulement pour une référence `catalogId` exacte, attribuée par le staff et réellement présente dans le catalogue distribué. Réutilisation de la fiche de confirmation Collection existante.
- Modération : réutilisation de la file `publication_reviews` pour les photos Pro. Aucune nouvelle photo publique diffusée avant approbation ; remplacer une photo déclenche une nouvelle vérification. Corrections des produits vérifiés mises en attente staff.
- Messagerie, connexion, blocage, signalement et partage PO : contrats existants conservés. Le partage d'un projet reste lancé depuis sa fiche, après connexion autorisée.

## Modèle et migrations

| Modèle | Évolution |
| --- | --- |
| `profiles` | `professional_type` nullable : aucun métier déduit arbitrairement pour un ancien compte |
| `workspaces` | `organization_type` ; IDs et handles conservés ; aucune seconde table d'organisations |
| `workspace_members` | rôles existants conservés : owner → propriétaire, manager → responsable/admin, creator/member → membre |
| `workspace_entitlements` | siège inclus, source future, responsable de facturation ; limites bêta inchangées |
| `private.pro_showcase_details` | extension de présentation, visibilité champ par champ et vérification staff |
| `private.pro_team_visibility` | consentement individuel d'apparition dans l'équipe, supprimé au départ |
| `private.pro_showcase_items` | produits, collections et blocs éditoriaux de vitrine ; liens catalogue réservés au staff |
| `private.pro_portfolio_links` | liens vers Journal/inspirations existants, opt-in explicite et produit réellement utilisé déclaré |
| `private.pro_correction_requests` | propositions de correction, décision staff |
| `private.publication_reviews` | file existante étendue aux couvertures/photos professionnelles |

Migrations nouvelles, appliquées seulement en recette :

1. `20261005123741_pro_v2_showcases.sql`
2. `20261005130218_pro_v2_editorial_review.sql`
3. `20261005130814_pro_v2_legacy_visibility.sql`

Le prérequis existant `20261002155525_apple_ugc_prepublication_review.sql` manquait dans la recette : il y a été appliqué avant Pro V2. Le premier essai de migration Pro V2 a été entièrement annulé par la transaction, sans état partiel.

Les deux espaces professionnels déjà présents en recette ont reçu une extension de présentation, sans perte d'identité. Leur métier reste à confirmer par leur titulaire. Aucun compte Pro, handle, bio, création ou connexion n'a été supprimé. Les champs historiques publics restent compatibles avec les anciennes applications ; les nouveaux champs privés ne sont jamais ajoutés à une projection publique.

## Accès et confidentialité

Les tables nouvelles restent dans `private`, sans droits directs anon/authenticated, avec RLS en refus par défaut. Les RPC publics sont invoker ; les implémentations internes effectuent les contrôles d'identité, de restrictions de compte, de rôle et de droits effectifs.

Les quotas/sièges ne sont pas modifiables par un membre ou par le propriétaire lui-même. Les invitations emploient le verrouillage et la machine d'état existants. Les opérations de sortie restent possibles après expiration. Aucun SKU, achat ou prix actif n'est créé. Le tarif cible 15,99 € + 2 € par siège supplémentaire n'est pas encodé comme une facturation.

Le bucket `nailmoods-pro` est privé. Les URLs signées durent 5 minutes ; leur création respecte propriétaire, visibilité, blocages et modération. Le flux de suppression de compte existant énumère tous les objets Storage possédés, sans restriction de bucket : il couvre donc ces nouvelles images.

IA+ et ses droits sont inchangés et fermés au public.

## Vérifications exécutées

- Suite Node complète : voir `evidence/test-results.txt`.
- SQL PGlite : création, rôles, isolation A/B, Free refusé pour création Pro, sièges pleins, invitation réservée au destinataire, acceptation/départ, champs public/privé/organisation, auto-vérification interdite, sources techniques, URLs sûres, modération des modifications, médias privés puis approuvés, compatibilité avec les anciens lecteurs, références privées retirées des collections publiques.
- Recette réelle : deux comptes existants, requêtes exécutées sous rôle `authenticated` avec leurs identités JWT dans une transaction annulée. Création Pro, refus d'écriture croisée, ville privée et statut de vérification contrôlés. Ce test SQL n'est pas une session de connexion OAuth dans un navigateur.
- Navigateur Chromium : composants de production exécutés contre les RPC SQL PGlite ; modification → sauvegarde → rechargement, recherche d'univers ; 320, 360, 390, 430, 768 et 1024 px, aucun débordement ni erreur JavaScript.
- Captures des quatre moods avec les mêmes données de démonstration. Les captures ne représentent pas de vraies professionnelles et ne sont pas des photos générées.
- Build Vite de validation réussi. Avertissement de taille de bundle existant à surveiller ; pas d'échec de compilation.
- Conseiller Supabase : les tables privées sans policies sont volontairement fermées. Les avertissements de recette sur des RPC historiques et la protection contre les mots de passe compromis restent hors de ce lot. Le RPC de modération touché par ce lot a été déplacé derrière un wrapper invoker.

## À vérifier avec Marie avant diffusion mobile

1. Se connecter à la **recette**, puis Profil → Mon espace professionnel. Les comptes de production ne sont pas copiés dans la recette.
2. Choisir un métier sur l'ancien profil, publier seulement les champs souhaités.
3. Ouvrir sa vitrine depuis l'éditeur, puis la retrouver dans Fil → Personnes → Les univers professionnels.
4. Tester une invitation avec un second compte de recette lorsque des sièges manuels sont disponibles.
5. Tester les uploads personnels et leur validation staff.
6. Vérifier sur iPhone/Android réels : clavier, galerie, partage externe, retour système et zone basse. Les largeurs navigateur ne remplacent pas ces tests natifs.

## Limites explicites de cette validation

- Une photo par fiche produit dans cette première interface ; les variantes, dimensions et motifs sont des champs textuels.
- Pas de réservation, marketplace, stock, paiement, publicité sponsorisée, défis publics ou IA+.
- Pas de vérification automatique d'un fabricant : staff humain, référence catalogue exacte et source documentée.
- L'ajout à la Collection ouvre la confirmation existante ; il ne sauvegarde pas silencieusement un produit.
- Les nouvelles publications éditoriales de vitrine n'ont pas de nouveaux compteurs fictifs ni de nouveau moteur social : elles renvoient à la vitrine et à ses relations existantes.
- Publication web de validation séparée sous `/NailMoods/validation-pro-v2/`, avec la recette ; le workflow reconstruit `main` à la racine pour conserver l'application stable. Un futur déploiement standard de `main` peut retirer ce chemin temporaire.
- Ni AAB, ni IPA, ni fusion automatique vers `main` dans ce lot.

## Rollback

Désactiver `VITE_PRO_V2_ENABLED`, reconstruire et republier le client. Les composants historiques restent disponibles. Relancer le déploiement habituel de `main` enlève le chemin web de validation. Conserver les migrations additives et les données Pro V2 : les supprimer n'est ni nécessaire ni souhaitable pour revenir à l'ancienne UI.

Les protections de visibilité ajoutées aux anciens lecteurs restent actives et les données privées ne sont pas republiées pendant un rollback. Toute suppression SQL définitive exige d'abord un export des nouvelles données et une validation séparée.
