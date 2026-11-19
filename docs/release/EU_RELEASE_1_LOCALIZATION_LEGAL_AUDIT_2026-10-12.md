# NailMoods 1.0 — préparation Europe : langues et audit juridique (12 octobre 2026)

## Objet et limites de la livraison
Préparer la première release commerciale pour la France et les pays européens limitrophes, sans activer de nouveaux territoires ni publier la bêta. Ce document est un contrôle produit/technique, **pas une certification juridique**.

### Marchés et langues (préparation technique, sans ouverture de store)
- FR : français, marché de départ.
- BE / LU : français et néerlandais selon territoire/préférence ; tester le cas multilingue.
- DE : allemand ; ES : espagnol (Espagne) ; IT : italien ; NL : néerlandais ; anglais comme langue alternative.
- Suisse et Monaco : **à étudier séparément** (hors UE) avant activation ; la présence d'une langue ne vaut pas ouverture commerciale.
- L'application reste unique (React/Vite + Capacitor), sans dupliquer les comptes, le catalogue, les portefeuilles, les tarifs ou les builds par langue.
- Les langues sont déterminées par choix explicite prioritaire, à défaut la langue système compatible. La préférence initiale est propre à l'appareil.
- Les données structurées stockées restent des codes stables (IDs de produits, tags, options, tiers), jamais des étiquettes traduites.

## Constat vérifié dans le dépôt (branche main, 12/10/2026)
- `src/privacy/policy.js` : `TERMS_VERSION = 0.6-beta`, `PRIVACY_VERSION = 0.9-beta`; ne pas augmenter avant publication coordonnée et migration/consentement.
- `public/legal/conditions.html` : CGU 0.6-beta, préparées pour bêta et abonnements Google/Apple. Ne décrivent pas les conditions commerciales finales des jetons achetés et de l'offre Salon.
- `public/legal/confidentialite.html` : politique 0.9-beta mise à jour le 11/10 ; aborde NailMoods AI / OpenAI, rétention, permissions, AdMob de test et abonnements. Une validation contre le build **commercial final** reste impérative.
- `public/legal/editor.json` indiquait `privacyVersion: 0.8-beta`, divergence corrigée dans cette branche vers 0.9-beta. Ne pas modifier rétroactivement les acceptations enregistrées.
- `public/legal/informations.html`, `support.html` et `suppression-compte.html` existent, en français. Les CGU et la politique ne sont pas encore localisées.
- `src/privacy/PrivacyPanel.jsx` propose des liens sur des fichiers juridiques versionnés en FR et un flux d'acceptation. Ne pas pointer vers des traductions non revues.
- Pas de système de traduction global complet identifié dans les principaux écrans ; la plupart des libellés sont codés directement en français.
- `app-store/APPLE_DSA_EU.md` indique que la déclaration de commerçant (trader) n'est pas effectuée à la date de cet audit antérieur ; statut actuel App Store Connect à revérifier.
- Les mentions publiques indiquent un hébergement officiel Netlify et historique GitHub Pages alors que la politique mentionne principalement GitHub Pages : vérifier le routage réel et harmoniser les textes.

