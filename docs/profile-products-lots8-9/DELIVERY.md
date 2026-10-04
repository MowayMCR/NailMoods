# NailMoods — Lots 8 et 9

Version de recette du 4 octobre 2026, issue du lot 6/7 validé (branche distante feat/pose-tutorial-followup-lots6-7, commit bb6c628c4351a8b803ccf0248cc2d7b898bdc444). Branche de travail : feat/profile-products-lots8-9. Aucune fusion, aucun AAB, aucune Production.

## Audit et réutilisation

- Profil : source unique `profiles.preferences.nailmoodsProfile`, sérialisation `nm-profile`, cache local et file de synchronisation existants. `ProfileView`, `ProfileNail`, moteur DA06 et les quatre palettes conservés.
- Confidentialité : RLS `profiles` limitée à `id = auth.uid()`. `nm_public_profile_v2` autorise seulement bio/univers et cinq préférences nommées (`shape`, `length`, `level`, `duration`, `technique`). Aucun nouveau champ dans cette projection. Aucun réglage public des nouvelles données.
- Collection : `user_products.metadata.nailmoods`, `productRow`, `productFromRow`, éditeur Collection et contrôles d’import existants. Droits et RLS inchangés.
- DIY : moteur `compareProduct` existant réutilisé pour références exactes / teintes proches. Famille, finition, opacité et couleur contrôlées séparément d’une compatibilité de systèmes. Le parcours réel a révélé que l’effet par défaut « Aucun » bloquait la comparaison avec un produit ancien sans champ effet : ces deux représentations sont désormais équivalentes, sans ignorer un véritable effet.
- Catalogue V2 : 2 631 références dans le fichier principal ; 116 possèdent déjà une couvrance. Les colonnes du classeur source confirment l’absence d’INCI et de protocole complet. La couvrance n’était pas transmise par `catalogCandidate` : elle l’est désormais.
- Protocoles : registre introduit au lot 6 réutilisé. Aucune deuxième architecture de tutoriel.

## Lot 8

Nouvel accès Profil → Mes repères personnels (`#profil/lifestyle`), avec résumé Bento sur le profil.

Données privées facultatives `lifestyle` version 1 : `daily[]`, `nails[]`, `nailNote`, `undertone`, `watch[]` (30 noms maximum, 120 caractères par nom). Sélections de quotidien et observations auto-déclarées ; aucune qualification médicale. Le choix « normaux » est exclusif des autres observations.

Suggestions de trois formes/longueurs selon les activités. Application à la préférence existante seulement au clic explicite. Accès à Créer avec ces préférences. Le sous-ton affiche des pistes de couleurs sans filtrer la Collection ni interdire une couleur. Observations sensibles/après dépose : texte prudent et possibilité de différer une inspiration, sans prescription de soin ni durée.

Ajout/retrait des ingrédients surveillés, dont HEMA et Di-HEMA séparés. Effacement de tous les nouveaux repères sans effacer les univers ou préférences habituelles. Disponibles en Free, Plus et Pro. Aucun envoi analytique de ces valeurs.

## Lot 9

Fiche produit → Bien connaître mon produit :
- INCI fabricant lorsque la référence exacte est documentée, source et date ; sinon absence explicitement indiquée.
- Transcription personnelle facultative depuis une véritable étiquette/fiche fabricant, distincte du catalogue vérifié. Associée à l’identité du produit ; invalidée si celle-ci change. Effaçable.
- Mise en évidence des noms surveillés effectivement présents. Parenthèses chimiques préservées (`poly(1,4-butanediol)` ne devient pas deux ingrédients). HEMA ne matche ni Di-HEMA ni Bis-HEMA. Aucun résultat ne conclut à un produit « sans danger ».
- Alternatives possédées, teintes sur fond neutre, opacité modifiable et informations manquantes affichées.
- Comparaison des systèmes avec un second produit de la Collection. États textuels + icônes : documenté, insuffisant, systèmes différents selon source. Une couleur proche ne sert jamais de preuve chimique.
- Catalysation : choix d’un modèle exact de lampe ; aucune durée préselectionnée, aucun calcul watts/temps. Informations réutilisables par le tutoriel existant.

Le champ privé `ingredientRecord` est retiré des nouveaux snapshots d’inspiration, sans modifier le produit personnel. Le profil privé n’est pas copié dans une pose ou publication.

## Données fabricant ajoutées et limites

Registre initial volontairement restreint, à enrichir référence par référence :
1. Manucurist Green Red Cherry, SKU 33005, France 15 ml : INCI publié et couvrance.
2. Manucurist Green Flash Red Cherry, SKU 51006, France 15 ml : INCI publié et couvrance ; chaque couche de couleur avec Manucurist Lampe Premium 36W (60 s) ou Manucurist Lampe Slim 24W (120 s), conformément à la fiche fabricant.
3. Règle du système Green Flash pour base/couleur/top : même gamme documentée ; association avec un autre système explicitement exclue par le fabricant. Ce n’est pas une garantie sanitaire.

