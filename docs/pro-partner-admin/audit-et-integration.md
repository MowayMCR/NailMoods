# Extension Pro, catalogue partenaire et administration

Audit du 5 octobre 2026, après lecture du nouveau cahier des charges « Markdown collé(2).md ». Document de préparation uniquement : aucune fonctionnalité nouvelle ni migration appliquée par ce lot.

> **Actualisation du 5 octobre, instruction Marie :** l’attente Apple est levée. Continuer le tronc commun sur une branche dédiée avec validation Web ; les adaptations Stores seront propagées ultérieurement. L’état historique ci-dessous reste une trace d’audit, pas un blocage actuel. Voir `../common-engagement/audit-et-lots.md`.

## Condition préalable Apple

Le cahier des charges impose de vérifier la fin du chantier Apple avant développement. Au contrôle GitHub :

| Base | État constaté |
| --- | --- |
| `main` | `340c201f404b5577c6d307b6cec412235ddec07a` |
| Pro V2 | `feat/pro-v2-showcases`, `7a8618ce0a2945be96c92367b3cc3f1fa1441aed`, PR 13 en brouillon, validation web publiée en recette |
| Android | `feat/google-play-billing-beta6`, `1418e47905436bcf9cd072d4105fa4eaaf873883` |
| Intégration Apple | `feat/apple-storekit-ios`, même base mobile `1418e479...` |
| Chantier TestFlight | `feat/ios-testflight-beta1`, `e0a8d23d6d10be0516b741c283f5535a58056df6`, PR 11 ouverte en brouillon |

La PR Apple rapporte des tests partagés et natifs réussis et une archive non signée. Elle indique encore l'absence d'IPA signée et d'envoi TestFlight, ainsi que des validations propriétaire/appareils/Sandbox restantes. Ces informations proviennent du compte rendu de cette PR, pas de nouveaux tests exécutés ici. Sa clôture n'est donc pas confirmée. Ne pas fusionner ou modifier ses fichiers pour satisfaire artificiellement cette condition.

Les fichiers Apple à préserver comprennent `ios/`, `vite.mobile.config.js`, les scripts de build/version mobile, `src/platform/native.css`, `src/lifestyle/LifestyleProfile.jsx`, `src/aiPlus/InternalLab.jsx` et les tests iOS. Après clôture, relire les SHA et changements effectifs, conserver les correctifs communs approuvés, puis créer une branche d'intégration propre. Ne pas repartir d'une ancienne branche DA06.

## Ce qui existe et ce qui manque

| Sujet | Existant réutilisable | Écart à traiter |
| --- | --- | --- |
| Métier, structure, rôles, sièges | Pro V2 étend `profiles`, `workspaces`, membres, invitations et droits effectifs | Confirmer migration des anciens profils ; compléter la désactivation d'un siège distincte d'un départ, si nécessaire |
| Vitrines | Blocs communs DA06, univers existants, portfolio autorisé, équipe opt-in, produits/collections/contenus | Réviser les fiches produit autour d'un ID catalogue central et les actions sociales accessibles |
| Produits Pro | `private.pro_showcase_items`, références catalogue facultatives, correction des produits vérifiés | Ce sont actuellement des présentations de vitrine, pas le workflow complet de soumission catalogue |
| Publication | Photos soumises à pré-modération ; droits des champs et projections publiques | Le nouveau contrat exige aussi l'approbation du produit entier, y compris sans photo, avant toute diffusion |
| Catalogue | `src/catalog.js` charge les JSON V2 + compléments, dédoublonnés par `catalogId` | Ce catalogue distribué n'est pas administrable en direct ; établir une source centrale versionnée |
| Collection | `provenance.catalogId`, détection des doublons, couleurs personnelles préservées | Aujourd'hui les champs sont copiés à l'import ; évoluer vers référence centrale et attributs personnels séparés, avec compatibilité hors ligne |
| Administration | `StaffJournal`, `PublicationReview`, `ProModeration`, contrôle serveur staff | Créer les vues de travail catalogue/professionnels/partenaires et l'historique complet des décisions |
| Vérification | Décisions staff et relation produit, pas d'auto-attribution | Ajouter dossier, preuves, motifs, états pending/rejected/suspended, revendication sans doublon |
| Statistiques | Pipeline avec consentement client et contrôle serveur, catalogue d'événements | Événements Pro actuels trop généraux pour attribuer une vue à une vitrine ; prévoir agrégats par entité publique, sans données visiteuse accessibles aux marques |
| Campagnes | Champ futur organic/sponsored, aucune diffusion sponsorisée active | Modèle contextuel, séparation editorial/sponsored, filtrage Free côté serveur, activation réservée au staff |
| Imports | Scripts d'import catalogue CSV/Excel hors application | Import admin avec aperçu, erreurs, rapprochement, journal de lot et annulation contrôlée |

