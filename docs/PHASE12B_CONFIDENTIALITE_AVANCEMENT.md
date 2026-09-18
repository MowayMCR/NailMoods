# Phase 12A / 12B — état vérifiable du lot

18 septembre 2026. Application : NailMoods. Projet : rvqmtnqvzzxzwfxfyjcg.

**Ce lot ne valide pas la Phase 12A ou 12B.** Les préparations de confidentialité et d’identité sont conservées dans une branche de travail du produit existant. Aucun site bêta parallèle. La version publiée n’est pas remplacée par des écrans dépendant de migrations non déployées.

## Réellement appliqué et vérifié sur Supabase

Audit du trigger d’inscription existant : crée profil, espace personnel et membership owner ; `account_tier` défaut free. Aucun profil/workspace créé par le frontend d’inscription. Base Auth vide au contrôle : aucun compte réel confirmé testé.

Migration appliquée `restrict_conversation_identity_and_pro_verification` :
- une utilisatrice ne peut plus déplacer sa ligne de membership de conversation vers un autre fil ; seule la date last_read_at reste modifiable ;
- impossible de créer soi-même un profil Pro avec is_verified=true ;
- l’auto-promotion account_tier était déjà interdite, et le reste.

Copie exacte : phase12/security-column-privileges-applied.sql. Aucune table recréée et aucune RLS désactivée. Trois requêtes SQL sous rôle authenticated ont confirmé le refus des colonnes interdites. Contrôle des privilèges : édition préférences, lecture effectuée et nom Pro autorisés ; tier, identité de membership et badge vérifié interdits. Conseiller sécurité : aucune alerte retournée. Ces contrôles **ne sont pas** les tests d’isolation réels entre comptes.

## Confidentialité & consentements — code préparé

- Profil → Confidentialité : choix, publicité, données, export, suppression à confirmation saisie, liens publics vers documents.
- Case CGU initialement décochée et obligatoire à l’inscription. Contrôle également dans le service Auth avant appel SDK.
- Contrat serveur préparé : historique append-only `user_consents`, dates serveur, UUID propriétaire issu de auth.uid(), version des textes, flags séparés. Lecture propre via RLS, pas d’écriture directe client. Un trigger séparé enregistre et exige l’acceptation initiale sans remplacer le trigger existant.
- `terms_version` et `privacy_version` : **0.1-beta, brouillons non définitifs**. Textes archivés en HTML autonome consultable sans compte. Pas de partenaire inventé.
- Guest : choix locaux séparés ; Auth transmet la déclaration initiale, serveur n’infère jamais une autorisation publicitaire de l’inscription. Aucun fournisseur facultatif actif : toutes les options restent false, y compris après « Tout accepter » ; l’écran l’explique. Tout nouveau fournisseur impose une notice et une activation explicites.
- Free : génération inchangée après refus. Plus/Pro : permission publicitaire toujours false. Ads également exclues des espaces Pro, scan, tutoriel, journal, profil et conversations. Aucun SDK publicitaire ni faux encart chargé.
- Les statistiques locales d’usage scan/aide sont arrêtées sans fournisseur ni consentement. Les marqueurs d’aide déjà vue et diagnostics techniques limités ne servent pas au ciblage.
- Export préparé : JSON paginé, filtres d’appartenance explicites, profil, espaces/memberships propres, produits, stickers, matériel, inspirations, journal, favoris, profil Pro, suivis, consentements, messages envoyés. Copie locale en attente distincte ; pas de token/mot de passe/export global de profils publics. Nouvelle vérification du compte avant téléchargement.
- Suppression préparée : confirmation SUPPRIMER, session serveur active, transaction atomique, verrouillage des espaces, blocage si autres membres sans transfert, refus si fichiers Storage nécessitant nettoyage. Cascades existantes, fermeture du store, purge des caches de ce compte seulement, logout et rechargement. Aucun compte réel supprimé/testé dans ce lot.

