# Étagère — affinage de la planche validée par Marie

## Corrections

- La grande tuile « Ma collection » est remplacée par un titre compact et le nombre réel de fiches. Le switch arrive immédiatement. Les filtres existants restent accessibles dans une fenêtre dédiée.
- Marges latérales de 20 px (16 px sur les très petits écrans), rangées continues de cinq flacons, références courtes ou noms tronqués, nom complet au toucher. Une teinte seule ne crée plus une grande niche presque vide.
- Nouveau SVG partagé : pigment suivant l’intérieur arrondi, ménisque, reflets courbes, base de verre et bouchon simplifiés. Suppression du cœur décoratif et du rectangle de couleur détaché. Crème, Jelly, Chrome, Glitter, Cat Eye et nacré conservés.
- Le même composant habille Collection, cartes PO, profil Pro et focus ; les quatre moods gardent leurs tokens et leurs couleurs produit. Décor botanique discret, tablettes avec bord arrondi et ombre légère.
- Bandeau de pose en cours plus compact dans Collection, sans supprimer son accès.

## Cause des teintes invisibles

Le premier `shelfColor` refusait toute couleur enregistrée avec `colorSource=palette`, même quand le produit possédait un HEX stocké et visible dans la vue photos. Cette garde créait les flacons vides.

Le rendu utilise désormais la couleur catalogue validée, puis la couleur confirmée/mesurée, puis le HEX déjà enregistré. La nuance de famille est explicitement marquée « Teinte indicative » dans le focus. Aucune couleur n’est inventée à partir du nom et aucun produit n’est réécrit. Une vraie absence de couleur reste une absence.

Le fichier fourni `NailMoods_V2_Fusion_V1_V2_auditee_2026-10-01.xlsx`, onglet « Catalogue fusionné », confirme notamment un HEX officiel vide pour Chantilly et Lucky Red. Ces références ne sont donc pas présentées comme disposant d’une couleur catalogue exacte.

## Migration

`20261006083712_shelf_recorded_shades.sql` remplace uniquement la projection privée `private.shelf_product`, avec la même priorité des couleurs et la distinction palette/teinte précise. Aucun droit élargi, aucune table ajoutée, aucune donnée modifiée. Les règles de consentement, propriété, profil public, blocage et modération restent inchangées.

Validation locale PostgreSQL/PGlite puis recette et production. Contrôle des empreintes avant/après sur les produits, poses, profils et réglages de confidentialité.

## Vérifications

- 549 tests : 547 réussis, 2 ignorés préexistants, aucun échec.
- 24 contrôles navigateur sur le vrai App et les RPC PGlite ; aucun défaut JavaScript.
- Quatre moods ; largeurs 320, 360, 390, 430, 768 et 1024 px ; marges présentes et cinq cibles d’au moins 44 px dans chaque rangée.
- Fiche, favoris, création, tris, filtres déplacés, photos, teinte absente, teinte indicative, animation aller/retour, réduction des animations, liens Pro/produit/poses/produits et visibilité enregistrée.
- Collections vide, 16 produits et 1 000 produits (40 puis 80 rendus progressivement). Premier affichage mesuré dans le banc de test : 892 ms ; ce chiffre ne mesure pas un téléphone physique.
- Captures : données synthétiques du banc de validation, jamais insérées en production.
- Build production réussi. Aucun changement de dépendance, workflow Android, AAB, iOS ou TestFlight.