Sources primaires consultées le 2026-10-04 :
- https://www.manucurist.com/products/red-cherry-1 (INCI, gamme, incompatibilité avec Green Flash)
- https://www.manucurist.com/products/vernis-green-flash-red-cherry (INCI, système et durées par modèles nommés)
- https://www.manucurist.com/products/lampe-pro-36w (identification Lampe Premium / système Green Flash)

Les pages présentent aussi des informations générales ou promotionnelles non reprises. La mention générique « 48W » n’identifie pas un modèle assez précisément : aucun protocole n’a été créé à partir de cette mention. Les autres références restent « information non disponible » ; les deux INCI ne sont pas étendus à d’autres teintes ou gammes. Les formules pouvant évoluer, la liste du flacon reste à vérifier. Pas de nouvelle donnée de dépose dans ces lots.

## Modèles et migrations

Aucune nouvelle table ni colonne. Les champs JSON existants et leurs permissions suffisent. Le test réel a révélé que la projection DA06 `nm_public_profile_v2` était absente en recette (le client utilisait son fallback historique). Migration corrective `20261004190121_profile_private_lifestyle_projection.sql`, appliquée uniquement en recette : même liste blanche de champs DA06, vérification Auth explicite, logique privilégiée dans le schéma privé, wrapper public SECURITY INVOKER et droits anon révoqués. Les contrôles de visibilité/blocage/Plus-Pro du profil public original restent prioritaires. Aucune modification des tables, RLS ou entitlements. Aucune modification Free/Plus/Pro/bêta. IA+ reste fermé. Aucun fournisseur payant appelé.

Les données nouvelles sont supprimées avec les profils/produits selon les mécanismes de suppression de compte existants. Pas de nouveau média ni bucket.

## Validation

Voir `evidence/browser-lots89.json` pour le résultat du parcours réel avec trois comptes authentifiés et `evidence/tests-summary.json` pour la suite automatisée.

Parcours : saisie Profil → synchronisation serveur → reload → choix de forme ; profil public observé par un autre compte avec tous les opt-ins activés ; refus des lectures privées A/B/C ; quatre moods ; fiche INCI fabricant ; exactitude des ingrédients signalés ; sélection des lampes ; comparaison Green/Green Flash ; transcription personnelle save/reload ; alternative Collection ; accès Free et IA+ fermé. Données de test supprimées et profils restaurés après les essais.

Captures réelles de l’app exécutée, données de démonstration explicitement identifiées. Les HEX des produits de test sont des valeurs de démonstration personnelles, pas des mesures officielles Manucurist.

Tests navigateurs aux largeurs 320/360/390/430 px. Appareils Android/iOS physiques non disponibles : contrôle natif visuel et clavier à prévoir avant bêta. Aucune nouvelle intégration native dans ces lots. Le build conserve l’avertissement préexistant sur la taille d’un bundle.

## Retour arrière

Revenir au commit de base des lots 6/7 ou annuler le commit des lots 8/9. Les données JSON ne nécessitent aucun rollback. Pour retirer le correctif de projection de la recette à son état initial, supprimer uniquement `public.nm_public_profile_v2(text)` puis `private.nm_public_profile_v2(text)` après contrôle des dépendances ; le client revient à son fallback historique. Cette opération n’est pas exécutée automatiquement. Les anciennes versions ignorent `lifestyle` et `ingredientRecord` sans effacer les données. Les fixtures de recette sont éphémères. Les fichiers de catalogue, logos, icônes d’univers et couleurs réelles ne sont pas remplacés.

## Contrôle sécurité Supabase

Après migration : aucun nouvel avertissement. Restent les avertissements déjà présents sur quatre RPC de droits/billing et la protection des mots de passe compromis désactivée. Aucune politique n’a été ouverte pour les contourner.
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Fichiers du lot

- `.gitignore`
- `docs/profile-products-lots8-9/DELIVERY.md`
- `docs/profile-products-lots8-9/evidence/browser-lots89.json`
- `docs/profile-products-lots8-9/evidence/products-final-render.json`
- `docs/profile-products-lots8-9/evidence/report-validation.json`
- `docs/profile-products-lots8-9/evidence/tests-summary.json`
- `scripts/build-profile-products89-report.py`
- `scripts/test-profile-products89-browser.mjs`
- `scripts/test-profile-products89-report.mjs`
- `src/ProfileView.jsx`
- `src/catalog.js`
- `src/inspirations.js`
- `src/lifestyle/LifestyleProfile.jsx`
- `src/lifestyle/lifestyle.css`
- `src/lifestyle/model.js`
- `src/main.jsx`
- `src/poseCycle/diy.js`
- `src/poseCycle/protocols.js`
- `src/poseCycle/protocols/registry.js`
- `src/productKnowledge/ProductKnowledge.jsx`
- `src/productKnowledge/model.js`
- `src/productKnowledge/products.css`
- `src/productKnowledge/registry.js`
- `supabase/migrations/20261004190121_profile_private_lifestyle_projection.sql`
- `tests/profile-private-projection.test.js`
- `tests/profile-products89.test.js`


Résultat final : 518 tests réussis, 0 échec, 2 tests optionnels ignorés ; 9 tests ciblés du modèle exécutés après le durcissement des entrées JSON. Dossier validé sur cinq largeurs avec six images chargées et quatre onglets fonctionnels. Aucun produit de test restant en recette.
