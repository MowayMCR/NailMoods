# NailMoods — accès, abonnements et livraison bêta

Audit et réalisation du 7 octobre 2026. Point de départ : `75f5187fd70d3dac981d0e6112f4f46788fa7c72` sur le tronc commun. Les modifications de cette branche ne sont pas une activation commerciale ni une publication publique.

## État vérifié

| Sujet | Existant dans le code | Déploiement production observé | Modification livrée / recette | Configuration et essais restant nécessaires |
|---|---|---|---|---|
| Apple | StoreKit 2, `nailmoods_plus` / `nailmoods_pro`, appAccountToken, transactions JWS vérifiées côté serveur, notifications V2, restauration / gestion | Vérificateur, notifications et réconciliation périodique présents ; achats **désactivés** | Garde de session serveur, prévention des achats avec un droit institut, erreur de propriété expliquée aussi en restauration | Produits, accords, fiscalité, banque, secrets et notifications à vérifier dans les consoles ; Sandbox sur appareil et TestFlight non exécutés ici |
| Google | Billing natif, Subscriptions V2 serveur, propriété des jetons, réconciliation périodique | Vérificateur et tâche périodique présents ; achats **désactivés** | Respect de canPurchase côté client, droits composites Apple/Google/manuels/institut | Vérifier produits, base plans, testeurs, credentials Publisher et essais Play ; pas de nouveau service RTDN livré, réconciliation existante conservée |
| Droits | Tables de droits manuels/bêta et registres Apple/Google distincts ; résolution serveur existante | Sources manuelles + stores présentes | Extension du résolveur existant par les droits instituts encore valides ; `granted_tier` NULL par défaut | Décider les droits commerciaux Institut avant attribution ; aucune conversion automatique d’un institut existant en offre payante |
| Sessions | Auth Supabase existante | Aucune garde applicative immédiate observée | Pointeur serveur par session Auth réelle, retrait des anciennes sessions Auth, politiques restrictives et guards des RPC / fonctions serveur | Migrations appliquées **en recette uniquement** ; garde testée activée puis remise à OFF ; essais Web↔Android↔iOS physiques et activation coordonnée encore requis |
| Équipes | Espaces, membres, rôles, invitations individuelles par identité, places et transfert déjà présents | Fonctionnalités existantes présentes | Codes communs soumis à approbation ; QR ; invitations e-mail à durée limitée et usage unique ; quotas sous verrou ; suspension lors d’une réduction sans suppression | UI nouvelle derrière flag ; partage manuel des invitations, aucun e-mail automatiquement envoyé ; contrat Institut non défini |
| Mises à jour | Plusieurs workflows et branches anciennes | Des workflows anciens fixaient la source iOS à une branche dépassée | Coordinateur `store-beta.yml` : même SHA exact pour Android/iOS, tests, versions uniques, provenance, upload Google non public et TestFlight | Configurer secrets et validation GitHub ; compilations natives et envois stores non déclarés réussis sans résultats CI |

Production auditée en lecture seule : `rvqmtnqvzzxzwfxfyjcg`. Recette utilisée : `pueqkbwfwxgqzmkauxoz`. Les tâches Apple et Google de réconciliation sont actives en production ; leurs flags d’ouverture commerciale sont faux. Aucun compte de production ni droit existant n’a été modifié pendant ces essais.

## Choix techniques

La session autorisée est enregistrée à l’insertion d’une session Auth, pas à un rafraîchissement de jeton ou de page. Une insertion plus récente remplace l’ancienne ; les connexions concurrentes sont arbitrées par la ligne serveur avec ordre déterministe date/UUID. Les JWT encore valides de l’ancienne session sont refusés par RLS et les RPC gardées, sans attendre leur expiration. Les API privilégiées vérifient aussi la session avant d’utiliser service_role. Les refresh sessions remplacées sont supprimées uniquement lorsque la garde est activée. Un changement de réseau n’entraîne pas de déconnexion.

Le contrôle visuel intervient au premier plan, au retour réseau et périodiquement. Le message demandé est fourni à l’ancien appareil. Les données locales sont conservées ; la synchronisation protégée exige une reconnexion. Les créations non synchronisées doivent être récupérées sur l’appareil d’origine ; elles ne sont pas transportées automatiquement vers le nouvel appareil. Le flux de récupération du compte existant est conservé. Le bouton de déconnexion des autres appareils ne permet pas à une session déjà révoquée de reprendre la main.

Les politiques ajoutées sont restrictives et conservent les anciennes règles de propriété. Aucun accès à un institut ne publie les collections, journaux ou messages personnels. La réduction des places suspend les membres excédentaires en conservant les lignes et les données, propriétaire prioritaire puis ordre d’arrivée. Le quota reste un paramètre d’administration, pas un achat implicite. Les responsables peuvent gérer les invitations et demandes ; seule la propriétaire peut modifier les rôles ou transférer la responsabilité, selon les API existantes.

