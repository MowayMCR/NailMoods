# Phase 12A — intégration application, validation serveur encore requise

18 septembre 2026. Projet existant NailMoods : rvqmtnqvzzxzwfxfyjcg. Le schéma fourni par Marie est utilisé. Aucune table, trigger, policy ou règle RLS modifié. Phase 12B non commencée.

## Architecture et comportement

- `src/cloud/client.js`, `config.js`, `auth.js` : client central @supabase/supabase-js 2.116.0, configuration publique, inscription email/mot de passe, connexion, déconnexion de cet appareil, restauration, récupération et modification du mot de passe. PKCE et retour sur `/NailMoods/?auth=callback` ou `?auth=recovery`, puis route hash Profil. Lien email à ouvrir dans le navigateur qui a émis la demande.
- `AccountRoot.jsx`, `account.css` : accès compte discret, formulaire, confirmation email, état de synchronisation, erreur/réessai, import invité facultatif, export d’une copie en attente et rechargement explicite du distant. Aucun sélecteur de plan.
- `repository.js` : session serveur vérifiée ; profil chargé par son ID Auth, espace personnel sélectionné parmi les memberships existants et les espaces possédés. Aucune création frontend de profil/espace. Lectures paginées et filtrées, écritures ciblées, contrôle des retours et comparaison avant écrasement. Comparaison atomique du JSON existant pour les mises à jour.
- `mapping.js` : produits, stickers et matériel répartis dans les trois tables. HEX réel prioritaire, catalogue ID, référence, barcode conservés. Métadonnées complètes dans `metadata.nailmoods`. Le champ source utilise le défaut de la base ; la provenance précise de l’import reste conservée dans metadata. Une copie utilisateur n’est pas promue vérifiée par le navigateur.
- Inspirations : snapshots complets privés, favoris dans `favorites`, aucun accès Pro public ajouté. Journal : snapshot indépendant, produits, photo, note, date et lien vers l’inspiration si déjà sauvegardée.
- Préférences et progression du tutoriel sous `profiles.preferences.nailmoodsProfile` et `nailmoodsExtras`, en préservant les autres entrées. Les photos actuelles restent dans les champs/snapshots privés sous leur forme existante ; aucun bucket public créé.
- `store.js`, `StorageContext.jsx` : cache et opérations en attente liés à userId/workspaceId. Les composants capturent le stockage de leur compte ; une ancienne session fermée refuse les callbacks tardifs. La copie invitée n’est jamais remplacée par les données du compte.
- Changements limités dans main, CreateView, HomeView, ScanGenerate, PolishPalette et Feedback : utilisation du stockage contextualisé. Algorithmes de génération, catalogue, palette et tutoriel inchangés.
- Workflow GitHub Pages : URL et clé **publique** injectées au build. Aucun secret serveur. Diagnostics limités à action/résultat/date, sans email, mot de passe, jeton ou contenu personnel.

## Migration et erreurs

Import proposé explicitement dans Mon compte avec compteur. Relecture du distant avant comparaison. Ajout uniquement des éléments absents : ID local, catalogue ID, barcode ou marque/référence/couleur pour les doublons évidents ; inspirations par clé, journal par ID. Les valeurs distantes existantes sont conservées. L’inventaire invité ne lit pas les sessions Auth ni les diagnostics.

La copie invitée reste intacte. Les opérations et leurs identifiants sont sauvegardés avant envoi. Une réponse perdue n’entraîne pas un nouvel insert si la même fiche est déjà présente. Marqueur de réussite `nailmoods_supabase_migration_done:<userId>:<workspaceId>` uniquement après épuisement des opérations. Échec réseau : données en attente, statut visible et réessai. Un changement concurrent provoque une erreur plutôt qu’un écrasement. L’utilisatrice peut télécharger la copie locale, puis confirmer le rechargement distant ; une sauvegarde locale supplémentaire est conservée.

Le premier chargement d’un compte nécessite le réseau pour vérifier la session et son espace. Ce n’est pas une application totalement hors ligne. Une autre fenêtre modifiant le cache exige un rechargement pour éviter un écrasement par une copie périmée.

