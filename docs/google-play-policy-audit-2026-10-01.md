# NailMoods — audit Google Play et livraison Billing bêta 6

Date : 1er octobre 2026. Branche examinée : `feat/google-play-billing-beta6`.
Commit applicatif examiné : `dfdfb0c86ff19f27e24d4214fbef02c75d07be84`.

## Décision

**Pas de feu vert pour l'AAB Billing en l'état.** Plusieurs exigences ont une base existante, mais la préparation Billing comporte des défauts de code, en plus de la configuration Play Console restant à confirmer. Cet audit remplace l'affirmation selon laquelle il suffirait de configurer Google pour générer l'AAB final.

L'examen porte sur le code de la branche, les règles officielles Google consultées à cette date, les pages publiques et des lectures de configuration Supabase. Il ne constitue ni une validation Google, ni un test d'achat réel, ni une certification de l'AAB final. Aucune base, fonction serveur, offre commerciale ou donnée utilisateur n'a été modifiée pendant cet audit.

## État réellement observé

| Contrôle | Production | Recette |
| --- | --- | --- |
| Sélection libre des offres `beta_self_selection` | `false` | `false` |
| Table `private.google_play_subscriptions` | Absente | Absente |
| RPC publique `upsert_google_play_subscription` | Absente | Absente |
| Edge Function `google-play-verify` | Absente de la liste des fonctions | Absente de la liste des fonctions |
| Edge Function `account-delete` | Active, version 3 | Active, version 4 |
| Trigger `sync_profile_account_entitlement` sur les profils | Actif | Actif |

Les lectures ne portent pas sur les secrets ni sur les contenus des comptes. Les produits, prix, base plans, licence testers, accès API, déclarations et avertissements Play Console n'ont pas été inspectés.

## Corrections bloquantes dans la branche

### B01 — Version de la bibliothèque Billing

`android/app/build.gradle` utilise `com.android.billingclient:billing:7.1.1`. La date normale limite de soumission pour la version 7 est le 31 août 2026 ; une extension accordée peut aller jusqu'au 1er novembre 2026. Aucune extension n'a été constatée. Migrer vers une version encore admise (8 ou 9 selon le choix technique), adapter le bridge aux signatures correspondantes et vérifier la dépendance effectivement intégrée. La mise à jour du numéro seule ne suffit pas. Source G02.

### B02 — Prix, renouvellement, résiliation et discours contradictoire

`src/cloud/GooglePlayBillingPanel.jsx` reçoit les produits mais n'affiche ni `formattedPrice`, ni `billingPeriod`, ni conditions de renouvellement. Aucun lien de gestion/résiliation n'est présent. Les offres doivent annoncer le montant réellement facturé, sa périodicité, les éventuelles phases promotionnelles et le renouvellement, avec accès au centre des abonnements Google Play. La présence de la fenêtre de paiement Google ne remplace pas les informations requises sur l'écran de sélection. Source G03.

`AccountRoot.jsx` affiche aussi `AccountOfferPanel.jsx`, qui annonce qu'aucun paiement n'est demandé et que Plus/Pro sont uniquement sur invitation. Les conditions actives `conditions-0.4-beta.html` excluent explicitement toute facturation Google Play. La confidentialité `confidentialite-0.6-beta.html` annonce l'absence de SDK de paiement. Harmoniser les écrans et publier des textes versionnés avant toute activation payante ; conserver les archives et les consentements selon le mécanisme existant. Décrire les données d'achat effectivement traitées et mettre à jour Data safety. Sources G03, G04 et G05.

### B03 — Migration inexécutable et RPC manquante

`supabase/migrations/20260930210000_google_play_billing_entitlements.sql` contient **six séquences littérales `\n` hors chaîne SQL**, notamment aux lignes 10 et 26. Elles ne sont pas des retours à la ligne et empêchent l'exécution normale du fichier SQL.

La fonction d'écriture est créée uniquement dans le schéma `private`. L'Edge Function utilise `admin.rpc('upsert_google_play_subscription', ...)` avec le schéma public par défaut ; aucune fonction publique correspondante n'est définie. Ajouter un contrat d'appel accessible uniquement au serveur, avec révocation explicite pour `anon`, `authenticated` et `PUBLIC`, puis vérifier les permissions et l'appel réel en Recette. Ne pas exposer le schéma privé pour contourner ce défaut.

