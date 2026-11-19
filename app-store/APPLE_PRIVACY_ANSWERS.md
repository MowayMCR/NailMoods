# Confidentialité Apple — audit du 11 octobre 2026

**Mise à jour ATT du 11 octobre : candidat 30006 avec suivi publicitaire autorisé uniquement après UMP + ATT ; validation physique et rapport Organizer encore requis. Ne pas publier automatiquement.**
Remplace le tableau du 2 octobre. Source : IPA signé 0.8.1 build 30004, commit 8ab902924684d6ca26f33b684c32955cba26ca34, Actions 38141444914. Code commun main fdf9851. Les corrections ci-dessous ne sont pas dans l'IPA signé 30004.

L'ancien tableau avait 12 catégories. Ajouter les 7 catégories suivantes si elles ne sont pas déjà saisies : Santé, Contacts, Identifiant d'appareil, Données publicitaires, Données de crash, Données de performances et Historique de recherche. Cible : 19 catégories pour ce périmètre. Ce document n'est pas une lecture des réponses enregistrées dans la console Apple.

## Tableau de saisie

F = Fonctionnalités de l'app (App Functionality) ; A = Analyse (Analytics) ; P = Personnalisation du produit (Product Personalization) ; T = Publicité tierce (Third-Party Advertising). Le lien à l'identité inclut le lien à l'appareil. Le candidat doit être déclaré comme utilisant le suivi : Device ID et Advertising Data. Les autres réponses restent celles de l’audit ; elles requièrent encore une validation des flux réels.

| Catégorie Apple | Action | Finalités | Liée | Suivi | Preuve ou précision |
|---|---|---|---|---|---|
| Coordonnées / Nom | Conserver | F | Oui | Non | Nom/pseudo et profil |
| Coordonnées / Adresse e-mail | Conserver | F | Oui | Non | Authentification/support |
| Identifiants / Identifiant utilisateur | Conserver | F, A | Oui | Non | UUID, handle, appAccountToken, analytics consentis ; UUID NailMoods non transmis aux annonces |
| Localisation / Localisation approximative | Modifier | F, T, A | Oui | Non selon déclarations SDK | Ville facultative ; réseau/AdMob/UMP, sans GPS |
| Contenu / Photos ou vidéos | Conserver | F | Oui | Non | Photos et références IA choisies, Supabase/OpenAI selon action |
| Contenu / E-mails ou messages texte | Conserver | F | Oui | Non | Messagerie/support |
| Contenu / Autre contenu utilisateur | Conserver | F, P | Oui | Non | Collection, notes, demandes créatives, plans et historique IA |
| Contenu / Assistance clientèle | Conserver | F | Oui | Non | Tickets/signalements/pièces jointes |
| Achats / Historique des achats | Conserver | F | Oui | Non | Produit/transaction/droits, sans carte bancaire |
| Utilisation / Interaction avec le produit | Modifier | A, T, F | Oui | Non selon déclarations SDK | Analytics internes, interactions AdMob, UMP |
| Diagnostics / Autres données de diagnostic | Modifier | F, A, T | Oui par agrégation prudente | Non selon déclarations SDK | Flux support/serveur liés au compte + flux SDK non lié |
| Autres données / Autres types | Conserver | F | Oui | Non | Consentements, majorité, sécurité |
| Santé et forme physique / Santé | Ajouter | F | Oui | Non | Repères ongles synchronisés ; ressenti « Sensible » du suivi sauvegardé ; aucun HealthKit. Retirer P du manifeste app : aucune personnalisation distante de santé démontrée |
| Contacts / Contacts | Ajouter | F | Oui | Non | private.social_connections : Apple inclut le graphe social ; pas d'accès au carnet d'adresses |
| Identifiants / Identifiant d'appareil | Ajouter/modifier | T, A | Oui | **Oui** | Le candidat autorise le SDK et l’IDFA uniquement après UMP + ATT ; npa/test ne suppriment pas cette déclaration |
| Utilisation / Données publicitaires | Ajouter/modifier | T, A | Oui | **Oui** | Déclaration prudente pour les impressions/interactions mesurées avec un identifiant après accord ; à contrôler sur l’archive finale |
| Diagnostics / Données de crash | Ajouter | A | Non pour le flux SDK | Non | Manifeste GoogleMobileAds, aucun collecteur app de crash relié au compte trouvé |
| Diagnostics / Données de performances | Ajouter | T, A, F | Oui par prudence | Non selon déclaration SDK | Manifeste non lié, mais documentation Google actuelle décrit des performances associées à l'utilisateur ; sans preuve de désidentification, retenir Oui |
| Historique de recherche | Ajouter | F | Oui | Non | Requêtes de tendances AI conservées avec les résultats dans l'historique privé ; ne pas extrapoler à la recherche catalogue/sociale non historisée |

Ne pas cocher Marketing du développeur uniquement parce que le SDK générique le propose : aucun usage pour promouvoir NailMoods ni partage à cette fin constaté. Pour les lignes applicatives sans flux publicitaire, aucune utilisation à des fins de tracking n'a été trouvée.