Les QR communs contiennent un code de demande, jamais un mot de passe ou un accès direct aux données. Les invitations contiennent un jeton de rattachement lié à l’e-mail confirmé, et expirent au bout de 7 jours. Les codes / jetons sont hachés en base. Les tentatives sont limitées à 20 par compte et par minute ; les limites Auth/CAPTCHA restent une configuration complémentaire. Les événements de membres et de droits ne contiennent pas les secrets. La rétention de cette nouvelle trace doit être validée avant la production.

Un accès provenant d’un institut empêche actuellement la proposition d’un nouvel abonnement personnel pendant sa validité. C’est volontairement conservateur, y compris pour une éventuelle montée Plus→Pro : cette évolution nécessite une règle commerciale encore non définie. Aucun abonnement déjà actif n’est résilié par l’application.

Les lectures de médias utilisent des téléchargements authentifiés. La nouvelle politique interdit la création de capacités signées par les clientes pour les trois buckets applicatifs. Le rendu IA privé ne fournit plus de lien signé réutilisable. Les liens signés déjà émis avant cette migration restent valables jusqu’à leur expiration ; les liens IA précédents duraient 600 secondes. Une révocation anticipée générale requiert l’aide Supabase. Les fichiers déjà téléchargés / captures et les appels fournisseurs déjà en cours ne peuvent pas être retirés rétroactivement.

## Validation effectuée

- `npm test` : 572 tests, 570 réussis, 2 tests live historiques ignorés, aucune erreur. Les tests des droits Apple/Google, expirations, remboursements, ordre des événements et propriété des achats présents dans le projet sont conservés. Ces tests ne remplacent pas les achats Sandbox réels.
- Tests PGlite complémentaires : anciennes lectures/écritures et RPC refusées ; actualisation sans reprise de session ; invitations incorrectes, expirées, révoquées ou réutilisées ; code soumis à approbation ; quota ; suspension ; droit manuel préservé.
- Essai réel Auth/Postgres/Storage/Edge en recette avec comptes jetables : **35 contrôles réussis**, dont acceptations concurrentes de la dernière place, Auth ancien compte refusé, ancien JWT refusé pour données et service IA, liens signés refusés. Résultat : [tests/recette-results.json](tests/recette-results.json).
- Tous les comptes jetables et leur espace ont été supprimés. La garde a été remise à OFF à la fin du test. Le worker temporaire est désactivé et sa fonction SQL de préparation supprimée.
- Contrôle de couverture recette : aucun RPC definer client non gardé, aucune table publique RLS sans politique de session, aucun view public contournant RLS observé.
- Bundle Web iOS compilé et vérifié : StoreKit inclus, pont Google et laboratoire IA exclus, fonctions communes conservées, build et SHA enregistrés. Ceci ne constitue pas une archive Xcode signée.
- Contrôle visuel Chromium : téléphone et cinq formats tablette, portrait/paysage, six écrans ; aucune erreur JavaScript. La feuille iPad de la branche native existante a été réintégrée au tronc commun. Ce contrôle n’est pas un essai de gestes ou d’achats sur iPad réel.
- La compilation AAB native exige Java 21 et Android SDK ; l’archive iOS exige macOS/Xcode. Ces environnements ne sont pas présents dans le poste Linux utilisé. Le workflow commun prépare les vérifications sur les runners appropriés ; l’envoi et la disponibilité restent des étapes distinctes.

## Livraison et retour arrière

1. Vérifier les migrations nouvelles dans l’ordre des fichiers `2026100718…`, sur un projet de test et une copie de données anonymisées. Le dossier `tests/recette` contient le gate et le harnais jetable ; sa préparation SQL n’est **jamais** une migration de production.
2. Tester les écrans avec `VITE_SESSION_SECURITY_ENABLED=true` et `VITE_INSTITUTE_ACCESS_ENABLED=true` en recette. Pour les builds livrés, ces flags restent OFF tant que le backend et les parcours appareils ne sont pas validés ensemble.
3. Après validation, fusionner le tronc commun et reprendre **le même commit** pour les deux plateformes. Les branches d’intégration peuvent pointer vers ce commit ; aucune fonctionnalité commune n’est développée une seconde fois. Les anciens workflows de compilation n’activent aucun upload commercial.
4. Déployer les migrations et les huit fonctions serveur correspondantes en production pendant une fenêtre suivie. Vérifier `tests/recette/assert-security.sql` avant activation. Activer ensuite le flag serveur et publier les clientes compatibles selon le parcours bêta validé. Ne pas activer les achats payants en même temps que les essais de sécurité.
5. En cas d’incident Auth : `update private.nm_session_settings set enabled=false where singleton;` désactive immédiatement la garde et le retrait automatique des sessions. Une session déjà supprimée ne ressuscite pas : la personne se reconnecte. Aucun contenu ou droit n’est supprimé.
6. Pour l’interface Institut, remettre son flag OFF. Ne pas DROP les tables de droits / invitations / membres créées et ne pas supprimer les données pour revenir à l’ancienne interface. Réparer en migration suivante ; conserver sauvegarde et journal de migration. Les définitions RPC précédentes sont sauvegardées dans `private.nm_session_function_backup`, mais leur restauration globale n’est pas automatique puisqu’elle écraserait les évolutions ultérieures.
7. Workflow `Common validated beta — Android and TestFlight` : mode `verify` par défaut ; mode `beta` uniquement avec SHA égal au tronc commun courant et validation de l’environnement `store-beta`. Google autorise seulement internal/alpha/beta ; TestFlight reste une bêta. **Aucune publication publique automatique** n’est incluse.

