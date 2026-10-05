# Tronc commun — engagement, catalogue partenaire et administration

## Décision et base du 5 octobre 2026

Marie lève explicitement l’attente du chantier Apple : poursuivre le code commun, valider sur Web, propager plus tard Android/iOS. Cette décision remplace la condition Apple de l’audit `docs/pro-partner-admin/audit-et-integration.md`. Aucun fichier StoreKit, Google Billing ou de signature n’est modifié.

Base inspectée : `main` 340c201, enrichie du code Pro V2 (arbre 8de7d41) et de l’audit partenaire (arbre 26e0faf). Branche de travail : `feat/common-engagement`. Aucun retour à une ancienne branche DA06. Les modifications TestFlight de la PR 11 restent dans leur branche séparée. Les vitrines de la PR 13 sont conservées dans cette base, pas encore fusionnées dans `main`.

Les deux briefs sont conservés dans le périmètre. Comme demandé dans le brief Pro (§62), chaque gros lot se termine par une validation. Ce premier lot livre la boucle personnelle visible ; le catalogue/admin n’est pas déclaré réalisé par association.

## Audit de l’engagement et état de ce lot

| Fonction | Avant ce lot | Réutilisation et changement effectif |
|---|---|---|
| Avec ma collection | Présent, à approfondir | `CreateView`, `freeInspiration`, `creationEngine` ; filtre besoins identifiés possédés, 3 couleurs maximum, redécouverte fondée sur les produits du Journal, sortie des habitudes |
| Surprends-moi / Safe Creative Chaos | Présent | Mécanique conservée ; `escapeBubble` module le classement existant. Pas de deuxième jauge |
| Profil créatif | Données et modèle présents, vue peu visible | `personalization`, favoris et Journal ; carte privée « Ton NailMoods », techniques/couleurs observées, forme déclarée, niveau de surprise observé. Pas de questionnaire ni de nouveau profil stocké |
| Préférences permanentes | Présentes | Les options temporaires restent dans `nm-creation-v1`, jamais dans `nm-profile` |
| Mes poses | Présent | Catégories À essayer/En cours/Réalisées conservées ; accès direct aux projets centraux et adaptation depuis une ancienne pose |
| Refaire / variantes | Présent, à approfondir | « À refaire », retrouver l’inspiration et variantes déjà disponibles ; pas de réécriture du Journal. Les variantes supplémentaires « même style, nouvelles couleurs » restent à harmoniser |
| Prochaine pose | Objets existants et accès épars | Bouton « Garder dans mes projets » → `projectFromIdea` → `poseRepository.importLegacy` (idempotent). Aucun deuxième modèle de projet |
| Favoris/double-tap | Déjà présent | `TapFavorite` conservé, bouton visible conservé ; annulation ajoutée au retrait de favori |
| Micro-célébrations | Partiel | Retour de favori existant, notice discrète avec annulation ; généralisation scan/publication et haptique native différées |
| Undo | Absent aux emplacements ciblés | Favori et produit Collection : restauration du seul objet, sans écraser les autres modifications ; erreur explicite en cas de conflit produit |
| Suppression projet | Présente, cascade sensible | Confirmation conservée : rappels, médias et partages liés rendent une annulation naïve dangereuse |
| États vides | Présents | Collection/favoris/Journal existants conservés et testés ; nouveau Profil sans preuves reste honnête, pas de goûts fictifs |
| Adapter à ma collection | Comparaison DIY présente, action manquante | `compareProduct`, `diyChecklist`, `snapshotIdea`, `enrichIdeaRendering` réutilisés. Variante privée avec correspondances explicites ; aucun remplacement arbitraire si une référence manque |
| Cliente → PO | Présent, à approfondir | `ProjectShare`, `ShareToPoSheet`, messagerie et `ProCreationsPanel` restent la base. Boucle de réponse Pro → cliente à terminer dans un lot dédié |
| Style signature Pro | Univers/spécialités/portfolio présents | Vitrines Pro V2 conservées ; déduction automatique depuis contenus publics et affinités à développer |
| Planning visible dans Profil | Planning existant, entrée Profil absente | Carte en premier dans le Bento Profil, deux prochaines échéances, accès complet et projets. Chargement, erreur/réessai, invités, droits et isolation traités |
| Modèle calendrier | Déjà présent | `pose_projects` → `pose_plan_items` → `pose_reminders`, même RLS, mêmes révisions. Vue Mois et types colorés conservés |
| Calendrier natif / .ics | Déjà présent | `calendarExport`, `projectLinks`, notifications réutilisés sans modification native ; tests réels appareils restent requis |
| Récap mensuel | Données partiellement présentes | Journal daté exploitable ; timestamps d’ajout produits historiques pas toujours fiables. Pas de métrique inventée ni nouvelle table de suivi ; récap visuel futur |
| Micro-statistiques Pro | Pipeline consentement présent, attribution incomplète | À compléter avec le lot G catalogue/Pro. Aucun chiffre de démonstration dans les vrais comptes |
| Personnalisation ouverte | Présente | Pause de personnalisation conservée ; sortie de bulle temporaire ; aucun streak ni sanction d’absence |
| Notifications utiles | Planning présent | Aucun rappel de rétention ajouté. Notifications PO restent celles de la messagerie existante |
| Navigation | Présente | Cinq onglets inchangés ; Profil en haut ; aucun sixième onglet |
| DA06 | Présente | Même thème global, tokens, assets, marges, surfaces neutres pour les vraies couleurs |

