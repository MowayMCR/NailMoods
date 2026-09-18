# NailMoods — Beta Readiness Web, 18 septembre 2026

## État initial et diagnostic

Base : main, commit 7a9e90b69bab302a355966494d6e225d5328fa3b. Application React/Vite publiée sur GitHub Pages. Les 116 tests existants passent avant modification.

Le blocage a été reproduit dans le navigateur externe sur le lien public. Au premier accès, le profil affiche Marie et une collection d’exemple contient deux semi-permanents et un effet, sans lampe. Créer reste accessible, mais le bouton de génération disparaît : le moteur exclut les semi-permanents sans lampe renseignée. La raison précise est dissimulée dans une rubrique repliée ; le message principal est générique.

L’inspection du chemin de génération confirme un moteur local synchrone, sans requête API, authentification, rôle propriétaire, fonction serveur ni secret. La collection, le profil, les idées, les tutoriels et le journal utilisent localStorage. Aucune dépendance propriétaire n’intervient dans la génération. Les imports URL et la reconnaissance ont leurs dépendances distinctes, conservées. GitHub Pages publie un bundle identique pour les visiteurs ; la différence pertinente est l’inventaire enregistré dans chaque navigateur. Le contenu du navigateur de la créatrice n’a pas été consulté.

Ce diagnostic explique un blocage reproduit ; il ne prouve pas que chaque témoignage externe provient du même cas.

## Corrections

- Nouveau profil sans prénom prérempli et collection initiale vide. Les données déjà enregistrées ne sont ni effacées ni migrées.
- Action « Générer une idée » clairement nommée dans la collection et la génération.
- Si une lampe ou un aimant manque, question directe et action explicite « J’ai… » pour enregistrer le matériel réellement déclaré. Aucun matériel n’est inventé automatiquement. Les règles du moteur et les représentations validées sont conservées.
- Journal : correction d’un libellé observé pendant le test, qui classait visuellement les vernis comme « Autre matériel ». Le type enregistré est conservé.
- Accès différé à localStorage : un navigateur refusant le getter ne fait plus planter le démarrage. Une écriture refusée reste signalée, jamais présentée comme sauvegardée.
- Aides contextuelles pour accueil, collection, génération, inspirations/moodboards, journal, profil et tutoriels. Deux ou trois étapes, icônes, Suivant, Précédent, Passer, Terminer, fermeture et swipe tactile.
- Première visite : petite invitation non bloquante, aucune ouverture forcée de modale. Après passage ou fin, plus de proposition automatique. Bouton (?) toujours disponible.
- Suppression de plusieurs encarts permanents redondants dans Collection, Créer, Profil et le choix d’import. Les erreurs, états vides et indications liées aux produits sont conservés.

## Instrumentation

Clés locales nm-help-v1:<screen>_help_seen. Cette version n’a pas de comptes serveur : le périmètre utilisateur correspond au profil local de ce navigateur. Aucun suivi entre appareils.

Événements locaux help_opened, help_completed et help_skipped avec screen, source (first_visit ou button), slide (base 1), step (overview/detail/entry), timestamp. Maximum 200 événements dans nm-help-events-v1. Aucun nom, identifiant de compte, contenu de collection, URL de fiche ou donnée personnelle ajoutée. Pas de transmission distante. Une agrégation des retours de plusieurs testeuses reste à raccorder ultérieurement.

## QA — BETA FIRST TIME USER

Navigateur externe au projet, aucun compte ou donnée de la créatrice. Premier affichage sans prénom, collection vide, zéro favori et zéro pose. L’inspection de la version précédente avait pu enregistrer les choix par défaut du générateur dans ce même navigateur ; il ne s’agit donc pas d’une certification d’un profil navigateur strictement neuf sans aucune clé NailMoods. Un vrai essai privé sur téléphone reste nécessaire pour ce critère strict.

Parcours public effectué :
1. Accueil et action Ajouter mes produits accessibles sans aide obligatoire.
2. Ajout manuel de trois semi-permanents : Cassis bêta #813c60, Vert bêta #356a59, Sable bêta #efce9d.
3. Collection retrouvée après rechargement.
4. Ouverture de la génération : demande de lampe explicite.
5. Déclaration de la lampe depuis ce même écran, puis génération de quatre propositions réelles.
6. Ouverture du trio, lecture de la répartition et sélection de l’annulaire : Vert bêta.
7. Ajout aux favoris, retour aux favoris et rechargement : inspiration conservée avec ses trois produits.
8. Aide revue via (?), Suivant jusqu’à Terminer ; après rechargement, absence de proposition automatique. Passage des aides collection/génération vérifié également.
9. Pose marquée comme faite, ajout au journal et vérification après rechargement.

Tests automatisés : les 116 tests existants et trois nouveaux tests couvrant première génération avec matériel déclaré et teintes exactes, sauvegarde de favori, mémorisation/instrumentation bornée de l’aide, stockage refusé. Build de production réussi. Le workflow GitHub Pages exécute toute la suite avant déploiement.

## Vérification visuelle et limites

Mini-aide inspectée en navigateur : carte lisible, progression et boutons visibles, style existant conservé. L’application garde son format de 430 px de large ; le navigateur de test a un viewport desktop de 1363 × 936. Le rendu de la colonne mobile est observé, mais cela ne remplace pas un test de viewport mobile réel, clavier tactile, swipe, paysage, Safari iOS ou Chrome Android. Ces vérifications ne sont pas déclarées réussies.

Les fonctions URL/photo/scan/stickers et moteur existant sont conservées et couvertes par leurs tests antérieurs ; les permissions caméra et imports fournisseurs n’ont pas été retestés sur téléphone dans cette passe. Les restrictions CORS des boutiques restent celles de la version précédente. Sauvegarde locale uniquement : effacer les données du navigateur supprime la collection et les créations de cet appareil.

## Fichiers modifiés

src/main.jsx ; src/CreateView.jsx ; src/HomeView.jsx ; src/ProfileView.jsx ; src/profileOptions.js ; src/JournalView.jsx ; src/ContextHelp.jsx (nouveau) ; src/help.js (nouveau) ; src/help.css (nouveau) ; src/storage.js (nouveau) ; tests/beta-first-time.test.js (nouveau) ; BETA_READINESS.md (nouveau).

## Verdict

Parcours externe fonctionnel observé, correction ciblée déployée sur le lien GitHub Pages existant. Validation bêta finale encore ouverte : session strictement vierge et essais tactiles sur téléphone, puis retour d’une personne découvrant réellement le produit sans accompagnement. Aucune refonte ni application native engagée.
