# ACTIONS MARIE RESTANTES

La procédure chronologique complète et les champs Apple figurent dans `APPLE_SUBMISSION_STEPS.md` (41 étapes). Les documents de configuration ne sont pas des déclarations déjà enregistrées.

## BLOQUANT

1. **Apple Developer actif** : retrouver/créer Apple Account, 2FA, adhésion, équipe. Fournir seulement `<APPLE_TEAM_ID_A_FOURNIR>` et le statut actif. Compte et certificats restent sur le poste de Marie.
2. **Identifiant de l’app** : rechercher l’existant, confirmer `<BUNDLE_ID_VALIDE_PAR_MARIE>`. `com.nailmoods.app` est une recommandation issue d’Android, aucune inscription Apple n’a été vérifiée. Créer la fiche puis fournir `<APPLE_APP_ID_NUMERIQUE>`.
3. **Vente** : accepter Paid Apps Agreement, banque/fiscalité, choix de durée et prix. Créer le groupe NailMoods et les deux IDs exacts. Pro niveau 1, Plus niveau 2 ; Free sans produit. Confirmer ces valeurs non secrètes.
4. **Validation Apple serveur** : créer clé In-App Purchase, installer `.p8`, Key ID, Issuer ID, racines Apple et configuration exclusivement dans Supabase. Suivre `APPLE_SECRETS_REQUIRED.md`. Ne jamais donner la clé privée dans le chat. Confirmer seulement les noms installés et le projet.
5. **Mac et signature** : Xcode stable accepté pour l’upload, équipe de Marie, Automatic Signing. La CI fournit une preuve de compilation ; aucune IPA signée livrée. L’archive non signée, si produite par CI, ne remplace pas l’archive locale signée.
6. **URL publiques** : lever la protection du domaine officiel dans Netlify, publier les nouvelles routes confidentialité/conditions/support et tester sans session. Les anciennes pages GitHub ne suffisent pas à rendre actuels les textes sur le domaine officiel.

## À FAIRE AVANT TESTFLIGHT

1. Choisir backend Recette pour le premier build, avec le Bundle final validé ; ne pas créer deux fiches Apple par défaut. Installer les secrets Recette, activer Apple settings et renseigner le cron de réconciliation. Les fonctions Apple Recette sont déjà déployées mais restent désactivées.
2. Configurer les URL Server Notifications V2 Sandbox/Production selon le backend du build ; lancer la notification Apple TEST puis contrôler sa réception. Ne pas envoyer un webhook Production vers Recette par erreur.
3. Créer comptes Sandbox Apple et comptes NailMoods de test 18+. Autoriser Sandbox dans le mapping serveur pour ces comptes seulement. Le prochain build final devra utiliser Production et ses propres settings/secrets.
4. Déployer la migration UGC et `moderation-preview` en Recette avec les clients compatibles. Organiser la revue des photos, y compris les anciennes photos publiques mises en attente. Fournir au moins un compte staff opérationnel sans mettre son secret dans Git.
5. Déployer textes et migration privacy/terms coordonnés : privacy 0.8-beta / terms 0.6-beta dans cette branche. Les clients Android anciens continuent de fonctionner actuellement ; ne pas leur imposer la nouvelle version serveur sans publier le client correspondant.
6. Tester email de confirmation/récupération via les schémas Auth, photo système/caméra, clavier, partage export, liens, navigation et compte Free sur un vrai iPhone. Tester VoiceOver, tailles de texte et petits/grands iPhone.
7. Exécuter tous les cas A–S Sandbox et la matrice sociale dans `APPLE_TEST_RESULTS.md`. Capturer preuves datées et vérifier les écritures Supabase, pas seulement le toast StoreKit.
8. Faire une suppression avec un compte jetable contenant vrais médias, journal, messages, favoris et identité analytics ; vérifier objets Storage, Auth, sessions et anonymisation. Gérer/résilier l’abonnement dans Apple séparément.
9. Vérifier l’exécution du cron médias et l’absence de jobs échoués. Le cron a été installé dans Production où il manquait ; les contrôles HTTP négatifs et le nonce une fois ont été vérifiés, pas un effacement E2E de blob.
10. Faire révoquer les ACL publiques pg_net par le propriétaire des objets/Supabase support, car postgres n’avait pas la permission effective. Retirer/renouveler l’ancien secret de nettoyage côté coffre/console ; la nouvelle Edge ne l’accepte plus.
11. Activer la protection des mots de passe compromis dans Supabase Authentication, selon le plan disponible. Vérifier configuration SMTP, capacité d’envoi et livraison des emails.
12. Créer groupes TestFlight internes/externes, remplir les informations Beta Review et distribuer d’abord à l’interne. Aucune invitation n’a été envoyée pendant cette mission.

## À FAIRE AVANT APP REVIEW

1. Confirmer identité professionnelle, date réelle de commercialisation, adresse, téléphone DSA, justificatifs, copyright et contact App Review. Les données absentes restent des placeholders ; finaliser la médiation et les informations commerciales applicables.
2. Confirmer sous-traitants et contrats effectifs (Supabase, hébergement domaine, email), localisation/transferts/sauvegardes et conservation. Le code ne peut vérifier les contrats privés des fournisseurs.
3. Activer et superviser la rétention support 3 mois après clôture et signalements 12 mois, avec holds applicables et worker Storage contrôlé. Le paramétrage ne prouve pas une purge effective. Déployer la rétention analytics uniforme 24 mois puis vérifier un dry-run.
4. Déployer la version finale sur Production, conserver Google et manuel, relire le diff/migrations et revalider Android. Ne pas confondre build Recette et build final. Ne pas activer de paiement alternatif UE.
5. Saisir App Privacy ligne par ligne, Age Rating factuel (UGC/messagerie Oui, déclaration 18+), DSA et export compliance. Ne pas certifier d’exemption de chiffrement ou d’accessibilité sans validation appropriée.
6. Inspecter rapport Privacy de l’archive et manifests/signatures des SDK transitifs. Contrôler absence de secrets et de permissions supplémentaires dans le binaire Release signé.
7. Capturer les écrans requis (iPhone et abonnements) avec données fictives. Relire nom/sous-titre/description/mots-clés et les URL réellement publiques.
8. Créer les comptes de démonstration : Free pour paywall, accès manuel pour fonctionnalités, destinataire social et comptes jetables pour suppression. Renseigner identifiants uniquement dans Review Information et tester leur connexion sans OTP qui bloquerait Apple.
9. Archiver/signature/upload, sélectionner le build, rattacher Plus et Pro à la première version, coller les notes de review finalisées. Retirer tous les placeholders avant Add for Review / Submit to App Review.
10. Choisir publication manuelle. Répondre aux éventuels rejets avec corrections et preuves ; publier uniquement après approbation et recette finale Production.

## OPTIONNEL

- Produits annuels/offres introductives après décision et mapping supplémentaire ; ne pas modifier les IDs mensuels pour leur donner plusieurs durées.
- Universal Links, notifications push, Sign in with Apple seulement si ajout de la fonctionnalité correspondante.
- Accessibilité déclarée dans Apple après mesures et tests complets ; iPad/Mac/Vision uniquement après support et recette.
- Revue exhaustive de l’historique Git par un outil de détection de secrets, et contrôle de charge du cron avant volume élevé.

## Informations à redonner ensuite

Team ID, Bundle ID validé, Apple ID numérique, groupe/produits/niveaux, durée/prix, projet backend choisi, noms de secrets installés, état contrats/DSA, liens publics et résultats Sandbox expurgés. Jamais mots de passe, `.p8`, service role ou clés privées.
