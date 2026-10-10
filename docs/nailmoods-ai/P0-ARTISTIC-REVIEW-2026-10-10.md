# NailMoods AI — recette P0 artistique

État au 10 octobre 2026 : **mission non validée artistiquement ; accès pilote administratrice uniquement**. Branche `fix/ai-artistic-master-p0-20261010`, [PR 51](https://github.com/MowayMCR/NailMoods/pull/51). Aucun build mobile, aucune ouverture à d'autres comptes, aucune rotation de clé.

## Ce que les preuves permettent de conclure

### Vampire gothique Halloween

Les captures montrent trois représentations différentes, une composition encore dominée par des couleurs unies, un objet doré ailé hors sujet, un titre « Pause » et des contrôles coupés.

Le job de composition du 10 octobre à 18:09 UTC contient déjà `motif: winged-orb` au doigt 4, auriculaire gauche, et un brief demandant un « petit vif d'or en 3D en strass ». La demande était « Une pause un peut gothique vampire pour halloween ». La conversation ne contenait pas de demande Harry Potter préalable. **L'objet a été introduit lors du plan, avant le schéma et les images.**

Le prompt système contenait une instruction spécifique au Vif d'or héritée d'une correction précédente. Elle constitue une influence possible, pas une preuve du mécanisme interne ayant conduit le modèle à choisir ce motif. Elle a été retirée. L'historique récent n'est désormais envoyé que pour une continuité ou modification explicite ; une nouvelle demande ne reçoit pas automatiquement les échanges précédents.

### Minions

Le plan de 17:41 UTC correspondant au titre visible contient une description « jaune vif » pour une teinte personnelle dont le HEX enregistré est `#f1efeb`, non vérifié. Le moteur graphique rendait donc une couleur presque blanche tandis que le texte la nommait jaune. Ce même plan contient explicitement « Miroir main gauche », incompatible avec dix compositions distinctes.

La présence de motifs végétaux et la différence entre schéma et photo sont visibles sur les captures. Sans identifiant de résultat dans ces captures, l'étape exacte qui a introduit chacun des éléments végétaux ne peut pas être établie avec la même précision que pour l'objet ailé vampire. Aucun lien causal avec le mood de l'interface n'est affirmé.

## Corrections implémentées

- Direction artistique structurée : intention, univers, palette, exclusions et équilibre ; rôle, techniques cumulables, signature, motifs justifiés, emplacement et matériel par doigt.
- Palette harmonisée contrôlée avant l'image ; couleurs de base et de détail résolues depuis des identifiants existants. Les produits personnels gardent leur statut vérifié ou non vérifié.
- Refus du Vif d'or hors demande culturelle explicite, y compris lorsque la demande le refuse ; refus de signatures différenciées uniquement par couleur, de certaines techniques incompatibles avec le niveau facile et de techniques essentielles demandées mais absentes.
- Pose maître versionnée avec identifiants stables `left/right-thumb/index/middle/ring/little`, revision, demande initiale, forme, longueur, palette et composition. Quand tous les rôles sont déclarés principaux, le serveur répartit les rôles selon le poids des motifs de chaque main ; cela ne constitue pas une validation de l'équilibre visuel.
- Les motifs artistiques structurés font autorité ; les anciens symboles génériques ne sont plus transmis comme décorations concurrentes. Aucun motif végétal lié à la DA n'est ajouté aux poses IA.
- Schéma technique explicitement séparé du dessin IA. Les formes non prises en charge par le schéma sont des repères simplifiés, pas des dessins certifiés.
- Le réalisme utilise le même plan et le dessin privé déjà généré, téléchargé côté serveur après contrôle de propriété et d'espace de travail. Les nouveaux plans portent un identifiant et une revision vérifiés lors de la sélection de la référence.
- Une seule image par appel, sans relance automatique ; comparaison visuelle supplémentaire par doigt, notes 0–5 et écarts enregistrés. Moins de 4 sur un critère principal, un motif manquant/déplacé ou une erreur majeure rend le résultat non conforme. **Un contrôle automatique ne vaut jamais validation humaine.**
- Tutoriel local inclus, étapes par doigt et références résolues de la palette ; aucun jeton supplémentaire et aucun temps de polymérisation inventé.
- Tags issus de l'intention positive et des motifs/techniques du plan, sans scan des noms des produits privés ni incorporation des hallucinations d'image. Les exclusions (« sans fleurs », etc.) ne deviennent pas des tags.
- Fil : critères combinés avec AND, synonymes FR/EN, trois à cinq tags prioritaires par carte. Les filtres de visibilité, de permissions et de blocage existants sont conservés.
- Fenêtre IA : titre fixe, contenu défilant, marges de sécurité et actions explicites « schéma », « dessin », « rendu réaliste ». Entrée sur une tuile dans Créer ; les moods visuels ne gouvernent pas la création.
- Les références privées des images et leurs contrôles peuvent être conservés dans le projet ; les URL signées temporaires ne sont pas sauvegardées.

## Essais payants effectués en Production

Toutes les créations de test restent privées. Les résultats disponibles sont dans l'historique du compte administratrice, sous les conversations Vampire et Minions. Les images n'ont pas été exposées publiquement.

| Opération | Résultat | Coût OpenAI mesuré, USD |
|---|---|---:|
| Premier nouveau plan vampire | Structure acceptée mais revue manuelle du plan insuffisante ; images non lancées | 0,004286 |
| Deuxième plan vampire | Refus avant image : palette incohérente | 0,005188 |
| Plan Minions jaune/bleu/noir | Plan et tutoriel préparés | 0,005154 |
| Plan vampire resserré noir/bordeaux/prune | Plan et tutoriel préparés | 0,005379 |
| Dessin vampire + contrôle visuel | Présélection automatique, validation humaine en attente | 0,055993 |
| Réalisme vampire + contrôle visuel | **Non conforme : qualité artistique 3/5** | 0,040429 |
| Première image Minions | Erreur fournisseur ; détail non conservé par l'ancienne gestion d'erreur | Inconnu |
| Une seule reprise Minions | HTTP 400, `moderation_blocked` ; aucun dessin exploitable | Inconnu |

Total connu de cette recette : **0,116429 $**. Deux réservations de 0,50 $ restent comptées par prudence, faute de consommation fournisseur exploitable ; elles ne sont pas présentées comme des coûts facturés connus. Le pilote administratrice ne débite pas de jetons, mais ses plafonds de dépenses et de demandes restent appliqués.

Ancienne chaîne vampire observée avant cette correction : plan 0,001703 $, dessin 0,026172 $, réalisme 0,026797 $, soit 0,054672 $. Cette mesure ne comprend pas le nouveau contrôle visuel et ne constitue pas une promesse de prix.

### Comparaison vampire

| Critère automatique | Dessin | Réalisme |
|---|---:|---:|
| Fidélité | 4 | 4 |
| Univers | 5 | 4 |
| Qualité artistique | 4 | **3** |
| Complexité | 4 | **3** |
| Forme et longueur | 5 | 5 |
| Motifs | 5 | 4 |
| Cohérence | 4 | 4 |
| Matières | 4 | 4 |
| Tutoriel, accord estimé avec le plan | 4 | **3** |
| Tags, accord estimé avec le plan | 5 | 4 |

Les dix identifiants sont présents dans les rapports, sans motif essentiel manquant ou déplacé signalé. Cela ne suffit pas : la qualité artistique du réalisme échoue au seuil. Le contrôle machine de tutoriel/tags estime leur accord avec le plan, il ne certifie pas leur réalisabilité ni une classification visuelle exhaustive. Les images n'ont pas été inspectées manuellement par l'agent ; la revue humaine finale reste obligatoire.

La génération Minions n'a pas pu être comparée : le fournisseur a refusé la reprise. La raison détaillée au-delà de `moderation_blocked` n'est pas connue ; aucune conclusion générale sur la disponibilité de cet univers n'est tirée et aucun contournement n'est proposé.

## Recette reproductible A–G

| Cas | Vérifié | Reste ouvert |
|---|---|---|
| A — Minions | Plan, palette jaune/bleu/noir, dix identifiants, tutoriel | Dessin refusé ; comparaison et réalisme impossibles dans cette recette |
| B — Vampire | Plan, schéma exporté, dessin, réalisme référencé, comparaison automatique par doigt | Réalisme sous 4/5 artistique ; validation humaine et amélioration nécessaires |
| C — Fleurs avec collection | Tests de contrat : IDs inconnus rejetés, produits conceptuels exclus en mode collection | Essai payant sur les véritables produits, teintes et compatibilités de Marie |
| D — Multitechnique | French + Aura + 3D + strass conservés dans plan/tutoriel/tags ; technique essentielle absente refusée | Restitution photographique effective des quatre techniques |
| E — Annulaire droit | Modification structurée conserve les neuf autres doigts, forme et direction | Conservation pixel par pixel des images ; masquage/édition ciblée à fiabiliser |
| F — Fil / Découvrir | Fonction SQL complète testée : publication simulée visible, passage privé et blocage retirent immédiatement le résultat ; AND et alias FR/EN | Parcours humain de publication volontaire réelle et contrôle de média public |
| G — Quotas | Tests atomiques multi-offres, réservations, échecs, rejeu, concurrence, arrêt et isolation ; tentative réelle au-delà de 30 refusée `daily_quota_exceeded` | Recette des paiements/récompenses et quotas commerciaux définitifs |

Les commandes de recette sont `npm test`, `npm run build` et `node scripts/test-assistant-browser.mjs`. La CI interface vérifie les quatre DA et les positions du titre/des actions sur mobile et tablette, sans dépenses OpenAI. Les captures de CI ont été examinées ; elles sont des fixtures d'interface, pas des preuves de qualité d'image réelle.

## Sécurité, coûts et préparation commerciale

Le contrôle Production confirme **un seul compte pilote**. Les plafonds restent 2 $/jour, 10 $/mois et 30 demandes/jour, avec concurrence globale 2, un worker par compte, file bornée et coupure serveur. L'enqueue de vérification après la trentième demande a été refusé côté serveur avant génération. L'état du jour observé est 0,361592 $ de coûts connus, plus 1 $ de réservations non résolues, soit 1,361592 $ comptés conservativement.

La clé existante est conservée. Son contrôle et la dépendance `ai-internal` sont documentés dans le [rapport commercial initial](RAPPORT-PRODUCTION-COMMERCIALE.html). La valeur du secret n'a pas été exportée. Le modèle de composition/contrôle reste `gpt-4.1-mini` ; les images utilisent `gpt-image-2.5-sunburst`. Aucun quota illimité n'est introduit et les hypothèses Plus 3 / Pro 10 ne sont pas ouvertes au public.

Les assistants privés ne sont pas exposés dans les projections sociales. Les helpers de recherche n'accordent aucun accès direct à anon/authenticated. La migration ne joint pas la collection privée. La revue Supabase signale encore la protection des mots de passe compromis désactivée et des fonctions publiques SECURITY DEFINER à revue contextuelle ; elles n'ont pas été modifiées aveuglément. Les tables privées RLS sans politique restent fermées par conception.

Organisation Supabase vérifiée le 10 octobre : **Free**. Production eu-west-3, Postgres 17, ACTIVE_HEALTHY. Les sauvegardes, Storage, compute, trafic, limites OpenAI et disponibilité commerciale doivent être revus avant ouverture ; aucun abonnement n'a été souscrit. Voir le [rapport de capacité et montée en charge](RAPPORT-PRODUCTION-COMMERCIALE.html), dont les mesures de charge restent locales/synthétiques.

Le nouveau maximum de délais fournisseur est 75 s pour l'image, deux modérations de 10 s et un contrôle de 30 s. Stockage et finalisation s'ajoutent : le plan Free n'est pas une garantie d'achèvement sous charge. Une campagne réseau et endurance sur l'infrastructure cible reste nécessaire.

### Projections fondées sur la mesure vampire, pas des tarifs commerciaux

Hypothèse : toutes les utilisatrices du palier sont actives et demandent trois chaînes complètes par mois. Chaque chaîne comprend plan + dessin + réalisme + contrôles, au coût observé de **0,101801 $**. Tutoriel local sans coût API supplémentaire. Hors recherches/conversations additionnelles, erreurs, nouvelles variantes, taxes, Storage, compute, réseau et support.

| Utilisatrices actives | 3 chaînes complètes/mois | 3 réalismes seuls/mois | 10 chaînes complètes/mois |
|---:|---:|---:|---:|
| 100 | 30,54 $ | 12,13 $ | 101,80 $ |
| 1 000 | 305,40 $ | 121,29 $ | 1 018,01 $ |
| 10 000 | 3 054,03 $ | 1 212,87 $ | 10 180,10 $ |

Échantillon réel : une seule chaîne vampire, non validée artistiquement. Ces projections ne sont ni une moyenne statistique fiable ni une certification de capacité. La charge synthétique existante couvre des scénarios de 100/1 000/10 000 comptes avec admission et fournisseur simulés, sans certifier le réseau, les workers réels ou 10 000 générations simultanées.

## Conditions restantes avant validation P0

1. Améliorer le réalisme vampire jusqu'à une note artistique acceptable puis comparer les images humainement.
2. Obtenir un dessin Minions accepté par le fournisseur et comparer son réalisme ; ne pas masquer un refus par un faux résultat local.
3. Réaliser les essais C/D et les effets Cat Eye, Chrome, Jelly, Glazed, Aura, paillettes, 3D, strass, charms, Glass et Aurora avec images réellement comparées.
4. Fiabiliser l'édition visuelle ciblée : la conservation structurée des neuf autres doigts n'est pas une garantie de conservation de leurs pixels.
5. Vérifier chaque tutoriel et son matériel avec une personne compétente ; aucun nom de technique ou teinte générique ne prouve qu'un produit réalise l'effet.
6. Finaliser la publication volontaire des médias générés et leur conservation après la rétention d'historique de 90 jours ; sauvegarder une référence privée n'est pas une archive permanente.
7. Compléter recherche/social en conditions réelles, paiement/récompense, charge réseau/endurance, alertes et sauvegarde/restauration.

**Aucune ouverture commerciale et aucune déclaration de mission terminée.** La validation artistique finale appartient à Marie. La suite des appels payants est limitée par le quota serveur atteint, qui n'a pas été augmenté pour terminer artificiellement la recette.
