# NailMoods — audit préalable DA 06

Base : 9ff7aa8, branches Android et iOS identiques au début du chantier. Branche de travail isolée : feat/da06-moods-ux. Aucun asset supprimé. Inventaire et empreintes avant changement : assets-before.json.

## Architecture et écrans
React/Vite partagé, enveloppes Capacitor Android/iOS. main.jsx pilote les routes par hash et conserve Collection et ses formulaires. HomeView, CreateView, ScanGenerate, JournalView, TutorialView, ProfileView ; écrans secondaires inspirations/favoris/projets, matériel, produit, compte/offre, confidentialité, social/messagerie, Pro, support/staff. Les fonctions de création, scan, import photo/URL/catalogue, recettes, variantes, journal, publication et abonnements sont existantes et doivent être conservées.

Navigation initiale : Accueil / Créer / Collection / Mes poses / Profil ; Fil en fenêtre depuis le header. Cible : Fil intégré, Profil en haut.

## Identité, assets et composants
Logo principal nailmoods-official.png, symbole nailmoods-symbol.png, icône nailmoods-icon.png et SVG historique conservés. MoodGlyph + iconRegistry + iconAtlas utilisent les trois planches validées public/icons/nailmoods-{styles,techniques,effects-themes}.png. Aucun remplacement autorisé. Les assets de finitions réalistes et le mockup main restent intacts. Les fichiers sans référence textuelle détectée restent conservés : références dynamiques possibles.

Composants réutilisés : Sheet (dialogs), MoodGlyph, ProfileNail, NailPreview, ScanBottles, ProductPhoto, ContentImage, AccountAvatar, ProfileIdentity, IdentityPanel, CollectionFilters, EquipmentLibrary, NotificationButton, ContextHelp, SupportPanel, PublicationReview. La taxonomie TAGS reste la source des univers.

## Styles
CSS en cascade, huit thèmes historiques à quatre couleurs seulement, nombreux fonds blancs et textes fixes. Serif Georgia et sans Inter/system-ui. Nécessité de tokens sémantiques centralisés, migration des couleurs d'interface, protection des rendus produits et finitions. Les choix historiques seront reconnus sans supprimer les univers.

## Profil, Auth, confidentialité
nm-profile est la vue locale des preferences.nailmoodsProfile du profil distant ; shape, length, level, duration, technique, styles et compétences déjà présents. display_name et username proviennent du profil existant. Ne pas créer une seconde table de préférences.

Auth Supabase PKCE ; liens com.nailmoods.app://auth/callback (recette séparée) déclarés côté natif. Callback existant échange uniquement code ; état de session restauré avant chargement du workspace. Manquent onboarding explicite et gestion des variantes de callback. Les jetons ne doivent jamais figurer dans les logs.

Profil public fourni par get_public_profile avec garde serveur ; ne jamais lire le profil privé d'autrui. Les préférences privées ne deviennent pas publiques automatiquement. Toute extension nécessite opt-in et projection serveur limitée.

## Référence de validation
Suite npm test exécutée avant modification, résultats dans baseline-tests.txt. Aucun test réel d'e-mail, appareil natif, paiement ou production n'est assimilable à une simulation navigateur. Les futurs résultats distingueront ces niveaux.

## Lots
1. Tokens / moteur / adaptation CSS / navigation / splash.
2. Onboarding / profil / accueil Bento / Fil intégré / guide.
3. Auth, confidentialité, tests et captures quatre moods.
Chaque lot est commité séparément pour permettre un retour arrière.