## Actions manuelles restantes

| Service / écran | Informations ou action nécessaires |
|---|---|
| GitHub → dépôt → Pull requests | Revoir et fusionner la livraison ; sélectionner son SHA exact pour le build commun. La production sécurité reste OFF avant les essais appareils. |
| GitHub → Settings → Environments → `store-beta` | Ajouter Marie comme reviewer requis, empêcher l’auto-approbation et restreindre aux références approuvées. Ne pas compter sur le seul nom de l’environnement pour imposer une validation. |
| GitHub → Settings → Secrets and variables → Actions / environnement | Android : `ANDROID_UPLOAD_KEYSTORE_BASE64`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`, `GOOGLE_PLAY_PUBLISHER_JSON`. Apple : les sept noms listés dans `ios-testflight.yml`. Aucun secret dans le dépôt. |
| Play Console → Configuration → Accès à l’API / Utilisateurs et autorisations | Autoriser le compte de service Publisher pour NailMoods et la piste bêta choisie ; confirmer que la clé de signature est la clé d’envoi déjà enregistrée. |
| Play Console → Monétiser → Produits → Abonnements ; Tests | Vérifier IDs, base plans actifs, prix/durées et testeurs sous licence. Exécuter achat, attente, restauration, grâce, incident de paiement, expiration et remboursement en test avant ouverture. |
| App Store Connect → Contrats / Banque / Fiscalité ; NailMoods → Abonnements | Terminer les accords, groupe Plus/Pro, IDs, localisations et tarifs réels. Vérifier bundle enregistré et App Apple ID avant signature. |
| App Store Connect → Informations sur l’app → Notifications serveur ; Supabase → Functions → Secrets | Configurer Notifications V2 pour production et Sandbox vers `apple-notifications`, clé App Store Server API et paramètres correspondants. Envoyer une notification TEST et vérifier réception/signature, puis récupération après panne. |
| App Store Connect → Utilisateurs et accès → Sandbox ; TestFlight | Essais réels StoreKit sur iPhone/iPad, reprise des transactions inachevées, restauration, autre compte, abonnement annulé encore payé, remboursement / révocation et montée/descente d’offre. Contrôler traitement et disponibilité du build. |
| Supabase → Authentication → Settings / Sessions / Rate limits / Attack protection | Vérifier plan et réglages de sessions, durée JWT, SMTP et liens Web/natifs ; Single-session natif ne suffit pas à bloquer immédiatement un JWT. Activer la protection des mots de passe divulgués signalée par l’advisor, régler limites et CAPTCHA selon le trafic. Le secret CAPTCHA ne se met pas dans l’app. |
| NailMoods — décision commerciale Institut | Définir droits, places, durée, rétention d’audit et mode de facturation conforme aux deux stores. Aucun prix ni quota futur n’a été inventé. Les codes ne constituent pas une remise ou un paiement alternatif. |

## Références officielles vérifiées

- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions) : session_id, vérification des sessions révoquées, contrôle natif au refresh et limite de validité JWT.
- [Supabase Storage helpers](https://supabase.com/docs/guides/storage/schema/helper-functions) et [médias privés / liens signés](https://supabase.com/docs/guides/storage/serving/downloads).
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) : paiements numériques et exception entreprise, à vérifier pour une application mixte particulière/pro.
- [Apple appAccountToken](https://developer.apple.com/documentation/storekit/product/purchaseoption/appaccounttoken(_:)), [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi), [notifications V2](https://developer.apple.com/documentation/appstoreservernotifications).
- [Google Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions), [backend sécurisé](https://developer.android.com/google/play/billing/security), [Publisher bundles.upload](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload).
- [Apple upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/).
