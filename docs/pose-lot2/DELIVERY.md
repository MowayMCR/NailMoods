# NailMoods — Lot 2 : Ma tenue, mes nails

## Décisions produit du 4 octobre 2026

- Tenue et import photo : Plus/Pro au lancement. IA+ reste indépendant et n'accorde pas `photo_projects`.
- Journal personnel et « Je l'ai faite » : accessibles à Free. Publication, découverte et partage conservent leurs contrôles premium.
- Recette uniquement. Aucun déploiement Production, merge, AAB, SKU IA+ ou appel IA payant.

## Fondations validées avant le lot 2

La migration `pose_cycle_foundations` a été appliquée sur **NailMoods-Recette**, projet `pueqkbwfwxgqzmkauxoz`. Deux vrais comptes Auth dédiés, A et B, ont exercé le dépôt JavaScript contre l'API réelle : création, relecture, modification, conflits, désactivation de rappels et suppression en cascade. Les lectures, modifications et suppressions croisées sont refusées pour les projets, le Planning et les rappels.

Le test IA+ a accordé temporairement un droit au seul compte interne A, avec `public_enabled=false`. A a été autorisé, B est resté masqué/refusé, et l'attribution d'un droit par le client a échoué. Les flags ont ensuite été remis à **false/false**, le droit de test et l'inscription interne retirés. Les droits Free/Plus/Pro et bêta existants n'ont pas été modifiés.

### Correction du constat Journal du lot 1

L'audit initial avait repéré des messages « disponible avec Plus » derrière `limited`. La lecture complète des capacités et le test du compte réel C montrent que `personal` inclut déjà Free et que `tier_allows(false)` autorise son espace personnel. Ces anciens messages ne constituaient donc pas un blocage effectif pour un compte Free reconnu. Le contrat est désormais explicite avec `tierCapabilities(...).journal` ; le Journal n'est plus associé au libellé Plus. Aucun élargissement serveur inutile n'a été ajouté.

Le compte C réellement Free a créé, relu, modifié et supprimé une fiche privée. La publication publique et un projet source tenue ont été refusés. Les tests n'ont pas eu recours à un faux rôle local pour cette vérification.

## Parcours livré

Créer → Ma tenue, mes nails → import galerie / entrée caméra existante → cadrage simple → analyse locale des couleurs → Assorti / Contraste / Discret / Audacieux / Surprends-moi → option Avec ma Collection → trois compositions → Voir cette idée → nom du projet et événement facultatif → Enregistrer comme Projet de pose → fiche privée et relecture.

Les projets sont accessibles depuis **Créer → Mes projets de pose**. Le lot 2 ne détourne pas l'ancienne liste `library.projects` : les nouvelles tenues sont exclusivement dans `pose_projects`. Le rapprochement complet avec le Journal, les tutoriels et le suivi interviendra dans leurs lots.

## Ce qui est réutilisé

| Brique | Utilisation |
|---|---|
| `ProductPhoto`, préparation JPEG, `imageCanvas` | Import/entrée caméra, contrôle de taille/type, décodage et réduction |
| `analysePhotoPixels`, `photoPalette`, `colorDistance`, `productColor` | Palette locale et rapprochement indicatif de couleurs |
| `snapshotIdea`, `validIdea`, `NailPreview` | Composition commune et rendu illustré existant |
| `MoodPicker`, tokens DA06, logo, navigation | Changement global d'ambiance sans changer les produits |
| Dépôt et modèles du lot 1 | Identité du projet, propriétaire, révisions, Planning |
| `createMediaStorage` et bucket privé | Upload, lecture privée, pas de nouvelle architecture média |
| File `media_cleanup_jobs`, suppression compte | Nettoyage après suppression ; suppression du compte par propriétaire des objets |
| Analytics existant | Consentement et pseudonymisation ; aucun titre, lieu, note ou média envoyé |

## Modèle et migrations

Aucune nouvelle table de tenue ou d'événement.

