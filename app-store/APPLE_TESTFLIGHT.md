# TestFlight — procédure de test

1. Achever les étapes compte/identifiant/produits/secrets/signature du guide Marie. Ne pas acheter en Production pour simuler Sandbox.
2. Faire le premier binaire sur backend Recette avec le Bundle ID de la fiche Apple de test choisie. Une même fiche finale peut d’abord recevoir un build relié à Recette, puis un nouveau build relié à Production. Toujours contrôler le nom et mobile-build.json. Ne jamais soumettre à l’App Store un build Recette.
3. Créer des comptes NailMoods de test distincts, confirmés 18+, CGU à jour : Free achat, Plus manuel, Pro manuel, social A/B, suppression jetable. Autoriser Sandbox côté serveur pour les comptes achats. Une invitation manuelle ne doit pas masquer le paywall du compte Free.
4. Créer un Sandbox Apple Account dans Users and Access → Sandbox → Testers → +. Utiliser une adresse de test adaptée et configurer région et paramètres d’abonnement. Ce compte est distinct du compte NailMoods.
5. Upload Xcode → Organizer → Distribute App → App Store Connect → Upload. Attendre le traitement ; compléter export compliance.
6. Apps → NailMoods → TestFlight → Internal Testing → + groupe `NailMoods interne`. Ajouter le build et les personnes habilitées dans Users and Access. Installer TestFlight sur un iPhone puis accepter l’invitation.
7. Test Information : email contact@nailmoods.com ; description issue de la fiche ; coordonnées et login de test fournis directement dans Apple. What to Test : texte ci-dessous. Vérifier l’absence de vrais contenus personnels dans les fixtures.
8. Tester le paywall et un achat Sandbox. Relever transaction ID, environnement, tier et date serveur, sans exporter le JWS complet ni clé. Le build TestFlight utilise les achats Sandbox ; les cadences peuvent être accélérées. Ne pas écrire les délais comme s’ils étaient des mois réels.
9. Tester annulation encore valide, expiration, grâce (si activée), billing retry, remboursement/révocation, upgrade/downgrade, restauration, réinstallation, deuxième iPhone, panne serveur, reprise Transaction.unfinished, notification hors session et toutes les lignes A–S du rapport.
10. Vérifier qu’un compte manuel ne perd pas son accès et qu’un Google actif sur le même backend donne accès sur iPhone sans CTA d’achat externe. Pour l’inverse, reconnecter Android au même compte/backend Apple valide.
11. External Testing → + groupe `NailMoods externe`. Ajouter le build, renseigner les informations demandées et soumettre à Beta App Review lorsque demandé. Inviter les testeuses après autorisation ; ne pas publier un lien ouvert avant validation du groupe et du backend.
12. Chaque build TestFlight a une durée de disponibilité limitée (actuellement 90 jours). Surveiller les expirations et upload un build avec un nouveau numéro. La première soumission externe et les builds App Store font l’objet de procédures différentes.
13. Répéter les tests critiques sur un build Production encore en TestFlight, avec Sandbox limité aux comptes de test, avant de sélectionner ce build pour App Review.

## What to Test — texte prêt à adapter

NailMoods : tester connexion 18+, import photo et caméra, scan produit, création d’une inspiration, Journal, publication d’une photo après modération, Découvrir, connexions et messages, signalement et blocage. Dans Profil → Mon offre, vérifier prix/durée Apple, achat Plus/Pro, restauration et gestion. Les achats de ce build sont en Sandbox ; vérifier que les droits ne s’ouvrent qu’après validation serveur. Tester clavier, encoche et petits/grands iPhone. Signaler l’écran concerné et le message d’erreur, sans mot de passe ni photo personnelle. La suppression doit être testée uniquement avec un compte jetable et n’annule pas un abonnement.

Sources : [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [abonnements dans TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/).
