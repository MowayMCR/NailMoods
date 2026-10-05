# Catalogue / administration et boucle cliente ↔ PO

Mise à jour du tronc commun, Web d’abord. Apple et les builds bêta restent hors de ce lot.

## Audit et réutilisation

| Domaine | État initial | Évolution livrée |
|---|---|---|
| Catalogue | 2 812 références publiques embarquées, IDs stables | Catalogue central approuvé, mêmes IDs ; complément local et cache public hors connexion |
| Pro | Workspaces, rôles, vitrines et produits Pro V2 | Soumissions rattachées aux mêmes produits et à la file de corrections existante |
| Administration | Journal staff, contrôle des images et identités | File produit, décisions motivées, corrections versionnées, archivage, imports CSV/XLSX |
| Partage cliente | `inspiration_shares`, messages privés, brief de projet | Réponse reliée au brief via `reply_to_share_id` ; aucune seconde messagerie |
| Atelier | Éditeur des cinq ongles | Réutilisé directement depuis le brief ; dessin conservé dans la réponse |
| Projets | `pose_projects` et Planning | Brouillon PO et prochaine pose cliente dans le modèle existant ; sauvegarde idempotente |

## À valider dans la Web App

1. **Profil → Espace Pro**, métier marque ou créatrice de produits : ajouter une fiche dans les produits existants, puis ouvrir « Mes produits, un catalogue commun ». Préparer les sources, confirmer les droits et soumettre.
2. **Profil → Journal staff → Catalogue NailMoods** : examiner la fiche, demander un complément, refuser ou approuver avec un motif. Un compte staff est nécessaire ; Pro seul n’accorde pas ce droit.
3. Dans le catalogue publié : rechercher, corriger et consulter l’historique. Une correction garde l’identifiant et ne réécrit pas les produits déjà possédés.
4. Import : télécharger le modèle CSV, préparer le fichier CSV/XLSX, examiner les erreurs avant confirmation. 250 produits et 3 Mo maximum ; premier onglet Excel, cellules simples sans formules. Une annulation archive uniquement un import non modifié depuis.
5. **Cliente Plus/Pro → fiche de projet → Envoyer à ma PO**. Dans la conversation ou le lien privé, la PO ouvre « Adapter dans l’Atelier », modifie les ongles, conserve un brouillon et confirme l’envoi.
6. **Cliente → proposition reçue** : « J’adore », puis « Ajouter à ma prochaine pose » si la PO a autorisé la réutilisation. Ouvrir le projet permet de retrouver les variantes et le Planning existants.

## Données et garanties

- `private.catalog_products` : version approuvée, archivage et relation professionnelle ; `catalog_history` : avant/après et motif ; `catalog_imports` : prévisualisation et statut du lot.
- `pro_correction_requests` réutilisé pour les soumissions, corrections et revendications. Statuts : brouillon, soumis, en vérification, à compléter, approuvé, refusé, archivé.
- Les produits, **avec ou sans image**, passent par le contrôle catalogue. La validation de l’image reste indépendante dans la modération existante.
- Une marque ne peut ni publier ni vérifier sa propre relation. Les décisions catalogue utilisent le contrôle staff serveur et les révisions ; les soumissions d’un membre du staff requièrent un autre relecteur.
- INCI, catalysation, compatibilité, dépose : texte et source explicite. Aucune durée déduite des watts, aucune compatibilité chimique déduite de la couleur. Les informations centrales sont reprises par les fiches produit existantes ; les comparaisons de systèmes conservent leurs règles documentaires.
- La revendication conserve l’ID et établit la relation après vérification ; elle n’écrase pas silencieusement les données de la référence existante.
- Aucun changement des abonnements, droits bêta, Billing ou IA+. Le partage social conserve les droits Plus/Pro existants.
- Réponses PO : même partage privé, même conversation, permissions réévaluées côté serveur. Retirer le brief retire également ses réponses liées. Les copies explicitement enregistrées auparavant sont personnelles et ne sont pas supprimées à distance.
- Brouillons et prochaines poses : `pose_projects`, source existante `inspiration`, clés d’import stables `po-adaptation:<share>` et `po-response:<share>`.
- Ni notes ni photos de la cliente ne sont recopiées automatiquement dans une réponse ou une prochaine pose.

## Validation

- Suite complète : **541 tests, 539 réussis, 0 échec, 2 ignorés préexistants**.
- Tests ciblés supplémentaires après finition : voir les résultats enregistrés.
- Navigateur : composants de production exécutés, RPC et persistance PostgreSQL/PGlite ; soumission/rechargement, revue staff, correction, import, dessin, reprise du brouillon, réponse et sauvegarde cliente. Comptes et contenu de démonstration, pas des maquettes. Captures Soft Glam et Dark Feminine dans `evidence/`.
- Responsive : admin et retour cliente testés à 320, 360, 390 et 430 px.
- Recette hébergée : fonctions installées testées avec le rôle SQL `authenticated` et les deux identités de test existantes. Connexion acceptée, réponse, réaction, projection privée, refus non-staff, accès direct aux tables refusé et import/annulation. Transaction intégralement annulée après test : aucun message de test durable.
- Cette vérification SQL **ne constitue pas un test de connexion par mot de passe/JWT**. La dernière authentification complète et l’essai sur appareils Android/iOS restent à faire.
- Vérification Supabase : les tables privées n’ont volontairement aucune policy d’accès direct ; seules les RPC contrôlées y accèdent. Le lecteur public du catalogue est volontairement `SECURITY DEFINER`, borné et sans données administratives ni médias privés. Les avertissements d’advisor associés sont documentés, pas masqués. [Explication du contrôle des fonctions publiques](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Modifications principales

- `src/catalogue/` : modèles, import, service et interface commune marque/staff.
- `src/catalog.js` : catalogue central superposé au catalogue embarqué, cache et chargement mutualisé.
- `src/professional/ProManager.jsx`, `src/support/PublicationReview.jsx` : accès intégrés aux écrans existants.
- `src/productKnowledge/` : affichage des informations centrales sourcées, INCI dans la liste de surveillance existante.
- `src/social/PoLoop.jsx`, `poLoop.js`, `ShareCard.jsx`, `PoShare.jsx` : adaptation, réponse liée, réaction et sauvegarde privée.
- Migrations : `catalogue_admin_cycle`, `client_po_loop`, `shared_preview_null_decoration` ; prérequis Pro V2 conservés.
- `scripts/catalogue-seed.mjs` : transfert reproductible et idempotent des références publiques existantes, sans nouvelle certification ni écrasement.
- Workflow Pages : même commit construit en production et recette avec des backends séparés.

## Limites et retour arrière

- Les imports ne calculent pas de couleur depuis une photo et ne fusionnent pas automatiquement les doublons.
- L’image publique reste dans la validation Pro existante. Le lecteur anonyme du catalogue n’expose pas les chemins des images privées.
- Les snapshots de Collection conservent leurs valeurs et leur provenance historiques. Pour reprendre une correction centrale, sélectionner à nouveau la référence ; aucun changement silencieux de couleur possédée.
- Les brouillons doivent être enregistrés avant de quitter l’Atelier. Un dessin trop volumineux est refusé proprement avant partage.
- Pas d’achat sponsorisé, de classement commercial, de CRM ni de paiement salon.
- Rollback : désactiver `VITE_CATALOGUE_ADMIN_ENABLED` et `VITE_PO_LOOP_ENABLED`, reconstruire la Web App ; conserver les migrations et les données. Une référence peut être archivée et un import non modifié annulé. Ne pas supprimer les tables pour revenir à l’interface précédente.
