# App Privacy — réponses fondées sur le code

Version auditée : branche Apple basée sur beta Google 6, 2 octobre 2026. Ne pas sélectionner « aucune donnée collectée ». Certaines fonctionnalités optionnelles collectent des données dès qu’une personne les utilise ; elles font partie de la déclaration. Les historiques de consentement, la majorité déclarée et les achats sont conservés côté compte.

Menu : App Store Connect → Apps → NailMoods → App Privacy → Get Started/Edit → « Yes, we collect data ». Pour chaque ligne collectée ci-dessous : cocher les catégories/finalités indiquées, « Linked to the user: Yes », « Used for tracking: No ». Cette déclaration prudente considère la pseudonymisation réversible analytics et les diagnostics reliables au compte comme liés. Pas de publicité tierce, marketing développeur ni autres finalités inventées.

| Catégorie Apple à cocher | Données réellement constatées | Collectée | Finalités à sélectionner | Liée | Destinataire |
|---|---|---|---|---|---|
| Contact Info → Name | nom/pseudo, display_name, profil professionnel | oui | App Functionality | oui | Supabase ; autres membres selon visibilité |
| Contact Info → Email Address | Auth, récupération, support | oui | App Functionality | oui | Supabase Auth, SMTP et prestataire email support à confirmer dans les consoles |
| Identifiers → User ID | Supabase UUID, @NailMoodsID, appAccountToken, identifiant analytics pseudonymisé | oui | App Functionality ; Analytics pour identifiant analytics consenti | oui | Supabase ; Apple pour token ; Google pour identifiant obscurci |
| Location → Coarse Location | ville professionnelle facultative saisie manuellement ; aucune permission GPS | oui, facultative | App Functionality | oui | Supabase ; public si choisi |
| User Content → Photos or Videos | avatars, poses, inspirations, pièces jointes photo support ; pas de capture vidéo native | oui | App Functionality | oui | Supabase ; membres/staff selon action |
| User Content → Emails or Text Messages | messages entre membres et emails support volontairement envoyés | oui | App Functionality | oui | Supabase ; destinataires ; support |
| User Content → Other User Content | Journal/notes, dessins, inspirations, produits scannés et corrections sauvegardées, tags, bio, collection, favoris, créations Pro | oui | App Functionality ; Product Personalization pour choix créatifs sauvegardés | oui | Supabase ; partage explicite uniquement |
| User Content → Customer Support | tickets, signalements, réponses, données volontairement transmises au support | oui | App Functionality | oui | Supabase ; staff habilité ; email support |
| Purchases → Purchase History | produit/tier, dates, état d’abonnement, transaction/original transaction ; aucun numéro de carte | oui | App Functionality | oui | Supabase ; Apple/Google selon achat |
| Usage Data → Product Interaction | événements sessions, fonctionnalités, génération, parcours ; consentement facultatif | oui si accepté | Analytics | oui, pseudonymisé | Supabase analytics interne |
| Diagnostics → Other Diagnostic Data | codes d’erreur sans contenu privé ; diagnostics volontairement joints ; logs techniques des hébergeurs | oui | App Functionality ; Analytics pour événements consentis | oui par prudence | Supabase, Netlify/GitHub selon surface, support |
| Other Data → Other Data Types | majorité 18+, versions/choix de consentement, sécurité/blocage, IP et métadonnées techniques non couvertes ailleurs | oui | App Functionality | oui par prudence | Supabase et hébergeurs selon service |

## Ne pas cocher dans cette version, sous réserve de l’audit d’archive

Phone Number et Physical Address : aucun champ utilisateur constaté. L’adresse professionnelle de Marie publiée dans les mentions est celle de l’éditeur, pas une collecte de l’utilisatrice. Precise Location : non. Contacts : non. Audio : non. Health/Fitness, Financial Info (Payment Info, Credit Info, Other Financial Info), Sensitive Info, Browsing History, Search History, Device ID, Advertising Data : aucun traitement applicatif constaté correspondant. Les critères d’inspiration et la recherche interne ne sont pas sauvegardés comme historique de recherche ; seul le nom d’événement générique peut l’être avec consentement. Crash Data/Performance Data : pas de Sentry/Firebase Crashlytics ou télémétrie de stack/crash dédiée trouvés. Les rapports TestFlight/Apple constituent un flux Apple à examiner séparément si exportés puis conservés par NailMoods.

L’application peut traiter localement une photo OCR ou un rendu sans sauvegarde : ce calcul seul n’est pas une collecte serveur. Sauvegarde/import/publication sont des collectes de User Content. Aucun envoi à une IA distante trouvé. La recherche de références en ligne ajoutée le 3 octobre transmet au serveur les renseignements normalisés du produit (code-barres, marque, gamme, référence et nom) sans photo ni OCR complet. Le serveur interroge les sites officiels KIKO/Algolia, Manucurist, OPI, CANNI, Le Mini Macaron et la base publique Open Beauty Facts, sans leur transmettre le compte ou son jeton. Ces échanges fonctionnels sont distincts des analytics ; les résultats peuvent être mis en cache (appareil : 40 fiches, sept jours ; serveur : 200 résultats, une heure pour une fiche, dix minutes pour une absence). Ne pas présenter cette fonction comme un calcul exclusivement local. Aucun SDK Firebase/publicitaire/pixel/tracker tiers trouvé. ATT n’est donc pas ajouté ; refaire l’analyse avant toute nouvelle dépendance.

Les parcours photo utilisent un réencodage canvas ; le support a été corrigé pour retirer aussi les métadonnées EXIF/GPS avant son upload. Vérifier séparément les anciens médias et les emails volontaires : si un traitement/conservation de coordonnées GPS y est effectivement constaté, actualiser la déclaration et minimiser les métadonnées. Aucune permission GPS n’est demandée par l’app.

## Points qui exigent encore une confirmation humaine

Le fournisseur SMTP réellement activé dans Supabase, les logs/contrats Netlify sur le domaine observé, les durées de sauvegarde et le routage support doivent être validés par Marie dans les consoles/contrats. Ne pas déclarer une politique d’un prestataire sur simple supposition. La présence d’IP chez l’hébergeur est décrite comme donnée technique ; vérifier si une géolocalisation réseau est effectivement conservée avant d’ajouter une finalité analytics à Coarse Location. La ville facultative suffit déjà à déclarer cette catégorie.

Le fichier PrivacyInfo.xcprivacy correspond à ces catégories ; il ne remplace pas les réponses App Store Connect. Sur l’archive finale, générer le rapport Privacy, vérifier chaque SDK natif/transitif et ses signatures. Les données loguées par un outil ajouté au build modifieraient les réponses ci-dessus.

Source : [App Privacy Details Apple](https://developer.apple.com/app-store/app-privacy-details/) et [saisie App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/). Aucune case n’a été enregistrée sur le compte Apple dans cette mission.