- `pose_projects.details.source = outfit`.
- `details.outfit` : version, couleurs estimées, ambiance colorimétrique, contraste indicatif, mode choisi, option Collection, cadrage et direction.
- `details.outfitMedia` : bucket privé, chemin utilisateur/espace/pose/id, MIME et taille. Aucun octet/base64 ni URL signée dans le projet.
- `details.composition` : format NailMoods existant, couleurs réelles des produits conservées.
- Événement : `pose_plan_items`, `kind=event`, lié au même projet. Date, fuseau, nom, lieu et note facultatifs. La date de réalisation de la pose n'est jamais déduite de l'événement.

Migrations appliquées **en recette seulement**, dans cet ordre :

1. Lot 1 : `20261004125620_pose_cycle_foundations.sql`.
2. `20261004142348_pose_outfit_source.sql` : autorisation contrôlée de la référence tenue, nettoyage média, sauvegarde atomique projet + événement.
3. `20261004143417_pose_outfit_access_analytics.sql` : RPC en `SECURITY INVOKER` utilisant la projection publique des capacités ; événements analytics limités.

La seconde migration de ce lot corrige un écart identifié avec le vrai schéma : `private.require_feature` n'est volontairement pas exécutable directement par le rôle client. La RPC publique conserve `SECURITY INVOKER` et vérifie le niveau via `nm_capabilities`, puis le propriétaire via le contrôle existant ; le trigger privé conserve sa vérification photo. Aucun accès supplémentaire au helper privé n'a été accordé.

La transaction `save_pose_outfit` enregistre ensemble le projet et son événement. Un identifiant stable et un verrou transactionnel évitent les doublons après une réponse réseau perdue. Un événement invalide annule tout l'enregistrement SQL. La création reste bloquée pour Free, même avec un éventuel droit IA+.

## Collection et différences entre les propositions

Chaque mode change les couleurs cibles. Les trois compositions utilisent respectivement une couleur unie, une French sur ongle naturel et des pois sur ongle naturel. Ce sont trois traitements illustrés distincts, pas trois cartes renommées d'une composition identique.

En mode Collection, les propositions utilisent exclusivement des vernis colorés possédés et renseignés, sans inventer une référence ou modifier leur HEX. Une Collection vide ou sans couleur exploitable produit un message explicite ; elle n'est pas remplacée silencieusement par des produits imaginaires. Les teintes non correspondantes sont qualifiées comme proches ou comme les plus proches disponibles. Le pinceau fin / outil à pois reste signalé à prévoir : posséder la couleur ne signifie pas posséder tout le matériel.

Sans Collection, les palettes sont des couleurs d'inspiration, explicitement conceptuelles. Les trois directions sont des propositions créatives ; elles ne prétendent pas reconnaître des tissus, des motifs ou une compatibilité chimique. Le fond « ongle naturel » des rendus French/pois n'est pas présenté comme une référence de vernis.

## Confidentialité et nettoyage

La photo originale est préparée et recadrée localement ; seule la version choisie est envoyée au stockage privé lors de la sauvegarde. Le projet et son fichier doivent appartenir à la même personne et au même espace. Une référence inexistante ou étrangère est refusée côté serveur.

Le vérificateur de références de nettoyage conserve les règles déjà déployées et y ajoute `pose_projects`. La suppression ou le remplacement d'une référence inscrit une tâche persistante dans la file existante. La suppression de compte existante liste les objets par propriétaire et couvre aussi le dossier `pose`.

En cas de réponse réseau incertaine, le client recherche d'abord le projet avant de supprimer un upload potentiellement utilisé. Un fichier privé dont l'issue reste inconnue est conservé pour permettre la reprise ; il sera également couvert par la suppression de compte. Le nettoyage après suppression de projet est asynchrone et dépend du worker existant ; la recette navigateur retire aussi explicitement ses propres fichiers fixtures en fin de test.

## DA06 et accès

Les nouveaux composants utilisent les surfaces, textes, bordures, puces et CTA du thème central. Le sélecteur de mood existant est accessible pendant le parcours et enregistre le choix dans le profil. Les photos et swatches produits restent sur une surface neutre.

Le flag de build `VITE_POSE_CYCLE_ENABLED=true` est activé uniquement par le build de recette. Le build standard garde ce parcours caché tant que sa validation et son déploiement ne sont pas décidés. Les mêmes modules React sont destinés aux variantes Android et iOS ; aucun code métier dupliqué par plateforme.