### B04 — Produit acheté insuffisamment vérifié

Dans `supabase/functions/google-play-verify/index.ts`, `productId` vient du corps de requête, tandis que la réponse Google est lue dans `lineItems[0]`. Le code ne compare pas le produit demandé au produit réellement acheté avant de calculer les droits. Un jeton Plus pourrait être soumis comme Pro lorsque le reste du flux sera opérationnel.

Dériver les droits des lignes vérifiées par Google, valider les produits et base plans autorisés et la liaison au compte. Refuser les jetons déjà rattachés à un autre compte. Le hash unique du jeton constitue une protection partielle, pas une preuve d'identité du premier demandeur. Tester explicitement jeton Plus présenté comme Pro, autre compte, jeton invalide et lignes manquantes. Source G06.

### B05 — Accusé de réception incorrect

Le code ajoute `:acknowledge` à l'URL de lecture `purchases/subscriptionsv2/tokens/...`. L'API documentée d'accusé de réception utilise `purchases/subscriptions/.../tokens/...:acknowledge`. De plus, le résultat HTTP est ignoré et `acknowledged_at` est renseigné comme si l'opération avait réussi.

Employer l'API correcte pour les achats éligibles, contrôler la réponse, enregistrer le succès réel et prévoir une reprise idempotente. Ne pas acquitter un achat encore en attente comme un achat terminé. Source G07.

### B06 — Achats pouvant devenir des droits administratifs permanents

La nouvelle RPC met à jour `public.profiles.account_tier`. Le trigger **réellement actif dans les deux environnements** `private.sync_profile_account_entitlement()` transforme un changement de niveau en entitlement de source `admin`, actif et avec `expires_at = null`.

Ainsi, après réparation du flux d'écriture, un achat pourrait être interprété comme un droit manuel et être ensuite protégé contre son expiration. La nouvelle colonne `subscription_source` ne résout pas ce conflit : `has_manual_entitlement` se base sur `source` et le trigger n'a pas été adapté.

Séparer les attributions administratives et les droits Google jusqu'au calcul serveur des capacités. Vérifier `private.effective_tier`, les restrictions des fonctionnalités et la provenance des droits après achat, renouvellement, expiration et révocation. Cette conclusion résulte du rapprochement du code proposé avec les définitions serveur lues ; aucun achat n'a été exécuté.

### B07 — Invitations fondatrices non protégées par le nouveau calcul

`has_manual_entitlement` reconnaît `admin`, `beta_self_selection` et `legacy`, mais pas `beta_invitation`, pourtant utilisé pour les invitations fondatrices. Le code ne limite pas non plus la priorité aux droits manuels Plus/Pro : un entitlement manuel Free peut bloquer l'achat dans l'interface.

Définir et tester la priorité attendue pour les vrais droits manuels Plus/Pro, y compris les invitations valides et leurs dates, sans requalifier les achats en attributions administratives. Préserver les collections, contenus et droits existants.

### B08 — Annulation, expiration, renouvellement et double abonnement

Le SQL n'accorde les droits Google que pour `active` et `grace`. `canceled` entraîne Free, même si la période payée n'est pas terminée. Il faut distinguer arrêt du renouvellement et fin effective de l'accès. Sources G03 et G08.

Les seules vérifications visibles sont liées à l'achat et au bouton de restauration. Le dépôt ne comporte pas de traitement Billing RTDN ou de réconciliation périodique. La lecture d'état renvoie le profil stocké sans recalculer l'expiration. Prévoir un mécanisme serveur fiable de mise à jour du cycle de vie, y compris lorsque l'application reste fermée. RTDN est une option documentée ; le résultat à garantir est la justesse des droits, pas un nom de technologie imposé.

Le dernier produit synchronisé peut écraser le niveau d'un autre abonnement valide : le calcul ne recherche pas tous les droits encore valides. Le passage Plus vers Pro ne prévoit pas de remplacement d'abonnement dans le bridge. Définir le comportement pour éviter deux facturations involontaires et un déclassement selon l'ordre de restauration.

### B09 — Messages de succès prématurés

`buy()` annonce un accès actif après `purchaseTier()` sans interpréter l'état serveur ; `purchaseTier()` peut renvoyer une liste vide. La restauration annonce aussi un succès sans vérifier si des droits ont été rétablis. Afficher distinctement achat en attente, actif, annulé par l'utilisatrice, indisponible et aucun achat à restaurer. Ne jamais annoncer un droit absent. Sources G03 et G06.

