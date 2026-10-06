# Collection illustrée — audit de la base 2a165f8

- Collection : `src/main.jsx`, `collection.js`, `CollectionFilters.jsx`. Catalogue et inventaire existants conservés. `nm-collection-v2` est synchronisé vers `user_products`, `user_stickers`, `user_equipment` via `cloud/mapping.js`.
- Fiche produit : éditeur existant dans `main.jsx`, photos conservées dans `metadata.nailmoods`. Favori : propriété `fav` existante. Aucun nouvel inventaire, import, moteur de scan ou catalogue.
- Usage réel : `journal_entries.snapshot.products`, date `performed_on`, `journal.js`. Une pose compte une seule fois ; idées, brouillons, générations et tutoriels non journalisés ne comptent pas.
- Couleur : `preciseShade`, `catalogColor`, `confirmedColor`, `shade`, `color`. Une teinte inconnue n’est pas remplacée par un rose décoratif. Les couleurs des produits sont indépendantes des thèmes.
- Tris existants : récent, nom, marque ; recherche et filtres type/catégorie/marque/famille/finition/favoris réutilisés.
- Profils : `identity/PublicProfile.jsx`, `professional/Showcase.jsx`, `private.pro_v2_public`. Respect des profils masqués, blocages, droits, portfolios opt-in et modération des images.
- Manques : rendu étagère/focus, classement chromatique, compteurs dérivés, consentement de visibilité d’étagère, projection publique minimale, liens bidirectionnels produits/poses.
- Ajouts : composants `src/shelf`, une table de réglages privée (aucun produit copié), RPC contrôlés, index pour poses publiques. Mode initial masqué, choix explicite d’un espace appartenant à la PO. Statistiques publiques limitées aux poses de la PO présentes dans son profil public, approuvées et liées aux produits de cet espace.
- DA : même composant SVG et mêmes interactions pour Soft Glam, Dark Feminine, Cottagecore et Pop Pastel ; tokens CSS spécifiques au thème existant.
- Périmètre : Web/tronc commun. Aucun build AAB/IPA et aucune modification de workflow mobile.