## Vérifications effectuées

- 194 tests automatisés réussis, incluant les tests V1 existants et les cas mapping HEX/stickers, opérations ciblées, panne/reprise, quota, migration répétée/échouée, conservation journal/snapshots, caches A/B, ancienne session fermée, conflit et contrôles des requêtes SDK.
- Tests Auth et repository avec client simulé : ils ne prouvent **pas** la RLS du serveur.
- Build avec paramètres publics réussi (avertissement de taille du bundle, pas d’erreur).
- Requêtes réelles en lecture seule avec clé publique et limit=0 : colonnes fournies acceptées pour workspaces, workspace_members, user_products, user_stickers, user_equipment, inspirations, journal_entries, favorites. Profiles retourne HTTP 401 en mode anonyme. Ces contrôles ne sont pas des tests d’isolation.
- `scripts/test-cloud-isolation.mjs` préparé pour trois comptes dédiés confirmés Free/Plus/Pro. Il teste les profils/espaces, insert A et refus de lecture/écriture B sur produit, inspiration et journal ; workspace et message privé avec fixture. Nettoyage limité aux fixtures créées par le script. Il s’arrête explicitement faute de comptes : **aucun test RLS réel exécuté dans cette session**.

## Validation serveur restante — obligatoire avant fin de phase

Depuis une session Supabase administrative autorisée :
1. Vérifier les redirections Auth autorisées : `https://mowaymcr.github.io/NailMoods/?auth=callback` et `https://mowaymcr.github.io/NailMoods/?auth=recovery` ; Site URL : `https://mowaymcr.github.io/NailMoods/`.
2. Vérifier l’envoi email et la politique de mot de passe ; tester inscription/confirmation/récupération de bout en bout. Ne pas désactiver la confirmation pour contourner un problème de test.
3. Fournir trois comptes dédiés confirmés via environnement sécurisé du runner. Attribuer Plus/Pro uniquement côté administration. Vérifier que le trigger crée bien profil + espace + membership.
4. Exécuter les tests du runner et tester l’interdiction d’auto-promotion de plan, d’adhésion arbitraire à un espace/conversation et les accès aux photos privées. La RLS activée seule ne prouve pas ces règles.
5. Faire un vrai login/logout/relogin et essai dans deux navigateurs avec ajout, sticker, matériel, inspiration et journal. Vérifier les contraintes de colonnes, les droits UPDATE/SELECT/DELETE et les snapshots réels, notamment les filtres JSON atomiques.
6. Recette téléphone : scan caméra, première idée Free, produit inconnu, tutoriel, journal, fermeture/réouverture, compte et mode invité.

Phase 12A non déclarée validée tant que ces essais serveur et humains ne sont pas réalisés. Phase 12B : profils Pro publics, partage et messagerie restent hors périmètre de ce lot.

## Publication et recette navigateur

Déploiement GitHub Pages réussi après les 194 tests. Sur la version publiée : accueil accessible en invité, 10 produits/accessoires de test, 4 favoris et 2 souvenirs locaux toujours présents. Ouverture et fermeture du formulaire de compte vérifiées : champs email/password avec autocomplete, boutons de 48 px (fermeture 44 px), aucun débordement horizontal dans la colonne de 400 px du navigateur de contrôle. Après fermeture, Inspire-moi génère effectivement quatre propositions sans connexion. Ce contrôle utilise le navigateur de test existant ; il ne remplace pas une nouvelle session vierge sur téléphone.

## Complément du 18 septembre — accès administratif disponible

L’audit Supabase et la correction des droits de conversation/vérification sont maintenant réalisés. Les détails et distinctions entre vérifications réelles, simulations et scripts non déployés se trouvent dans `PHASE12B_CONFIDENTIALITE_AVANCEMENT.md`. Le runner d’isolation a été étendu et n’accepte plus une erreur réseau comme preuve de sécurité. Aucun compte confirmé n’existe au contrôle : la recette réelle et le passage de phase restent à valider.
