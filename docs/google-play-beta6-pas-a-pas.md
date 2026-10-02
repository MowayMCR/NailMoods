# NailMoods - du compte bancaire à la mise à jour Android

Guide du 2 octobre 2026. Destination : la bêta existante de NailMoods, pas une ouverture au public.

Le travail conservé a été repris. Le catalogue est intégré dans le code et les corrections Billing sont enregistrées sur la branche `feat/google-play-billing-beta6`. Aucun AAB final signé n'est encore livré. Les achats restent désactivés côté serveur jusqu'à la configuration et aux essais Google.

## 1. Les quatre choses à distinguer

| Élément | Utilité | Action de Marie |
| --- | --- | --- |
| Compte bancaire dédié | Recevoir les versements | Terminer l'ouverture et récupérer le RIB |
| Profil de paiement marchand Play Console | Donner à Google l'identité de l'entreprise et le moyen de versement | Créer ou terminer ce profil |
| Abonnements et forfaits de base | Définir Plus/Pro, les prix et les pays | Créer les produits ci-dessous |
| Compte de service Google Cloud | Permettre au serveur de vérifier les achats | Créer l'accès et enregistrer sa clé uniquement dans Supabase |

Tu gardes ton compte développeur Play Console actuel et l'application existante. Google Ads ne sert pas à cette configuration. Un nouveau compte Google personnel n'est pas nécessaire. Le compte de service est un accès technique, pas un compte bancaire.

## 2. Terminer le profil de paiement

1. Attends que ton compte bancaire dédié soit utilisable et récupère le RIB officiel.
2. Prépare les informations officielles de ton entreprise : identité légale, adresse, immatriculation et justificatifs demandés par Google.
3. Ouvre https://play.google.com/console/ avec le compte propriétaire de NailMoods.
4. Si tu ne vois pas NailMoods, vérifie le compte Google et le compte développeur sélectionnés.
5. Depuis les paramètres du compte développeur, ouvre **Profil de paiement**. Selon l'écran, il est rangé dans Monétisation.
6. S'il existe déjà un profil, ouvre-le pour le compléter. Évite d'en créer un second sans nécessité.
7. Sinon, choisis **Créer un profil de paiement**.
8. Utilise la France et les informations légales de l'entreprise telles qu'elles figurent sur les documents officiels.
9. Renseigne le contact, le site de NailMoods et `contact@nailmoods.com` pour le support.
10. Envoie le formulaire, puis traite les demandes de vérification visibles.
11. Dans la rubrique des versements, ajoute le compte bancaire dédié en recopiant le RIB.
12. Termine la validation bancaire selon les instructions affichées. Enregistre les modifications.
13. Remplis les éventuelles rubriques fiscales et déclarations demandées avec tes informations réelles.
14. Vérifie qu'aucune vérification obligatoire n'est encore en attente avant d'ouvrir les achats.

Résultat à conserver : un profil marchand associé au bon compte développeur et un moyen de versement validé. Aucun RIB, document d'identité ou secret ne doit être envoyé dans le chat.

## 3. Créer Plus et Pro

La première version accepte un forfait standard mensuel ou annuel par produit. Pour commencer simplement, ce guide utilise **mensuel**, sans essai ni promotion. Les prix restent ton choix : aucun prix n'a été inventé dans le code.

| Champ | Plus | Pro |
| --- | --- | --- |
| Identifiant produit exact | `nailmoods_plus` | `nailmoods_pro` |
| Nom affiché | NailMoods Plus | NailMoods Pro |
| Identifiant de forfait proposé | `monthly` | `monthly` |
| Type | Renouvellement automatique | Renouvellement automatique |
| Période | Tous les mois | Tous les mois |
| Prix | Ton prix Plus | Ton prix Pro |