**Non appliqué :** phase12/privacy-consents.sql. Les écrans connectés, la persistance des choix et la suppression ne sont donc pas actifs sur le site publié. Aucune nouvelle demande d’acceptation automatique aux utilisateurs existants avant validation des textes.

## NailMoods ID et recherche — code préparé

Normalisation, suggestion à partir du nom, disponibilité indicative, édition et validation explicite, réservés courts, index uniques insensibles à la casse. Les UUID sont inchangés. Visibilité défaut Pros, avec Personne appliqué dans la requête serveur. Recherche limitée aux champs publics, profils Plus visibles et workspaces Pro publics ; aucune projection email/journal/collection. Ordre exact @ID → préfixe → nom exact → partiel, filtres type/ville. Erreur réseau lisible, aucune fausse liste de profils.

**Non appliqué :** phase12/public-identities.sql. Ces requêtes ne sont pas déclarées testées sur des utilisateurs réels. La création/édition du handle de workspace, l’aperçu public, les avatars Storage, les favoris Pro et les actions de partage/message restent à compléter. La structure SQL seule n’est pas une fonctionnalité livrée.

## Vérifications

- 205 tests automatisés réussis ; Auth/service et stockage utilisent des simulations, pas de preuve RLS.
- Tests ajoutés : consentement obligatoire, refus par défaut, publicité/personnalisation séparées, retrait, offres sans pub, écrans exclus, pas de contenu privé dans le contexte pub, version obsolète, purge de cache isolée, confirmation suppression, normalisation/réservés/rang de recherche, pagination export, changement de compte pendant export et relecture des consentements après reconnexion.
- Build Vite réussi. Avertissement existant sur taille du bundle, pas d’erreur.
- `git diff --check` sans erreur.
- Runner distant renforcé pour données A/B (produits, stickers, matériel, inspiration, journal, workspace, membership, conversation, messages ; lecture/écriture/suppression), contrôles positifs, auto-promotion et auto-adhésion. Seul un refus 42501 ou zéro ligne vaut refus ; une panne réseau ne passe plus le test. Fixtures nettoyées. **Non exécuté : comptes confirmés manquants.**
- Pas de recette visuelle navigateur des nouveaux écrans, de téléphone physique, de double navigateur, de confirmation email, d’export compte réel ou de suppression compte réel.

## Conditions restantes pour publier ce lot

1. Identité juridique/contact confidentialité de l’éditeur et durées à confirmer ; valider les documents définitifs. Aucun texte brouillon ne doit devenir silencieusement des CGU finales.
2. Décider l’âge minimum d’accès et les règles applicables à la messagerie.
3. Décider la suppression ou anonymisation des messages/conversations après suppression du compte. Le schéma actuel fait des suppressions en cascade.
4. Appliquer les scripts avec outil migrations, puis tester droits, transactions, versionnage, signup et export/suppression en environnement prévu pour ces tests ; publier code et documents compatibles ensemble.
5. Créer les trois comptes par l’app publiée avec coordonnées de test et saisie sécurisée, recevoir/confirmer les emails ; attribution Plus/Pro administrative uniquement.
6. Exécuter RLS, migration réelle, persistance multi-navigateur et recette téléphone. Ne pas passer artificiellement ces cases.
7. Achever les autres blocs 12B listés dans PHASE12B_CADRAGE_BETA.md, en particulier le cycle Institut, les entitlements et les protections de messagerie.

## Avant Phase 13

12B n’est pas fermée. Le packaging attend les validations ci-dessus, Storage privé et effacement photos, les parcours Pro/Plus complets, la gestion Institut, la modération et les notifications internes. QR code et lien court sont facultatifs et non implémentés. Aucun paiement, réservation ou CRM ajouté.

## Références de conception consultées

- CNIL : https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi — distinguer CGU, fonctionnement nécessaire et consentements facultatifs ; retrait accessible.
- Supabase : https://supabase.com/docs/guides/auth/managing-user-data — trigger, suppression Auth, JWT et objets Storage.
- Supabase : https://supabase.com/docs/guides/database/postgres/column-level-security — grants par colonne après révocation des grants de table.