## Points déjà présents et limites à lever

| Sujet | Observation | Validation restante |
| --- | --- | --- |
| API Android | `compileSdkVersion` et `targetSdkVersion` = 36 dans `android/variables.gradle`, cohérents avec les exigences de soumission actuelles | Contrôler le manifeste final de l'AAB ; source G09 |
| Compte gratuit | Free conservé et génération locale disponible | Essais Free sur téléphone avec le futur paywall |
| Suppression du compte | Parcours in-app, Edge Function active et page externe publique | Test complet sur compte jetable, médias, échecs/reprise et conservation justifiée ; expliquer séparément la résiliation Google Play |
| Pages publiques | Confidentialité, conditions et suppression renvoient HTTP 200 sans connexion | Vérifier les URL saisies dans Play Console ; actualiser les textes pour Billing |
| UGC | Conditions, signalement des profils/messages/publications, blocage et interface staff présents ; RPC `nm_safety` déployée | Démontrer le traitement des signalements, la prise de décision et le blocage effectif ; vérifier l'accès aux outils de sécurité après passage à Free |
| Public adulte | Déclaration explicite 18+ et acceptation des conditions dans le code | Concordance audience cible, questionnaire IARC, captures et classification dans Play Console |
| Permissions photos | Manifeste source limité à Internet ; usages explicites `Camera.getPhoto` / `Camera.pickImages`, sans sauvegarde automatique en galerie | Contrôler le manifeste fusionné des SDK et tester caméra/sélecteur/refus ; aucune permission photo large ne doit être ajoutée par défaut |
| Publicité et analytics | Publicité désactivée dans les options ; analytics soumis au consentement | Data safety doit refléter les flux réels, pas seulement les noms de permissions |
| Génération / IA | README et moteur examinés : composition par règles locales, analyse de pixels et OCR ; aucune intégration de modèle génératif trouvée | Ne pas présenter ce moteur comme de l'IA générative distante ; réévaluer si un modèle génératif est ajouté |

La règle IA exige un signalement in-app des contenus offensants **si** l'application génère des contenus au moyen d'un modèle génératif. Elle n'est pas déclarée violée sur la seule présence du mot « génération » dans NailMoods. Les images IA éventuellement utilisées dans la fiche Google Play font l'objet d'une déclaration distincte lorsqu'elles entrent dans le champ prévu. Sources G10 et G11.

Les exigences UGC s'appliquent même à une communauté fermée. Pour les obligations spécifiques Child Safety Standards, confirmer la classification/fonctionnalité sociale applicable et, si NailMoods est dans le champ, les standards publics, la procédure de retrait/escalade et le contact désigné. La mention 18+ ne suffit pas à établir une exemption. Sources G12 et G13.

Les liens externes vers des vernis physiques ne sont pas, à eux seuls, un contournement du paiement de fonctions numériques. En revanche, ne pas y mêler un paiement alternatif Plus/Pro sans dispositif Google applicable. Les attributions bêta gratuites ne doivent pas masquer des ventes hors Play. Source G01.

## Catalogue audité à livrer avec Billing

Livrable associé : `NailMoods_V2_Fusion_V1_V2_auditee_2026-10-01.xlsx`.

- Taille vérifiée : 1 357 545 octets.
- SHA-256 : `5ee75d3dfba63791a99a3761486db494bf27d7a9e067d88a809f473f3d1fc9ff`.
- 2 984 lignes fusionnées, dont 934 nouvelles références.
- 2 631 références uniques actives ; 351 lignes à clarifier ; 2 alias.
- 1 047 associations GTIN vérifiées pour import.
- Les 21 contrôles de données du classeur ne remplacent pas ses 8 tests applicatifs encore à réaliser.

Joindre ce classeur au même lot de livraison que l'AAB Billing. Son existence et sa validation ne signifient pas qu'il est déjà embarqué dans l'application.

Avant intégration : utiliser les lignes actives et les codes marqués « Vérifié pour import », maintenir les identifiants `catalogId` existants via une correspondance explicite, préserver les collections personnelles, isoler les ambiguïtés et garder les identifiants/codes sous forme de texte. Tester la normalisation UPC/EAN/GTIN, les zéros initiaux, les codes non trouvés, les alias, l'OCR et les scans sur téléphone. Ne pas importer les 351 lignes incertaines comme références validées ni les codes rejetés/en attente dans l'index automatique.

