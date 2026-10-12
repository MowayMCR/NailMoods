# NailMoods 1.0 — état d'implémentation, 12 octobre 2026

## Audit du code réel
Source : main `fe0055a5367a6edc0f3513f983126691a1c0ecde`, préparation PR #70 `de88c7dd59805e37a0d044405555ba32febd45c0`.
La PR #70 est ouverte, en draft et indiquée mergeable par GitHub au contrôle initial. Aucun conflit déclaré à cet instant. Ce statut doit être revérifié après les autres développements. La nouvelle branche descend du commit de préparation, sans fusion d'autres branches. La PR complémentaire cible la branche préparatoire pour éviter de dupliquer sa revue.

349 fichiers sous src au contrôle initial : le pilote ne représente pas une traduction intégrale. Les feuilles catalogue jointes ne constituent pas la source du code et n'ont pas été réimportées. Aucun ancien visuel tablette n'a été étiré.

## Changements de cette livraison
- Réutilisation de l'infrastructure et du drapeau de recette existants.
- Navigation et 15 clés des tuiles d'accueil disponibles dans les six langues (23 clés au total).
- Hook de traduction qui conserve le français hors recette ; interpolation texte sans HTML.
- Préférence de session en cas de stockage interdit ; synchronisation lors d'un événement storage/clear.
- Formats Intl : nombres/dates/devises ; devise requise, prix localisé store prioritaire. Helpers préparés, migration des écrans financiers non réalisée.
- Audit reproductible des dictionnaires et candidats de textes statiques : `node scripts/audit-i18n.mjs`. Son mode `--release` échoue volontairement tant que la release reste incomplète.
- Manifest de préparation : aucune locale n'est commercialReady.

## Travail restant obligatoire
Inscription/Auth, consentements, profil, collection, création/IA, tutoriels générés, livre, découverte, messagerie, Pro/Salon, achats, assistance et erreurs : migration complète à poursuivre. Ne pas appliquer une traduction globale du DOM : elle risquerait de traduire les contenus personnels, produits et références. Convertir uniquement les libellés éditoriaux avec des clés explicites ; garder les valeurs métier stockées inchangées.
Les traductions des quinze clés d'accueil sont des propositions éditoriales ; revue native à réaliser.
Les documents juridiques complets en six langues, métadonnées stores et support localisé ne sont pas livrés dans cette étape. Les notes de rédaction de #70 restent un cadrage, pas des contrats commerciaux.

## Matrice de recette
| Plateforme | FR | EN | ES | DE | IT | NL |
|---|---|---|---|---|---|---|
| Dictionnaires / résolution / formats Node | Vérifié | Vérifié | Vérifié | Vérifié | Vérifié | Vérifié |
| Web : parcours visuels et conservation des saisies | À tester | À tester | À tester | À tester | À tester | À tester |
| Android : appareil et Google Billing | Non exécuté | Non exécuté | Non exécuté | Non exécuté | Non exécuté | Non exécuté |
| iPhone : appareil et StoreKit | Non exécuté | Non exécuté | Non exécuté | Non exécuté | Non exécuté | Non exécuté |
| iPad / tablette Android : proportions | Non exécuté | Non exécuté | Non exécuté | Non exécuté | Non exécuté | Non exécuté |

Les tests Node de langue ne prouvent pas des achats sandbox ni un rendu sur appareils. Aucun test natif n'est revendiqué.

## Bloquants commerciaux
1. Traduction de tous les parcours et notifications/email ; revue linguistique native, y compris textes longs DE/NL.
2. CGU/CGV, confidentialité, suppression, mentions, achats et Salon finalisés puis traduits et validés ; médiateur compétent et identité professionnelle vérifiés.
3. Vérifier juridiquement les traitements effectifs, régions et transferts Supabase/OpenAI et contrats ; déclaration Apple/Google contre les builds finaux. Ne pas déduire les catégories collectées de la seule présence d'un SDK.
4. Définir les garanties, rétractation/exceptions, remboursements des crédits consommés et propriété du portefeuille Salon en accord avec le comportement serveur réel.
5. Recette sur appareils et achats sandbox, concurrence des débits, départ de PO, suppression et restauration.
6. Localisations et prix des stores vérifiés par territoire ; TVA et rôle de chaque store validés avec comptable, aucun tarif modifié.

## Ouverture proposée, conditionnelle
- Semaine 0 : terminer tronc commun, documenter droits Salon/jetons et périmètre des SDK.
- Semaines 1–2 : migration UI et documents FR 1.0 ; revue juridique, mécanisme de consentement versionné et archives sans effacer les preuves existantes.
- Semaines 3–4 : traductions et revue EN/ES/DE/IT/NL, métadonnées stores et appareils.
- Semaine 5 au plus tôt : GO France après validation ; aucune publication automatique.
- Vague suivante : Belgique/Luxembourg une semaine après stabilité FR et validation des langues réellement proposées.
- Puis Allemagne/Espagne/Italie/Pays-Bas, pays par pays après recette et revue locale. Délais indicatifs, pas dates promises.
- Suisse : dossier séparé, CHF et TVA, règles de consommation suisses, LPD et transferts, éventuelle représentation à évaluer ; aucun GO déduit de la disponibilité FR/DE/IT.

## Sources primaires consultées
- DSA : https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065 — qualifier le service et vérifier articles applicables ; exemptions petites entreprises partielles, pas exonération globale.
- Consommation UE : https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm — rétractation et exceptions à examiner selon service fourni.
- Suisse : https://www.edoeb.admin.ch/en/cross-border-transfer-of-personal-data — obligations de transfert sous LPD à vérifier séparément.

Tous les statuts restent NO GO commercial ; aucune modification des pages contractuelles publiques, droits, publicités, tarifs, stores ou production dans cette étape.

## Résultats automatisés de cette étape
- `npm test` : 664 tests, 662 réussis, 2 ignorés, 0 échec. Les cinq tests i18n sont réussis.
- `VITE_I18N_BETA_ENABLED=true npm run build` : réussi. Avertissement de bundles supérieurs à 500 kB ; aucune certification de performance mobile.
- Audit des dictionnaires : 23 clés par langue, aucune clé manquante. L'analyse des textes statiques demeure une aide à la revue, pas un inventaire exhaustif des chaînes dynamiques/serveur.
