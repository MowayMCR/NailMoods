# NailMoods — livre de poses et revue Web

Livraison du 8 octobre 2026 depuis le tronc commun `112c7cf529b618bad063b30e1efd70aa217ec425`. Les corrections de composition des fleurs dans les vases sont conservées. La branche de sécurité/abonnements reste une livraison distincte.

## Parcours livré

- Mes poses → Réalisées → Livre : couverture illustrée puis livre ouvert. Galerie permet de conserver la vue précédente sans doubler les contenus.
- Profils Plus et Pro : livre des seules poses déjà publiques et autorisées dans la projection actuelle. Les portfolios collectifs restent soumis au consentement existant.
- Glissement horizontal au doigt, clavier gauche/droite et curseur de page accessible. Pas de boutons fléchés. Le défilement vertical reste utilisable.
- Recherche par titre et tags, filtre par tag, poses mises à la une en premier. Le double tap ne déclenche pas l’ouverture de la fiche.
- Dans un livre public, le cœur utilise les mêmes enregistrements que le Fil. Le nombre reçu est visible dans le livre de la propriétaire ; aucune liste des personnes ni notification nominative nouvelle n’est publiée.
- Dans son livre personnel, le double tap conserve la fonction « À refaire ». La mise à la une exige une pose déjà publique, synchronisée et possédée par le compte, avec une offre Plus/Pro. Elle ne change jamais sa visibilité.
- Un toucher ouvre la fiche. Les notes personnelles ne sont pas ajoutées à la projection publique.

## Vérification

Suite locale : 570 tests, 568 réussis, 2 tests live historiques ignorés, aucune erreur. Les tests ciblés du livre passent : tags/accents, ordre des pages, gestes, autorisation propriétaire, refus du privé, isolation des compteurs, accès Plus/Pro, favori idempotent, confidentialité et accès anonyme refusé.

[Résultats navigateur](evidence/browser-results.json) : téléphone 390×844 et tablette 820×1180, gestes tactiles via Chromium/CDP, double tap, filtres, reprise après rechargement, confidentialité du journal, interactions du livre public avec serveur simulé et cinq écrans principaux sans erreur JavaScript. Les données et créations de ces essais sont des fixtures locales. Ce ne sont pas des achats ni des essais sur appareil physique.

Les tests existants du bureau passent en 390 et 1024 pixels : glissement tactile, fleurs insérées, déplacement groupé, rechargement, changement de vase, interruption, corbeille et annulation. Build Web compilé. Les paquets initiaux restent volumineux ; une réduction du chargement est une amélioration future, pas une erreur de compilation.

SQL testé avec PGlite, appliqué d’abord en recette, puis en production. Contrôles en lecture seule sur les deux projets : lecture des compteurs de son livre possible ; accès anonyme à la RPC refusé. Le profil public est autorisé par la projection existante, pas par un contrôle local. Les flags de sessions et d’achats n’ont pas été modifiés. Les tables privées n’ont aucune autorisation directe pour les clientes. Le contrôle de session complémentaire est appelé lorsque la fonction de sécurité existe.

## Tour général et éléments à finaliser

| Sujet | État / suite |
|---|---|
| Livre / Journal | Couverture, pages, gestes, tags, favoris, appréciations et mise à la une livrés. Ancienne galerie conservée. |
| Bureau / collection | Dernières corrections conservées et tests tactiles réussis. |
| Accueil, Fil, Créer, Collection, Mes poses | Contrôle mobile/tablette sans erreur JavaScript ou débordement horizontal. Ne constitue pas un audit exhaustif de toutes les fonctionnalités connectées. |
| Abonnements, sessions uniques, instituts | Livraison #33 indépendante, avec activation production et tests appareils/Sandbox encore nécessaires. Aucun tarif, achat ou droit modifié par ce chantier. |
| Android et iOS | Code commun du livre prêt à intégrer dans la prochaine version validée. Aucun build envoyé aux stores pendant cette mise à jour Web. |
| Scan physique / achats natifs | À revalider sur appareils ; ce tour Web ne les déclare pas finalisés. |
| Performance | Le bundle principal reste volumineux. Le livre ajoute environ 400 Ko d’illustrations WebP ; elles sont chargées au moment de l’affichage. |

## Graphismes et retour arrière

Deux illustrations générées avec le générateur intégré, puis optimisées en WebP :
- `public/atelier/pose-book-v1/cover.webp` : couverture rose, reliure cassis, branches florales dessinées, centre sans texte pour le titre dynamique.
- `public/atelier/pose-book-v1/open.webp` : double page ivoire dessinée, reliure rose/cassis, centre sans texte ni photos, coins botaniques ; photos et contrôles restent de vrais éléments d’interface.

Référence de style : vase rose existant du bureau. Prompt couverture : « closed blush pink photo album, hand-drawn dark rose contours, soft painted blush highlights, cassis spine, delicate rose/cassis flower sprigs, blank center, no text, isolated transparent background ». Prompt pages : « matching open photo album, top down, blank ivory pages, painted crease, cassis binding, blush edges, tiny floral corners outside content, no text/photos, transparent background ».

Retour arrière : revenir au commit Web précédent. Conserver la table de mise en avant et les enregistrements existants ; ne pas supprimer les journaux ou favoris. La nouvelle RPC est additive et ne remplace aucune fonction de droits, de publication, de paiement ou d’équipe.


## Planche Polaroid validée (8 octobre 2026)

La photo est centrée dans un petit cadre Polaroid illustré, avec son titre sur la marge de papier. La date est manuscrite et française. Les actions sont regroupées sous le livre ; sur tablette, chaque colonne correspond à la page au-dessus. Les titres, photos et contrôles restent dynamiques, sans intégrer une capture dans l’interface.

- Cadre `public/atelier/pose-book-v1/polaroid.webp`, génération intégrée : papier ivoire peint, contour irrégulier au crayon, ruban rose unique, ouverture centrale et extérieur transparents, aucun texte ni photo.
- Police Caveat embarquée et limitée aux caractères latins usuels, source officielle Google Fonts ; licence SIL Open Font License conservée dans `src/poseBook/fonts/OFL.txt`.
- Vérifications navigateur aux largeurs 390 et 820 : cadre chargé, police manuscrite, actions hors du livre, swipe, double tap, filtres, persistance et poses privées préservées.