## Catégories non justifiées

Téléphone, adresse physique utilisateur, localisation précise, forme physique, données de carte/paiement/crédit/autres données financières, données sensibles de la liste Apple, audio, historique de navigation, analyse de l'environnement, structure/mouvements des mains ou de la tête : aucune collecte dédiée trouvée. Les photos de mains restent Photos/Vidéos, sans modèle de structure/mouvement enregistré trouvé. Les champs texte libres ne rendent pas toutes les catégories imaginables obligatoires.

## Tracking : conclusion du candidat, validation physique manquante

**Conclusion : NailMoods contient une intégration AdMob capable de tracking Apple et le nouveau candidat permet cette mesure uniquement après accord UMP + ATT. ATT est nécessaire pour ce chemin autorisé. Déclarer Oui au suivi pour l’identifiant d’appareil et les données publicitaires. Il n’est pas démontré que l’ancien build 30004 a effectivement réalisé un suivi en réseau : absence d’ATT et npa ne permettent pas de conclure Non.**

Les refus UMP/ATT ne chargent aucune annonce iOS dans le candidat. Le mode contextuel sans ATT reste bloqué jusqu’à preuve de son absence de tracking. PPID est désactivé ; aucun UUID, email ou profil NailMoods n’est transmis aux annonces. Les tests JS n’observent pas le SDK Google en exécution.

Sur appareil iOS et build destiné à publication : contrôler état ATT, identifiants disponibles, destinations et usage des requêtes avant tout opt-in ; après opt-in/UMP ; après refus et relancement. npa:true et blocs de démonstration sont constatés dans src/ads/controller.js, sans envoi explicite de l'UUID NailMoods. Ils n'excluent pas, à eux seuls, toute association publicitaire par Google. Les tests du contrôleur vérifient le retrait des annonces et les gardes ; ils ne capturent pas les échanges du SDK natif.

Si un suivi au sens Apple est pratiqué : déclarer les catégories concernées et obtenir ATT avant ce suivi. Si aucun suivi n'est pratiqué : documenter la preuve avant de sélectionner Non. Ne pas modifier le manifeste Google pour masquer tracking=true. Aucun achat commercial ni annonce commerciale activé par cet audit.

## Rapport et archive

Cinq manifestes embarqués : app, Capacitor, Cordova, GoogleMobileAds 13.6.0 et UMP 3.1.0. [Rapport complet de l'IPA](../docs/privacy-20261011/evidence/shipped-manifest-report-30004.json) : catégories, finalités, liens, tracking et API de chaque composant. Les contrôles CI sont étendus : ils consignaient auparavant uniquement les API, pas les collectes/tracking.

Ce rapport reproductible est une extraction statique de l'IPA signé, **pas le rapport Xcode Organizer**. L'artefact disponible contient l'IPA et les inspections de l'archive, mais ni .xcarchive complet ni rapport Organizer. Ce dernier doit encore être produit sur macOS pour l'archive finale. Nouveau build nécessaire pour embarquer les corrections ; le binaire 30004 ne change pas.

## Politique publique et traitements

https://nailmoods.com/legal/confidentialite.html accessible sans compte le 11 octobre, version 0.9-beta. Son affirmation d'absence d'IA tierce était fausse. Rectificatif préparé avec copie antérieure, décrivant OpenAI : texte, échanges récents utiles, produits, composition, photos/références/rendus selon action, modération/qualité et recherches de tendances ; historique et médias privés Supabase ; suppression et traces techniques distinctes. L'ancien laboratoire iOS fermé n'est pas le service commun nailmoods-ai.

Les repères lifestyle ne sont pas uniquement locaux : src/cloud/store.js et repository.js synchronisent le profil entier, dont lifestyle, dans profiles.preferences.nailmoodsProfile. La projection publique les exclut. Le suivi est également synchronisé. La mention UI « sur cet appareil » est corrigée.

store:false n'est ni Zero Data Retention ni une preuve de résidence UE. Contrat/DPA, transferts, réglage OpenAI de partage/rétention et base/mesures adaptées aux repères de santé restent à vérifier avant de qualifier la politique de juridiquement complète. L'audit n'a pas ouvert ces consoles ni inspecté des dossiers personnels en production. Ne pas appliquer automatiquement la rétention analytics de 24 mois aux contenus IA. Le rectificatif n'active aucun consentement ni accès.

## Sources

- [Définitions Apple](https://developer.apple.com/app-store/app-privacy-details/) : graphe social, santé fournie par l'utilisateur, identité/appareil et traitement local.
- [Collecte AdMob iOS](https://developers.google.com/admob/ios/privacy/data-disclosure), consultée le 11 octobre, page datée du 8 octobre 2026.
- [Données API OpenAI](https://developers.openai.com/api/docs/guides/your-data).
- [Preuves et limites](../docs/privacy-20261011/README.md).

Aucune réponse App Store Connect publiée, aucun droit utilisateur modifié, aucune publicité commerciale activée.