15. Dans Play Console, ouvre **NailMoods**.
16. Ouvre **Monétiser avec Play → Produits → Abonnements**.
17. Si les deux produits existent, ouvre-les et vérifie leurs identifiants. Ne les recrée pas.
18. Sinon, crée le produit Plus avec l'identifiant exact du tableau, puis le produit Pro.
19. Renseigne des avantages correspondant aux fonctions réellement incluses. Évite « illimité », un essai ou une remise non implémentés.
20. Enregistre chaque fiche.
21. Pour chaque produit, ajoute un forfait de base `monthly`, à renouvellement automatique et mensuel.
22. Choisis le prix et les pays réellement visés. Vérifie la France et la devise EUR si tu démarres en France.
23. Lis les paramètres de grâce et de blocage, et conserve les valeurs souhaitées. Le code distingue ces deux états.
24. N'ajoute pas pour ce lot de prépaiement, paiement échelonné, essai ou offre promotionnelle.
25. Enregistre, puis active chacun des deux forfaits.
26. Vérifie que les deux forfaits affichent **Actif** et une disponibilité cohérente.
27. Si tu as déjà créé un autre identifiant de forfait, conserve-le et communique seulement cet identifiant à Work : le serveur sera configuré avec la valeur réelle.

Free n'a pas de produit payant. Les identifiants produit ne se renomment pas après création. Les prix affichés dans NailMoods proviennent de Google Play, dans la devise de l'utilisatrice.

## 4. Préparer les testeuses - deux listes différentes

28. Depuis les paramètres du compte développeur, ouvre **Tests de licence / License testing**.
29. Ajoute ton adresse Google de test et les comptes Google des testeuses qui essaieront les achats.
30. Enregistre. Ce sont les comptes présents dans leur Play Store ; leur email NailMoods peut être différent.
31. Dans l'application NailMoods, ouvre **Tester et publier → Tests → Test interne**.
32. Prépare une petite liste de personnes pour la validation technique et enregistre-la.
33. Vérifie également la liste du **test fermé existant**, qui servira à la mise à jour des bêta-testeuses.
34. Vérifie les pays de distribution du canal.

L'accès au canal de test autorise l'installation. Le statut de testeuse de licence permet d'utiliser les moyens de paiement de test. Être dans le test fermé ne rend pas automatiquement les achats gratuits.

Les personnes avec un accès Plus/Pro offert le gardent et n'ont pas à acheter. Pour tester une première souscription, utilise un compte NailMoods Free dédié, sans invitation ni droit administratif actif.

## 5. Créer l'accès technique Google

35. Ouvre https://console.cloud.google.com/ avec ton compte Google.
36. Sélectionne un projet Google Cloud approprié ou crée un projet dédié, par exemple « NailMoods Billing ».
37. Vérifie le nom du projet sélectionné en haut de l'écran.
38. Dans **API et services → Bibliothèque**, recherche **Google Play Android Developer API** et active-la.
39. Ouvre **IAM et administration → Comptes de service**.
40. Crée un compte de service, par exemple `nailmoods-play-billing`.
41. Termine sa création. Le rôle général « Propriétaire » du projet Cloud n'est pas nécessaire pour cet usage.
42. Copie l'adresse technique se terminant par `iam.gserviceaccount.com`.
43. Reviens dans Play Console → **Utilisateurs et autorisations**.
44. Invite cette adresse technique et limite l'accès à NailMoods lorsque l'écran le permet.
45. Accorde les permissions nécessaires : lecture des données financières/commandes et gestion des commandes/abonnements. Ce sont des autorisations Play Console ; « Android Publisher » désigne ici l'API utilisée.
46. Enregistre l'invitation et les autorisations.
47. Dans Google Cloud, rouvre le compte de service → **Clés → Ajouter une clé → Créer une clé → JSON**.
48. Télécharge le fichier et garde-le dans un emplacement privé protégé.

Le fichier JSON contient une clé privée. Ne le joins pas à la conversation, au catalogue, à GitHub ou à l'AAB. Ne partage pas de capture de son contenu.

