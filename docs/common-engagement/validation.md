# Premier lot commun — validation

## Réalisé

- Profil : carte « Mon planning » avant les autres modules, prochaines échéances depuis `pose_plan_items`, accès au calendrier complet et aux projets ; gestion chargement/échec/réessai.
- Profil : « Ton NailMoods » privé à partir des favoris et poses existants ; pause respectée, action temporaire « Sortir de ma bulle ».
- Avec ma collection : contexte réel, filtre strict sur les besoins identifiés, plafond de trois couleurs, redécouverte selon l’historique produit, classement existant enrichi sans nouveau générateur.
- Inspiration et Journal : adapter aux références actuelles/teintes proches, voir les remplacements et leurs limites, ouvrir une variante privée. Si les données sont insuffisantes, aucun faux remplacement.
- Inspiration : « Garder dans mes projets » réutilise l’import idempotent vers `pose_projects`. Mes poses et Profil donnent accès à ces projets.
- Favori et produit retiré : notice avec annulation de 15 secondes, prolongée au focus/survol. Restauration ciblée et conflit explicite, sans rétablir tout un ancien état.
- Marges de la création et DA06 préservées, quatre moods testés. Navigation à cinq onglets inchangée.

## Tests exécutés

`npm test` : **535 tests, 533 réussis, 2 ignorés, 0 échec**. Inclut les huit nouveaux tests du lot et les tests existants SQL de droits, isolation, révisions, cascade projets/planning/rappels, Journal, Pro et IA+.

`node scripts/test-common-engagement-browser.mjs` : application partagée `App` et vrais composants exécutés dans Chromium, stockage de compte simulé localement et projets/planning dans PGlite avec migrations/RLS existantes. Données de démonstration. Le harness remplace uniquement le montage racine et les transports externes, pas les composants métier.

Parcours vérifiés :

- Profil aux largeurs 320/360/390/430, quatre moods.
- Profil → Planning → création d’une date → rechargement SQL → date visible dans le Profil.
- Échec réseau de Planning → dates anciennes retirées → Réessayer → données récupérées.
- Options Collection → rechargement → mêmes choix, préférences permanentes inchangées ; absence de débordement aux quatre largeurs.
- Double-tap → une seule modification de favori, sans ouverture parasite de fiche.
- Inspiration → adaptation → variante réelle → `pose_projects` → reprise après rechargement.
- Retrait favori → Annuler → favori conservé après rechargement.
- Profil/Planning Free, Plus et Pro ; adaptation Collection refusée en Free.
- Collection vide → action immédiate d’ajout.
- Aucune erreur JavaScript dans ce parcours.

Build Web recette : réussi. Avertissement de bundle volumineux toujours présent, non résolu par ce lot. Pas d’AAB ni d’IPA générés.

## Captures

Voir `evidence/` : Profil complet dans les quatre moods, zooms Planning, Collection enrichie, adaptation, projet, Mes poses, annulation et état vide. Toutes proviennent de l’application exécutée. Les dates, le compte et les produits sont des fixtures ; ce ne sont pas des contenus de bêta-testeuses.

## Limites explicites

- Aucun nouveau test d’authentification réel en recette hébergée ni de synchronisation multi-appareil pour ce lot. Le stockage du shell est simulé dans le test navigateur ; les révisions/RLS du Planning sont testées en SQL.
- Tests navigateur de modification/suppression d’une date, cascade de suppression projet, conflits et isolement reposent ici sur la suite SQL existante ; le nouveau parcours navigateur teste la création et la reprise.
- Le filtre strict est volontairement prudent : les techniques dont la décomposition reste partielle peuvent être écartées même si la personne possède le matériel.
- Redécouverte : fondée sur les produits renseignés dans le Journal, jamais sur une preuve fictive d’usage.
- La comparaison de teinte n’atteste pas une compatibilité chimique, et l’opacité inconnue reste signalée.
- Pas de test réel d’haptique, permission caméra, notifications arrière-plan, export natif Apple/Android ou OAuth/deep link natif dans ce lot.
- Boucle complète cliente→PO→Atelier→réponse, signature Pro, récap mensuel, nouveaux agrégats, catalogue central, workflow partenaire et back-office : **non livrés dans ce premier lot**, restent dans l’audit et les lots suivants.
- Les captures cliente→PO demandées seront fournies avec le lot de cette interaction, pas simulées comme une nouvelle fonction terminée.

## Publication et retour arrière

Branche dédiée `feat/common-engagement`, proposée en PR brouillon au-dessus de Pro V2. Le workflow construit un sous-chemin recette `validation-pro-v2` et conserve la racine depuis `main` inchangée. Le déploiement doit respecter la protection existante de l’environnement GitHub Pages ; aucun élargissement de règle d’accès n’est fait implicitement.

Aucune migration nouvelle. Rollback : restaurer la révision précédente de la branche de validation. Les données créées restent dans les objets compatibles existants. Aucune suppression de données nécessaire.

Contrôle GitHub du 5 octobre 2026 : le run `37351044249` a réussi les tests, le build recette et la préparation de l’artefact. Le déploiement a été refusé explicitement : la branche `feat/common-engagement` n’est pas autorisée par les règles de protection de `github-pages`. La Web App hébergée n’a donc pas encore reçu ce lot. Capture du refus : `evidence/github-pages-blocked.jpg`. Aucun changement de protection effectué ; une autorisation temporaire et limitée à cette branche est demandée avant publication.

### Publication confirmée après accord de Marie

Le 5 octobre 2026, après son accord explicite, la règle exacte `feat/common-engagement` a été autorisée temporairement. La tentative 2 du run `37351044249` a terminé avec succès (build et déploiement). La règle temporaire a ensuite été retirée : seule `main` reste autorisée. Captures : `evidence/github-pages-protection-restored.jpg` et `evidence/profil-web-publie.jpg`.

Version de validation vérifiée : https://mowaymcr.github.io/NailMoods/validation-pro-v2/#profil . Le Profil publié affiche effectivement « Mon planning » et « Ton NailMoods ». Vérification hébergée faite en mode découverte, avec demande de connexion pour le Planning ; aucun parcours authentifié supplémentaire n’est revendiqué. Sources applicatives publiées : `18a60af0f13200c9015ad64475d413494c7eb11e`. Les commits suivants de cette branche ne changent que la documentation et les preuves. Aucune fusion vers main, aucune propagation Store, aucune migration Supabase durant cette publication.

### Correctif Réglages — retour mobile du 5 octobre, après publication

Le retour de Marie montre des champs sans mise en forme DA06 et un titre sans marge. `ProfileView.jsx` réutilise désormais `nmField` pour le prénom et la bio ; les styles partagés du Profil fixent les marges du titre, l’espacement, la largeur des champs, les surfaces thémées et le focus. Le libellé de la bio reste stable pour les lecteurs d’écran même après rechargement d’un texte enregistré.

Vérification ciblée de l’application exécutée : 320/360/390/430 px × quatre moods, titre à au moins 16 px des bords, libellé au-dessus du champ, champs pleine largeur sans débordement ; prénom et bio conservés après rechargement en mode découverte, aucune erreur JavaScript. Script : `scripts/check-profile-settings-layout.mjs`, résultats : `evidence/reglages-checks.json`, captures `reglages-*.png`. Aucun test authentifié ou natif supplémentaire. Ce correctif de code est sauvegardé séparément et **n’est pas encore publié** ; la version hébergée reste celle indiquée ci-dessus.