## Décisions de compatibilité

1. Garder les espaces existants comme organisations. Aucun second système d'équipes, de messagerie ou de droits.
2. IA+ demeure indépendant de Free/Plus/Pro et fermé au public. Les mentions de futures offres AI ne créent pas de nouveaux droits exclusifs ou de SKU dans ce lot.
3. Conserver tous les `catalogId` connus. Un produit communautaire revendiqué garde son identité ; un alias ne doit pas devenir une seconde référence.
4. Les HEX produit, les choix personnels de couleur et les instantanés historiques de poses ne changent pas avec les moods ou une correction catalogue.
5. Le nouveau workflow doit empêcher la diffusion de produits non approuvés par les anciens RPC comme par les nouveaux. Ne pas simplement cacher un bouton du client.
6. Réutiliser les dossiers de correction Pro V2 plutôt que créer un système concurrent. Étendre leur cible à la référence centrale et conserver ancienne/nouvelle valeur, source, justification, décision et révision examinée.

## Modèle proposé, à confirmer par inventaire DB après Apple

Les noms suivants sont des propositions, pas des tables créées.

- **Produit central** : ID stable, contenu validé, version, statut de publication, source nailmoods/community/creator/brand, vérification séparée. Une vue publique étroite n'expose que les versions approuvées et actives. Les snapshots JSON embarqués deviennent un cache versionné de cette source, sans édition parallèle.
- **Soumission** : propriétaire professionnel, auteur, contenu proposé, preuves et URLs, version, déclaration explicite de droits sur images/informations, date d'attestation, état draft/submitted/under_review/changes_requested/approved/rejected/archived. Les brouillons restent privés.
- **Sources techniques** : provenance par information, état documented/brand_provided/nailmoods_verified/insufficient_information, source et date. Aucune conversion automatique d'une déclaration fabricant en vérification NailMoods.
- **Revendication** : produit central existant, professionnel demandeur, preuves, décision staff, conservation du même ID. Vérification d'identité professionnelle et vérification du produit sont deux décisions différentes.
- **Correction** : extension des demandes existantes, version de départ et conflit explicite si le produit a évolué. Une marque ne remplace jamais directement une version approuvée.
- **Collection personnelle** : référence centrale + quantité/favori/notes/couleur choisie et autres attributs personnels ; cache local pour fonctionnement hors ligne. Lire encore les anciennes fiches copiées et migrer progressivement sans modifier les recettes réalisées.
- **Import admin** : lot, lignes en staging, mapping colonnes, erreurs, doublons, créations/mises à jour proposées, décisions et révisions produites. Annulation par opérations compensatrices ; refuser l'annulation automatique si une modification ultérieure serait écrasée.
- **Journal admin** : auteur staff, action, entité, avant/après, justification, horodatage, transaction. Écriture serveur avec la décision ; aucun droit d'altération pour les professionnels. Prévoir rétention et suppression de compte sans conserver des données privées inutiles.
- **Campagne** : partenaire, produits centraux éligibles, critères contextuels, période, plateformes, promotion_type organic/editorial/sponsored et états demandés. Activation staff ; aucune facturation ou enchère. Le ciblage ne contient aucun identifiant de visiteuse.
- **Agrégats** : mesure consentie, par jour/entité/campagne, accessible au propriétaire sur son seul périmètre. Aucun export d'identité, messages ou événement individuel ; protéger les petits effectifs et ne pas afficher de chiffres fictifs.

## RLS et droits serveur

L'exigence nouvelle demande des politiques RLS explicites. Les extensions privées Pro V2 étaient protégées par absence de grants, RLS fermée par défaut et RPC contrôlés. Le futur lot devra documenter et tester les policies pour chaque opération, sans ouvrir ces tables pour faire disparaître un avertissement.