## 6. Enregistrer la clé côté serveur et coordonner l'activation

49. Ouvre https://supabase.com/dashboard/ et sélectionne **NailMoods** (Production).
50. Dans **Edge Functions → Secrets**, ajoute `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
51. Ouvre localement le JSON téléchargé et copie son contenu complet dans la valeur du secret. Enregistre.
52. Ajoute `GOOGLE_PLAY_PACKAGE_NAME` avec la valeur exacte `com.nailmoods.app`. Enregistre.
53. Répète pour **NailMoods-Recette** si Work l'utilise pour la validation serveur. Ces deux espaces de secrets sont distincts.
54. Confirme à Work uniquement que les secrets sont enregistrés ; indique les identifiants des produits et forfaits, les périodes, les prix et les pays. N'envoie pas la clé.

Les actions suivantes sont du côté Work : vérifier la cohérence des paramètres, publier les nouveaux textes, aligner les versions de consentement côté serveur, contrôler les fonctions déployées, puis activer la configuration au moment prévu pour le test interne.

Les migrations Billing et la fonction `google-play-verify` sont installées dans les deux environnements, avec la facturation désactivée. Les versions légales serveur restent celles de la version publique existante jusqu'à la publication coordonnée des nouveaux textes. Les anciens consentements ne sont pas réécrits.

Le serveur contrôle produit, forfait, validité et liaison au compte. Les droits offerts sont prioritaires et distincts. La réconciliation planifiée recontrôle les achats lorsque l'application est fermée ; aucun appel Google n'est lancé par cette planification tant que Billing est désactivé.

L'application « Recette » a un identifiant Android différent. Les essais d'achat Google de l'application existante doivent utiliser `com.nailmoods.app`, distribué par son canal interne, avec des comptes dédiés. Un APK Recette ordinaire ne valide pas les abonnements de l'application Production.

## 7. Préparer la fiche et les déclarations Play Console

55. Ouvre **Règlement et programmes → Contenu de l'application** dans NailMoods.
56. Vérifie les URL de confidentialité et suppression du compte, accessibles sans connexion.
57. Confirme l'audience **18 ans et plus**, comme dans la bêta actuelle.
58. Renseigne honnêtement le questionnaire de classification : photos, publications et messagerie existent. La classification est calculée par Google ; elle ne se force pas simplement à « 18 ».
59. Vérifie la catégorie et les rubriques éventuellement demandées pour les fonctions communautaires, y compris les standards de sécurité des enfants si Google place l'application dans ce champ.
60. Dans **Accès à l'application**, fournis des comptes de revue dédiés et des instructions permettant de visiter Free et les fonctions réservées. N'utilise pas ton compte personnel ni un accès administratrice.
61. Mets à jour **Sécurité des données / Data safety** avec les flux réels : compte/email, photos et contenus, messages, ville si renseignée, historique d'achat, données techniques et analytics lorsque consentis.
62. Fais vérifier par Work les sous-catégories, finalités, caractère facultatif et partage applicables. Les jetons d'achat ne sont pas des numéros de carte ; NailMoods ne collecte pas les coordonnées bancaires des utilisatrices.
63. Vérifie les déclarations de publicité et de permissions avec le manifeste réellement compilé. Le code préparé n'ajoute pas de publicité.
64. Vérifie que descriptions et captures correspondent à la version livrée et n'annoncent plus une absence générale d'abonnements.
65. Enregistre chaque formulaire et traite les rubriques incomplètes.

Les URL publiques prévues sont :

- https://mowaymcr.github.io/NailMoods/legal/confidentialite.html
- https://mowaymcr.github.io/NailMoods/legal/suppression-compte.html
- https://mowaymcr.github.io/NailMoods/legal/conditions.html

Le catalogue livré comprend des références factuelles sourcées. Leur présence ne donne pas une licence sur les logos ou photos des marques. Les rendus actuels sont produits par le moteur local de l'application ; ils ne prouvent pas l'intégration d'un service distant d'IA générative.

## 8. Recevoir les fichiers et importer le candidat en test interne

66. Attends le lot de fichiers produit par Work après les contrôles de construction et de signature.
67. Le lot doit contenir l'AAB Production signé, l'Excel audité, le bilan de tests et les sommes de contrôle.
68. Vérifie la version attendue : `0.3.0-beta.6`, `versionCode = 6`, identifiant Android `com.nailmoods.app`. Si le code 6 a déjà été utilisé dans ta console, Work doit augmenter le code avant la construction.
69. La signature doit utiliser la clé d'importation correspondant à l'application existante. Ne crée pas une nouvelle application pour contourner une erreur de signature.
70. Ouvre **Tests → Test interne → Gérer le canal → Créer une version**.
71. Importe le fichier `.aab`. L'Excel reste dans ton dossier de livraison : il ne s'importe pas dans Play Console.
72. Attends la fin du traitement du fichier et vérifie version, identifiant, appareils et avertissements.
73. Donne un nom lisible à la version et ajoute les notes ci-dessous.
74. Enregistre, examine la version, puis lance sa distribution interne.
75. Si Google demande un examen ou affiche une erreur bloquante, attends sa validation ou fais corriger l'erreur avant de poursuivre.
76. Dans l'onglet Testeurs, récupère le lien d'inscription interne lorsqu'il est disponible.
77. Sur le téléphone, connecte le Play Store avec le compte Google de test, ouvre le lien, accepte de participer et installe ou mets à jour NailMoods depuis Google Play.
78. Dans l'application, connecte le compte NailMoods de test prévu. Vérifie que la nouvelle version est bien installée.

Notes proposées : « Préparation des abonnements facultatifs Plus et Pro via Google Play, restauration des achats, conservation des accès bêta offerts et mise à jour du catalogue produits et de la reconnaissance des codes-barres. Free reste disponible sans abonnement. »

Un candidat doit être distribué pour réaliser les vrais essais Google. Il est ensuite validé puis promu au test fermé. Cela corrige l'ordre impossible qui consistait à exiger des essais du nouvel AAB avant de construire le moindre candidat.

## 9. Faire les essais avant la mise à jour générale des testeuses

79. Vérifie Free : génération gratuite, sauvegarde et données personnelles accessibles.
80. Vérifie un accès Plus offert, puis un Pro offert : aucune souscription nécessaire et aucune modification de leur durée.
81. Sur le compte Free de test, ouvre **Profil → Mon offre**. Vérifie prix, période, renouvellement et lien de résiliation.
82. Lance Plus. Dans la fenêtre Google, vérifie le compte Google et la présence d'un **moyen de paiement de test**. Si une carte réelle est proposée, annule et corrige les tests de licence.
83. Avec le moyen de test approuvé, termine l'achat. Work doit vérifier que le serveur confirme le droit, avec sa provenance Google et son expiration.
84. Ferme et rouvre l'application. Vérifie la persistance du droit.
85. Utilise **Restaurer mes achats** sur le même compte NailMoods. Vérifie le résultat et l'absence de nouvelle facturation.
86. Répète Pro avec un autre compte Free dédié.
87. Teste le refus et le paiement en attente : aucun accès payant ne doit être annoncé sans confirmation.
88. Résilie dans Google Play : l'accès doit rester ouvert jusqu'à la fin payée, puis revenir à l'état permis par les éventuels droits offerts.
89. Avec Work et les outils de test Google, couvre grâce, blocage, expiration et révocation. Vérifie également l'accusé de réception et la réconciliation application fermée.
90. Change de compte NailMoods : l'achat ne doit pas être transféré au mauvais compte.
91. Vérifie que le parcours bloque un second abonnement et ne déclasse pas Pro lorsqu'une restauration Plus arrive après lui.
92. Pour le catalogue, teste des flacons Manucurist Green et Green Flash, un OPI UPC-E, un code avec zéro initial, une teinte CANNI sans code fiable et un code inconnu.
93. Vérifie aussi l'OCR, les refus de caméra, les alias, le choix manuel et la sauvegarde/relecture d'un ancien produit de collection.
94. Sur un compte jetable, vérifie export et suppression. Si un abonnement existe, résilie-le séparément avant de supprimer le compte.
95. Consigne les résultats avec Work. Tout défaut d'achat, de liaison au compte, de perte de données ou de droit offert bloque la promotion.

Les tests de données du catalogue ont réussi ; ils ne remplacent pas ces tests caméra. Les tests d'achats Google attendent les produits, accès API et comptes de licence réellement configurés.

## 10. Mettre à jour le test fermé existant

96. Après validation, ouvre le canal **Test fermé** déjà utilisé par tes bêta-testeuses.
97. Choisis la promotion du candidat interne validé si la console la propose, ou crée une version et sélectionne ce même bundle déjà importé.
98. Vérifie le numéro de version, la liste des testeuses, les pays et les notes.
99. Examine les changements et envoie-les à l'examen lorsque Google le demande.
100. Si la publication gérée est activée, effectue également l'action de publication après approbation.
101. Attends que le statut indique une version réellement disponible sur le canal. Un brouillon ou « En cours d'examen » ne suffit pas.
102. Vérifie toi-même la mise à jour depuis le Play Store avec un compte inscrit au test fermé.
103. Les testeuses déjà inscrites au même canal peuvent garder leur lien d'inscription. Vérifie qu'il est toujours celui du canal choisi.
104. Préviens les testeuses de mettre à jour depuis Google Play. Les nouveaux testeurs doivent accepter le lien d'inscription avant de chercher l'application.
105. Surveille après diffusion les erreurs, signalements, achats et droits. Cette étape met à jour la bêta ; elle ne lance pas une diffusion publique en Production Play Store.

## Où nous en sommes et ce qui t'incombe maintenant

Le catalogue consolidé et le code Billing corrigé sont prêts pour les contrôles de livraison. Les migrations et la fonction sont déployées avec les achats désactivés. Les nouveaux textes sont préparés, avec leurs anciennes versions conservées. Le guide ne constitue pas une approbation Google et aucun achat réel n'a encore été validé.

**Ton prochain geste : terminer le compte bancaire et le profil de paiement, puis créer/activer les deux produits et ajouter les testeuses de licence.** Tu peux ensuite configurer le compte de service et les secrets. Work s'occupe de la suite technique et de la construction ; tu n'as pas à modifier Java, SQL ou le catalogue.

À transmettre à Work, sans donnée secrète : produits et forfaits exacts, périodes et prix choisis, pays activés, confirmation des comptes de licence, confirmation de l'API et des permissions, confirmation des deux secrets. Ensuite viennent le candidat interne, les essais et la promotion au test fermé.

## Sources officielles consultées

- Profil de paiement : https://support.google.com/googleplay/android-developer/answer/7161426?hl=fr
- Abonnements et forfaits : https://support.google.com/googleplay/android-developer/answer/140504?hl=fr
- Accès serveur Google Play : https://developers.google.com/android-publisher/getting_started
- Tests de licence : https://support.google.com/googleplay/android-developer/answer/6062777
- Tests Billing : https://developer.android.com/google/play/billing/test
- Canaux de test : https://support.google.com/googleplay/android-developer/answer/9845334
- Préparer une version : https://support.google.com/googleplay/android-developer/answer/9859348
- Versions Billing : https://developer.android.com/google/play/billing/release-notes

Les libellés d'écran peuvent évoluer. Si une rubrique manque, conserve la démarche ci-dessus et utilise la recherche ou l'aide de ta console ; ne crée pas une deuxième application ou un deuxième compte développeur.