Pour Google Play, la provenance factuelle d'une référence n'est pas une licence sur les photos, logos ou textes marketing du fabricant. Vérifier les droits sur les visuels effectivement utilisés et éviter toute présentation laissant croire à une affiliation aux marques. Source G14.

## Preuves et essais exécutés

- Lecture du dépôt au commit indiqué ; recherches croisées des appels Billing et des règles de droits.
- Lectures SQL uniquement sur les réglages, objets et définitions de fonctions ; inventaires des Edge Functions dans Production et Recette.
- HTTP 200 constaté sur les trois pages publiques : [confidentialité](https://mowaymcr.github.io/NailMoods/legal/confidentialite.html), [suppression](https://mowaymcr.github.io/NailMoods/legal/suppression-compte.html), [conditions](https://mowaymcr.github.io/NailMoods/legal/conditions.html).
- 30 tests existants réussis : `privacy.test.js`, `beta-tier.test.js`, `p3-product-support.test.js`, `mobile-wrapper.test.js`.
- `scripts/check-public-readiness.mjs` : configuration éditoriale complète ; ce contrôle ne valide pas les conditions commerciales de Billing.
- Première tentative incluant `beta-tier-integration.test.js` : échec de chargement car `@supabase/supabase-js` n'est pas installé dans ce checkout. Les fixtures réelles ne sont pas configurées. Aucun résultat d'intégration serveur n'est revendiqué ; les 30 tests ci-dessus ont été relancés seuls avec succès.
- Aucun AAB généré, signé ou importé ; aucun achat, remboursement, suppression de compte ou modification de droits effectué.

## Conditions du feu vert

1. Corriger B01 à B09, puis tests ciblés serveur et Android sur des comptes de recette.
2. Confirmer dans Play Console produits, plans, prix, pays, testeurs, droits API et déclarations ; garder les clés privées uniquement côté serveur.
3. Appliquer la migration corrigée et déployer la fonction en Recette ; vérifier les achats et tout le cycle de vie, les accès administratifs/fondatrices et l'absence de destruction de données ; poursuivre en Production selon le processus de livraison.
4. Actualiser les textes publics/embarqués et Data safety, vérifier l'accès de l'équipe Google aux parties restreintes sans dépendance à un OTP inaccessible, et obtenir les résultats des tests de modération/suppression/permissions.
5. Intégrer et tester le catalogue validé, puis produire l'AAB signé `0.3.0-beta.6` / `versionCode = 6` si ce code reste disponible dans Play Console. Livrer ensemble AAB, classeur audité, notes, preuves de recette et fichiers de symboles/mapping lorsqu'ils existent. `minifyEnabled false` ne garantit pas la production d'un `mapping.txt`.

## Sources officielles consultées le 1er octobre 2026

- [Centre des règles Google Play](https://play.google/developer-content-policy/).
- G01 — [Paiements](https://support.google.com/googleplay/android-developer/answer/9858738).
- G02 — [Versions admises de Billing](https://developer.android.com/google/play/billing/deprecation-faq).
- G03 — [Abonnements : information et résiliation](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en).
- G04 — [Données utilisateur](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en) et [suppression du compte](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
- G05 — [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- G06 — [Sécurité des achats](https://developer.android.com/google/play/billing/security).
- G07 — [API d'accusé de réception des abonnements](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/acknowledge).
- G08 — [Cycle de vie des abonnements](https://developer.android.com/google/play/billing/lifecycle/subscriptions).
- G09 — [API Android cible](https://support.google.com/googleplay/android-developer/answer/11926878) et [permissions minimales](https://support.google.com/googleplay/android-developer/answer/16935362?hl=en).
- G10 — [Contenu généré par IA](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en).
- G11 — [Déclaration des visuels IA dans Play Console](https://support.google.com/googleplay/android-developer/answer/17262077?hl=en).
- G12 — [Contenus générés par les utilisateurs](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en).
- G13 — [Protection des enfants et Child Safety Standards](https://support.google.com/googleplay/android-developer/answer/9878809?hl=en).
- G14 — [Propriété intellectuelle](https://support.google.com/googleplay/android-developer/answer/9888072).
- [Préparation de l'examen Google](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