Les soumissions/corrections sont visibles uniquement par leurs ayants droit et le staff ; seuls les professionnels autorisés peuvent soumettre. L'approbation, la vérification et l'activation des campagnes sont réservées au staff côté serveur. Les projections catalogue approuvées ne contiennent ni contact privé ni dossier de vérification. La validation ne repose jamais sur `user_metadata` ou un simple `isAdmin` client.

Les campagnes sponsorisées doivent être absentes des résultats Plus/Pro, en tenant compte des droits manuels bêta, Apple et Google. En cas d'état de droits inconnu, ne pas servir de placement sponsorisé. Un placement doit passer les filtres de pertinence ordinaires ; aucune proximité couleur n'est une compatibilité chimique. Les publications organiques des marques restent distinctes des annonces.

## Lots après levée de la condition Apple

| Lot | Travail et limite de validation |
| --- | --- |
| A | Réconcilier les branches approuvées ; conserver métier/structure/sièges ; préciser RLS, identité catalogue et migration ascendante. Tests de droits et anciens comptes en recette. |
| B | Ajuster les vitrines existantes, leurs liens catalogue et états d'attente ; captures des 4 moods, téléphone et tablette. Pas de réécriture de l'identité. |
| C | Source centrale, soumissions, droits médias, revendications, corrections. Vérifier qu'un produit sans photo ne contourne pas la validation. |
| D | Enrichir le staff : files à traiter, comparaison/doublons, décisions, vérification/suspension, audit ; import CSV/XLSX avec aperçu et rollback. |
| E | Recherche : consommer uniquement produits/profils autorisés ; vérifier Scan, Collection, génération, Projet et Journal sur les mêmes IDs. |
| F | Campagnes contextuelles et labels transparents, Free seulement, activation staff validée séparément ; ni achat ni publicité activée implicitement. |
| G | Événements documentés et agrégats Pro/admin consentis ; afficher les limites de couverture statistique et l'absence de données. |
| H | Tests appareils réels Android/iPhone/iPad/tablette et admin desktop, puis propagation commune vers intégrations natives approuvées. |

Chaque gros lot se termine par tests, captures, rapport et validation Marie. Ne pas réutiliser automatiquement l'autorisation temporaire GitHub accordée pour le précédent déploiement. Ni migration ni publication production automatique.

## Tests d'acceptation ciblés

- Produit : brouillon → soumission → prise en charge → correction → nouvelle soumission → approbation ; refus et archivage. Transition non autorisée refusée côté serveur.
- Concurrence : double clic d'approbation idempotent ; deux soumissions avec même EAN/référence rapprochées ; aucune perte d'une correction simultanée.
- Compte A/B : un professionnel ne lit ni ne modifie le brouillon d'un autre, ne s'auto-vérifie pas, ne s'auto-approuve pas et n'active pas une campagne.
- Médias : déclaration obligatoire pour soumettre, photo privée avant revue, nouvelle photo renvoyée en modération, suppression et restrictions de compte respectées.
- Catalogue : ancien ID préservé ; ajout Collection par ID ; correspondance exacte en Scan ; recherche/génération/projets lisent la même référence ; mode hors ligne utilisable.
- Imports : mauvais mapping, cellules invalides, doublons, propositions sur produit vérifié, aperçu sans mutation, application atomique, rollback sans écraser une modification postérieure.
- Sponsorisation : Free éligible seulement si pertinent et campagne active ; aucun placement pour Plus/Pro, droits bêta et changements d'offre inclus ; aucun ciblage individuel.
- Statistiques : refus de consentement = aucune mesure comportementale ; agrégats isolés par professionnel ; suppression/rétention ; pas d'email, conversation ou identifiant privé exposé.
- Non-régression : DA06/moods, auth/liens de confirmation, Billing natif, sièges, Journal Free, partages PO, profils et contenus publics/privés.

## État et rollback

Cet audit repose sur le code Pro V2 sauvegardé et les PR/branches GitHub inspectées. Aucune nouvelle migration, données, campagne ou souscription modifiée. Aucun nouveau test d'exécution : seuls des fichiers de préparation sont ajoutés. Les 525 tests réussis rapportés précédemment concernent Pro V2, pas cette extension non développée.

Le futur rollback désactivera séparément catalogue partenaire, admin et campagnes. Conserver les données validées, les IDs et la compatibilité des clients ; une restauration de version catalogue est une opération auditée. Avant toute migration : inventaire DB réel, sauvegarde vérifiée et tests de réexécution/retour client en recette.
