# NailMoods — préparation UX du 11 octobre 2026

**État : brouillon de code, aucune fusion ni mise en production.** Marie poursuit sa recette et peut compléter cette liste. Aucun build mobile, aucune modification des accès IA ou des données de production.

## Préparé dans cette branche

- Créer : Photos d’inspiration remonté à côté de NailMoods AI ; Dessin sur ongles devient une tuile PRO normale ; libellés secondaires raccourcis ; calendrier et accès Prototype des rendus retirés de cet écran. Mes poses reste une destination existante.
- Accueil : tuile Mon calendrier vers le module existant, sous son drapeau actuel. Le bouton de retour revient à l’Accueil lorsque l’entrée vient de cette tuile. Les entrées Profil et Projet conservent leur retour actuel.
- Fil : invitation / message à côté de l’ID dans la carte ; sauvegarde, partage et signalement regroupés en pictogrammes dans la publication ouverte. Le détail des tags se déplie à la demande. Invitation masquée pour son propre ID dès que l’identité est connue ; contrôle serveur conservé.
- Collection : cadre botanique fin avec deux coins floraux SVG, couleurs issues de la DA actuelle. Suppression du contour raster étiré avec `border-image`, cause visible de la déformation des branches. Flacons, teintes, données et étagères conservés.
- Accessibilité : noms accessibles et infobulles pour les pictogrammes, zone tactile de 44 px minimum, focus clavier et état enregistré.

## Passe sur les principaux parcours

| Zone inspectée | Constat / prochaine simplification | Décision pour ce brouillon |
| --- | --- | --- |
| Accueil | Plusieurs destinations utiles, mais les raccourcis doivent rester compréhensibles. | Calendrier visible, même module, pas de nouvelle source de données. |
| Créer | Barre spéciale Dessin, raccourcis du bas, Prototype et calendrier dispersent les actions. | Une grille cohérente, illustrations par fonction, intitulés courts. |
| Fil / publication | Quatre grands boutons et des catégories de tags prennent la majorité de la fenêtre. | Rangée de pictogrammes + détails repliés, ID cliquable. |
| Collection | Filtres déjà compacts et quatre modes existants ; cadre raster déformé. | Conserver les contrôles, simplifier le cadre. |
| Idée / recette | Actions Enregistrer, garder en projet et partager peuvent se répéter. | Préparer ensuite un regroupement ; garder un intitulé pour l’action principale et les changements de visibilité. |
| NailMoods AI | Forme, longueur, difficulté, collection et consentement servent à une vraie décision. | Conserver les champs utiles ; ne pas transformer consentement ou coût en pictogramme ambigu. |
| Mes poses / Livre | Déplacement, double tap et édition sont des gestes spécifiques. | Préserver gestes, contenus et raccourcis ; aide à la demande plutôt que rappels permanents. |
| Tutoriel | Préparation, progression, minuteur et état de pause ont une utilité opérationnelle. | Conserver la lisibilité des étapes et des états ; simplifier les explications répétées lors d’une prochaine passe. |
| Profil / offre | Identité, permissions et abonnements ont des conséquences distinctes. | Garder les libellés explicites pour achat, publication, blocage et suppression. |
| Messagerie / connexions | Les états envoyé, reçu et accepté ne doivent pas se confondre. | Pictogramme évolutif invitation / attente / message, infobulle correspondante. |
| Salon / modération | Validation, attribution et droits d’équipe doivent rester visibles. | Pas de masquage des informations qui déterminent les droits ou la publication. |

## Vérification réalisée

- Build Web réussi ; 629 tests existants réussis, 2 ignorés ; 2 tests supplémentaires pour la reconnaissance de son propre ID réussis. Aucun appel OpenAI.
- Recette navigateur des quatre DA : nouvelle grille, retour du calendrier, coins floraux, actions compactes, ID propre sans invitation, détails repliables, noms accessibles et cibles tactiles.
- Recette navigateur réussie : https://github.com/MowayMCR/NailMoods/actions/runs/38120248727 ; captures Créer, publication et cadre dans les quatre DA contrôlées visuellement. Les contrôles existants des fenêtres IA sur petits écrans et tablette restent réussis.
- Captures de préparation dans les artefacts CI de la PR ; aucune publication en Production.

## À valider avec Marie

Ordre final des tuiles ; aspect du nouveau cadre ; reconnaissance des pictogrammes ; autres écrans signalés pendant sa recette. Cette préparation ne clôture pas la validation artistique du moteur IA.