## Réalisé dans cette branche — pilote uniquement
- Infrastructure de sélection des langues FR/EN/ES/DE/IT/NL ; choix local persistant avec repli FR.
- Traductions **pilotes** de la navigation et des libellés du sélecteur, sous `VITE_I18N_BETA_ENABLED=true` pour recette.
- Tant que les écrans ne sont pas intégralement traduits, le sélecteur annonce clairement que c'est un aperçu.
- Le document HTML reste en `lang=fr` (la majorité des textes n'est pas encore traduite). Les éléments de navigation traduits ont une indication `lang` individuelle.
- Tests unitaires du catalogue de traduction pilote ; **ne pas déclarer l'application entièrement multilingue**.
- Aucune modification de Supabase, du domaine, des coûts IA, de l'éligibilité des comptes ou des stores.

## Actions P0 avant release commerciale et ouverture européenne

### A. Traductions / accessibilité
1. Centraliser tous les textes UX, onboarding et inscription/majorité ; menus, profil, paramètres, création/IA, journal/livre, collection, recherche, découverte, communauté/messages, signalement et suppression.
2. Traduire tutoriels, niveaux, descriptions d'offres, quotas/jetons, retour d'erreur, et informations sensibles (CGU, vie privée, pubs, achats) ; garder les codes persistés inchangés.
3. Traduire textes juridiques **à partir des versions françaises finales**, avec validation humaine adaptée à chaque pays proposé (pas de traduction juridique brute publiée).
4. Permettre bascule à chaud de langue sans perte de saisie ni de données, choisir les formats natifs `Intl` de nombres, devises, dates et fuseaux ; accentuation/retour ligne/écrans iPhone et iPad.
5. Traduire emails Auth/support/modération, informations d'achat, notifications et textes de consentement ; garantir un parcours utilisable sans français.
6. Ajouter `html[lang]` correspondant **seulement lorsque l'intégralité des parcours exposés est réellement localisée** ; exceptions avec `lang` explicite.
7. Captures d'écran, description et mots-clés localisés par store ; la localisation du store n'est pas la localisation de l'application.
8. Lancer un audit automatisé des clés manquantes, fuites de français dans les traductions, longueurs UX et QA de chaque locale ; FR reste la référence produit.

### B. Documents juridiques / consommation
1. Passer des textes « bêta fermée » aux conditions **réellement actives** au lancement ; maintenir archives et historique des acceptations.
2. Décrire Free avec pubs éventuelles, Plus/Pro, Salon collectif, changements de niveau, prix locaux, renouvellement/résiliation, perte/restauration des droits, accès offert.
3. Décrire les jetons consommables : packs 5/15/30 ; achat via boutique selon plateforme, jetons achetés **sans expiration**, portefeuille personnel/Salon, règles d'affectation et départ d'une PO, achats interrompus/achats remboursés, fraude, litiges, et ce que le crédit rémunère.
4. Contrôler les informations précontractuelles (identité professionnelle, contact, caractéristiques, prix TTC, frais, durée, renouvellement, rétractation et conditions d'exception pour prestations/services/contenus numériques), facturation/fourniture des confirmations et garanties légales. **Ne pas inventer une renonciation au délai légal de rétractation.**
5. Vérifier la désignation d'un **médiateur de la consommation** compétent en France et publier ses coordonnées et lien si requis ; aucune identité de médiateur n'est renseignée dans le dépôt.
6. Réexaminer signalement, blocage, modération et recours utilisateurs en cas de diffusion multi-pays ; qualification et obligations DSA selon activité et taille à faire confirmer.
7. Déclaration Apple du statut `trader`, coordonnées à afficher et justificatifs ; la commercialisation par une EI suggère ce statut. Confirmer et renseigner directement chez Apple.
8. Vérifier régime TVA / ventes transfrontières B2C avec comptable et qui encaisse auprès de l'acheteur (stores vs web) ; ne pas transposer automatiquement le prix TTC français aux autres pays.
9. Vérifier traitements réels et textes vie privée : OpenAI (prompts, images, historique, lieu de traitement et garanties), Supabase/stockage, analytics, AdMob/UMP/ATT, données d'achats/jetons, Salon et modération ; préciser consentements et transferts effectivement opérés.
10. Réviser mentions légales (hébergeur, identité, adresse professionnelle, email/téléphone légalement requis), support, politique de suppression et conservation, versions éditoriales et liens publics.
11. Procéder à une revue professionnelle juridique avant mise en vente multi-pays. Les règles nationales de langue/consommation doivent être vérifiées par pays ciblé.

### C. Coordination de publication
- Construire sur le même commit tronc commun et versions Android/iOS/web ; tests sur plateformes et tablettes.
- Publier pages juridiques finales + versions archivées avant toute nouvelle collecte de consentement.
- Migrer/aligner versions côté serveur et clients de façon coordonnée, conserver les preuves et consentements anciens.
- Paramétrer les offres et localisations dans Apple et Google Play ; tester StoreKit 2 / Billing en sandbox, remboursements et restauration.
- Ne pas ouvrir les pays/lancer les pubs ou achats commercialement avant GO explicite et revue App Store/Play.
- Une **locale P0 incomplète bloque sa commercialisation** ; ne pas activer un pays uniquement parce que la traduction pilote existe.

## Références officielles (vérifiées en octobre 2026)
- CNIL, information intelligible : https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
- Commission UE / droit des consommateurs : https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en
- Your Europe / informations précontractuelles : https://europa.eu/youreurope/citizens/consumers/shopping/contract-information/index_fr.htm
- Médiation conso (France) : https://www.economie.gouv.fr/mediation-conso/vous-etes-un-professionnel/vos-principales-obligations-0
- Apple DSA trader : https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/
- Apple localisations : https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information
- Google Play traduction : https://support.google.com/googleplay/android-developer/answer/9844778?hl=fr
- TVA UE : https://europa.eu/youreurope/business/finance-and-tax/vat/cross-border-vat/