## Limites assumées du lot 2

- Analyse colorimétrique indicative, sensible à la lumière. Pas de reconnaissance de matière, personne, style vestimentaire ou motif.
- Cadrage simple : zoom et position, appliqués à l'analyse et à l'image enregistrée ; pas d'éditeur photo avancé.
- Événement sur une journée choisie ; heure et calendrier système seront intégrés au Planning du lot 3. Aucun rappel automatique ajouté.
- Les nouvelles sauvegardes nécessitent une connexion ; pas de file hors ligne parallèle ni de faux succès local. Les erreurs conservent la sélection à l'écran.
- La caméra native et les permissions physiques Android/iOS restent à vérifier sur appareils. Les captures utilisent une image de vêtement synthétique reproductible, importée dans l'application réelle.
- Pas de génération IA, paywall IA+, Try-On, partage PO nouveau, QR, synchronisation calendrier ou notifications natives dans ce lot.

## Reproduction et retour arrière

Les scripts distants refusent un hôte autre que NailMoods-Recette. Fournir `NM_POSE_FIXTURES` pointant vers un fichier privé contenant les identifiants des comptes fixtures A/B/C ; ils ne sont pas livrés dans le dépôt/dossier. Le test navigateur lance lui-même son serveur de preview et utilise le build de recette.

```sh
npm test
node scripts/build-recette.mjs
NM_POSE_FIXTURES=/chemin/prive/fixtures.json node scripts/test-pose-recette.mjs
NM_POSE_FIXTURES=/chemin/prive/fixtures.json node scripts/test-journal-free-recette.mjs
NM_POSE_FIXTURES=/chemin/prive/fixtures.json node scripts/test-outfit-browser.mjs
```

Revenir au code lot 1 ou désactiver le flag suffit à retirer l'entrée utilisateur. `ROLLBACK.sql` retire les extensions SQL uniquement si aucune tenue enregistrée n'existe ; sinon conserver le schéma additif et exporter avant toute suppression. Ne pas pousser tout l'historique local vers Production : les historiques local/distant présentent déjà des différences anciennes.

Les conseillers de sécurité Supabase ont été consultés. Les tables privées IA+ sans policies sont fermées aux clients par conception ; les autres avertissements constatés concernent des fonctions préexistantes et la protection des mots de passe compromis, pas une ouverture créée par le lot. Références : https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable et https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Résultats finaux

- Suite complète : **475 tests, 473 réussis, 0 échec, 2 ignorés**. Les deux anciens scénarios opt-in de tiers/médias ne sont pas activés par `npm test`. Ils ne sont pas comptés comme réussis.
- Six nouveaux tests couvrent les cinq modes, la distinction des compositions, les HEX Collection, les droits, la transaction SQL, l’isolation et le rollback à données vides.
- Tests dédiés contre la vraie recette : fondations A/B, IA+ interne A/B, Journal Free C et parcours navigateur A/B réussis. Preuves JSON jointes.
- Build de recette réussi. Avertissement de taille de bundle Vite conservé ; pas de build Android/iOS/AAB.
- Navigateur : application exécutée, Auth et stockage Supabase réels, tenue synthétique et produits fixtures. Import, cinq modes, trois directions, Collection, sauvegarde projet/événement, rechargement et isolation média vérifiés.
- Largeurs 320 / 360 / 390 / 430 px : pas de débordement et titre sans chevauchement. Un conflit avec l’ancien style global `header` a été corrigé avant les captures finales.
- Quatre captures finales inspectées : mêmes données et HEX produits, thèmes complets différents. Les longues captures conservent la barre fixe telle que rendue par le navigateur ; ce ne sont pas des maquettes.
- Rollback SQL testé sur une base de test sans tenue ; fonctions du lot 1 et ancien contrôle de nettoyage conservés.

Les scripts restaurent les préférences du compte et retirent leurs propres produits/projets/médias fixtures. Les captures ne représentent ni une utilisatrice réelle ni un déploiement en production. La branche `feat/pose-outfit-lot2` est livrée pour revue, sans fusion automatique.