## Catalogue, Pro et administration : périmètre maintenu

L’audit détaillé Pro/partenaire reste valable, hormis l’attente Apple levée. Ne pas confondre les vitrines déjà développées avec le futur catalogue central.

| Lot partenaire | État réel et prochaine étape |
|---|---|
| A Métiers/organisations/rôles/sièges | Pro V2 réutilise `workspaces`, membres, invitations et droits ; compléter la désactivation de siège si nécessaire, sans doublon de structure |
| B Vitrines | PO/institut/créateur/marque et composants communs présents sur la branche ; propagation de l’approbation produit à tous les lecteurs nécessaire |
| C Catalogue partenaire | À développer : source centrale, propositions et workflow complet, droits médias, revendication sur le même ID, corrections versionnées |
| D Back-office | À développer à partir du staff existant : files, décisions, comparaison, import CSV/XLSX avec aperçu et rollback, audit serveur |
| E Découverte | Recherche vitrines présente ; catalogue central à raccorder au Scan, Collection, création et fiches sans recopier la vérité produit |
| F Partenariats | À préparer : campagnes contextuelles filtrées serveur, sponsorisé uniquement Free, activation Marie séparée. Pas de campagne activée |
| G Statistiques | À développer : agrégats consentis par entité, protection des petits effectifs ; aucune donnée privée aux marques |
| H Native | Propagation et tests appareils ultérieurs, après validation Web |

Ordre suivant proposé après validation de ce lot : C/D (contrat catalogue + administration), E (références centrales), boucle cliente/Pro et signature, F/G (campagnes et mesures), tests Stores. Les fonctionnalités annoncées dans ces lignes ne sont pas encore livrées.

## Données, confidentialité et limites

Aucune migration dans ce premier lot. Aucune donnée bêta modifiée par les tests locaux. Pas d’appel IA payant, pas de SKU, pas de changement d’offre ; IA+ reste fermé.

La nouvelle carte ne lit que les dates autorisées par le repository existant ; elle applique aussi le couple compte/espace à sa projection. Les réponses tardives d’un autre compte sont ignorées. Aucun média ni note du Planning n’entre dans la carte. En échec de chargement, aucune ancienne date n’est présentée comme actuelle.

L’adaptation cherche des références exactes puis une couleur proche de même famille/finition documentée. Elle ne juge jamais une compatibilité chimique. Les techniques incomplètement décomposées restent signalées ; le filtre strict les écarte au lieu d’affirmer « tout est possédé ». « 3 couleurs maximum » porte explicitement sur les vernis colorés, pas sur tout le matériel.

Les anciennes fiches et leurs HEX restent intacts. Les variantes sont privées et utilisent les produits réellement présents. Les analyses personnelles sont calculées à partir des données du compte, non publiées, sans nouvelle collecte analytics. L’utilisateur peut suspendre la personnalisation.

Le filtre redécouverte ne s’active qu’avec des poses réellement renseignées en produits ; absence de preuve d’usage ne signifie pas certitude qu’un vernis n’a jamais été utilisé.

## Validation et rollback

Voir `validation.md` et `evidence/`. Les captures montrent l’application React exécutée, avec données synthétiques identifiées et backend SQL local pour les projets/planning. Elles ne constituent pas un test d’authentification en recette hébergée.

Rollback : revenir au commit parent du lot sur la branche de validation ; aucune migration inverse ni suppression de données n’est nécessaire. Les anciens clients ignorent les nouveaux champs facultatifs de génération. Les projets créés utilisent le schéma existant et restent lisibles après rollback. Une variante enregistrée reste une inspiration standard valide.
