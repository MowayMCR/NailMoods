# Phase 12A — raccordement en cours, non activé

18 septembre 2026. Ce document remplace les prérequis périmés de PHASE12_PREPARATION.md : le projet Supabase existe déjà. Ne pas créer un autre projet ni recréer les tables.

## Réalisé

- Dépendance @supabase/supabase-js épinglée à 2.116.0, lockfile conservé.
- src/cloud/config.js : configuration publique facultative en mode invité, refus des clés serveur, retours auth sur le chemin GitHub Pages sans conflit avec le routeur hash.
- src/cloud/client.js : client unique, session persistante, renouvellement, PKCE, échange de code explicite prévu avant montage.
- src/cloud/auth.js : services inscription, connexion, déconnexion locale, restauration, récupération, changement du mot de passe, abonnement aux changements de session. Aucun insert de profil/espace, aucune attribution de plan.
- .env.example : paramètres publics du projet fourni.
- phase12/audit-existing-schema.sql : requête en lecture seule pour obtenir colonnes, contraintes, RLS, policies, grants et triggers. Non exécutée, aucune migration SQL.

Ces modules ne sont pas encore importés dans l'interface. Le stockage de la V1 et les flux validés restent inchangés. Aucune donnée locale n'a été transférée.

## Vérifications

- Auth settings accessible : email activé, confirmation email requise, fournisseurs sociaux désactivés.
- Lecture REST user_products avec select=id et limit=0 : HTTP 200. Cela ne prouve ni la présence de données ni l'isolation RLS.
- Inspection OpenAPI refusée avec la clé publique (HTTP 401).
- Connecteur Supabase installé mais outils SQL absents de cette session ; serveur MCP joignable (401 non authentifié).
- 175 tests automatisés réussis, dont 5 tests du socle Auth/configuration avec client simulé ; build Vite réussi, avertissement de taille de bundle existant.
- Aucune inscription réelle, récupération email ou validation RLS intercomptes effectuée. Aucun test téléphone ajouté.

## Blocage et reprise

Reconnecter le connecteur Supabase et recharger la session pour exposer ses outils de lecture SQL. Alternative : fournir l'export de la requête audit-existing-schema.sql. Aucun mot de passe ou secret serveur n'est nécessaire dans la conversation.

Il faut connaître le schéma réel avant de mapper et synchroniser profil, produits, stickers, matériel, inspirations, journal et favoris. Ne pas supposer des colonnes metadata, user_id, workspace_id ou des clés uniques non vérifiées.

À poursuivre : interface Auth, chargement du profil/espace créés par trigger, cache isolé par compte/espace, écritures ciblées avec reprise des erreurs, migration consentie et idempotente conservant la copie locale. Vérifier les URL de retour et la livraison des emails. Valider avec comptes Free/Plus/Pro et essais A/B d'accès interdit avant activation publique.

La Phase 12A n'est pas terminée. La Phase 12B n'est pas commencée.

Documentation consultée :
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession
