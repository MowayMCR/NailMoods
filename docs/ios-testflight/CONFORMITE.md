# Tableau de conformité Apple — preuves et actions restantes

Audit au 5 octobre 2026. « Préparé », « testé » et « à valider » sont distincts. Aucun statut ne constitue une approbation d'Apple. Les preuves finales de CI sont reliées dans le dossier et la PR #11.

| Exigence | Statut | Preuve | Action restante |
|---|---|---|---|
| Source actuelle | Vérifiée | Branche mobile 1418e47 commune Apple/Android/DA06, descendante du correctif contour main | Conserver le commit source dans chaque run |
| Xcode/SDK Apple 2026 | Configuré, première compilation simulateur réussie | macOS15, Xcode26.3 sélectionné, SDK26.2 ; contrôle SDK≥26 | Résultat final archive/test puis validation d'upload Apple |
| Bundle ID | Code configuré, enregistrement Apple non vérifié | com.nailmoods.app existant dans source ; variable override | Marie vérifie Developer/Connect/profil, IOS_BUNDLE_ID et confirmation true |
| Version/build | Préparé et testé | 0.8.0 ; numéro CI indépendant 10000+run ; Android code9 conservé | Numéro Apple inédit avant upload |
| Signature/provisioning | Pipeline préparé, non exécuté | Certificat/profil/Team/expiration/type/correspondance contrôlés ; nettoyage | P12, password, profil App Store et API key upload dans sept secrets |
| Privacy Manifest app | Présent et embarqué | PrivacyInfo.xcprivacy, tracking=false, catégories de collecte | Relire la déclaration avec exploitation réelle et upload Apple |
| Required Reason APIs | Raisons déclarées | UserDefaults CA92.1, FileTimestamp C617.1 ; manifests SDK embarqués | Vérifier toute future API/extension avant livraison |
| SDK tiers | Versions épinglées, compilation réussie | Capacitor8.5.2, plugins exacts, package-lock ; inspection des manifests du bundle | Contrôles Apple sur IPA signé ; conserver Package.resolved transitive |
| App Privacy | Tableau préparé | APP-PRIVACY.md issu client/backend ; aucune déclaration inventée depuis Android | Saisie Connect, confirmer prestataires/logs hors dépôt |
| ATT | Non requis pour comportement audité | Pas de pub/IDFA/attribution ; analytics internes consentis ; absence clé ATT | Réaudit avant toute publicité/partage publicitaire |
| Suppression compte | Implémentée, RPC/Edge déployés vérifiés | Trois RPC nm_account_deletion_*, account-delete active ; tests locaux de cascades | Essai physique avec compte jetable, médias, autre session et données sociales |
| UGC/modération | Backend complété ; parcours authentifié à valider | RPC social/support réelles ; migration prépublication appliquée ; une photo en attente, triggers présents | Staff traite la file ; essais signaler/bloquer/retrait/approbation sur deux comptes |
| StoreKit/Google séparés | Client/natif préparés et tests réussis | Provider Apple ; JS iOS inspecté sans Google endpoint/bridge | Achat Sandbox réel et inspect IPA signé |
| Paywall/restauration | Présents, pas de preuve Sandbox réelle | Prix/périodes StoreKit, liens, restore/manage, validation serveur | Produits exacts, contrats, prix/durées et recette achats |
| Serveur Apple | Fonctions déployées et achats fermés | apple-verify/notifications v1 ; refus 401/400 ; migrations/cron présents, enabled=false | Secrets IAP, racines, URL notifications/reconcile, un compte Sandbox, tests JWS valides |
| Droits manuels | Priorité préparée/testée localement | Calcul multi-source et cas d'expiration/revocation | Recette Sandbox avec droit Plus/Pro offert préservé |
| Groupe abonnements | Convention préparée | Un groupe, Pro niveau1 / Plus niveau2 | Vérifier/créer produits dans Connect sans doublon |
| Multiseat | Désactivation documentée, état Apple inconnu | GUIDE-MARIE chemin Purchase Options | No sur chaque produit ; contrôler Family Sharing individuel |
| Chiffrement | Analyse client et plist préparés | HTTPS/TLS système, PKCE SHA256 ; ITSAppUsesNonExemptEncryption=false | Répondre à éventuelle demande Apple selon code livré ; aucune crypto propriétaire constatée |
| Age rating | Questionnaire préparé, non saisi | UGC/messagerie présentes ; restriction contractuelle18+ | Questionnaire réel, classement calculé puis override minimum si CGU l'exigent |
| DSA UE | Préparation future, sans blocage TestFlight | Source Apple : TestFlight-only n'est pas distribution App Store Trader | Titulaire déclare statut/coordonnées vérifiables avant sortie publique UE |
| Compte Review | Procédure et notes préparées ; compte non créé | APP-REVIEW.md ; aucun accès staff prévu | Marie crée email/password hors chat et confirme/onboarde le compte |
| iPad/orientations | Projet corrigé, CI en cours au moment du tableau | Familles1/2 ; iPhone portrait, iPad portrait/paysage ; layout large et grilles | Résultats CI finaux + iPad physique, clavier, média, Split View |
| Deep links | Schéma/parser/test préparés | Schéma historique com.nailmoods.app ; PKCE/code ; aucun Associated Domains annoncé | Deux redirects Supabase et essai confirmation/recovery sur iPad |
| Permissions | Client minimisé | Caméra à la demande ; PHPicker, saveToGallery=false ; rappels locaux ; EventKit UI≥17/.ics16 | Caméra refusée/réactivée, galerie, notifications/calendrier sur matériel |
| IA+ | Fermé serveur et à la compilation iOS | enabled=false/public_enabled=false ; endpoints exclus du JS inspecté | Nouvelle version et nouvelle revue avant ouverture future |
| Android | Compilation AAB de contrôle réussie | GitHub run37303060344 ; package/code9 conservés | Répéter uniquement si une nouvelle modification affecte le code commun |
| TestFlight | Upload préparé, aucun build envoyé par cette mission | Workflow verify/testflight ; altool actuel ; aucun credentials fourni | Sept secrets + variables, run testflight, traitement Apple et groupe interne |

## Chiffrement : réponse motivée

Le client utilise HTTPS/TLS et les services du système, un challenge PKCE SHA-256 et des UUID aléatoires. Aucun algorithme de chiffrement propriétaire, bibliothèque de chiffrement de contenu/messages, VPN ou E2EE n'a été identifié. Les signatures JWS Apple sont vérifiées côté serveur. La valeur préparée `ITSAppUsesNonExemptEncryption=false` signifie **absence de chiffrement non exempt**, pas absence totale de cryptographie. Pour une question sur les algorithmes implémentés dans l'app au-delà des services Apple OS, choisir l'absence de tels algorithmes si le code reste identique. Si Apple demande des éléments spécifiques ou si une librairie crypto client est ajoutée, reprendre l'analyse avant répondre.

## Classification d'âge — réponses issues du produit

Connect → Apps → NailMoods → General → App Information → Age Ratings → Set Up / Edit. Ne pas choisir Kids. Remplir les fonctions réelles : contenu généré par les utilisateurs **Oui**, messaging/chat **Oui**, réseau social / Social Media **Oui** (Fil/Découvrir, profils, favoris et partages), Social Media Disabled for Users Under 13 **Non** au sens technique Apple (Declared Age Range API non intégrée, malgré la restriction contractuelle18+), publicité **Non**, contrôle parental dédié **Non**, navigateur Internet libre **Non** (liens produit/légaux ciblés et scan ne sont pas un navigateur libre), mécanisme de vérification d'âge forte **Non** si Apple vise une assurance vérifiée : l'app utilise une déclaration 18+, pas une pièce d'identité ou contrôle d'âge externe.

**Health or Wellness Topics : Oui**. Mes repères personnels propose des observations sur l'état des ongles et des suggestions de pause/personnalisation ; le catalogue comporte des produits de soin. Apple inclut les recommandations de self-care/lifestyle dans cette question. **Medical or Treatment Information : None** dans le code actuel : pas de diagnostic ni de traitement d'une condition médicale. Cette distinction ne dispense pas de déclarer Health dans App Privacy pour les observations ciblées synchronisées.

Le contenu fourni par NailMoods ne propose ni violence, sexualité/nudité, drogues, alcool, jeu d'argent, concours, peur ou langage offensant. Répondre aux fréquences selon les contenus réellement proposés lors de la saisie ; contrôler aussi les publications UGC et les tutoriels. Les fonctions sociales sont à déclarer même si leurs usages abusifs sont interdits/modérés.

Apple calcule un âge à partir du questionnaire. Puis, **Additional Information → Age Categories and Override → Override to Higher Age Rating**, choisir le minimum compatible avec les CGU18+ si le classement calculé est inférieur. Apple demande cet override lorsque le minimum contractuel dépasse son calcul ; il ne faut pas inventer de contenu violent/sexuel pour augmenter artificiellement le résultat. Les classements des anciens OS et de certaines régions peuvent différer.

## DSA, future distribution publique France/UE

Connect → **Business → Agreements → Compliance → Digital Services Act → Complete Compliance Requirements**. Le titulaire choisit le statut correspondant à l'activité réelle. Si NailMoods est proposé professionnellement, préparer les coordonnées du trader : nom légal, adresse, téléphone, email, justificatifs/registre selon forme juridique, vérifications demandées par Apple. Les coordonnées du trader apparaissent sur la fiche UE. Ne pas inventer une société ou cocher non-trader pour éviter la vérification. Le TestFlight seul n'est pas une distribution publique App Store ; traiter cette étape avant une sortie UE ultérieure.

## Exploitation UGC et limites

La migration UGC appliquée rend les nouvelles photos proposées publiques privées jusqu'à approbation staff. Une ancienne photo publique est entrée en file et est conservée. Les notes Journal privées/messages ne sont pas copiées dans cette file. Staff → Journal staff → Photos avant publication, puis aperçu/approbation/refus. Les filtres textuels actuels sont limités : leur présence ne prouve pas une détection exhaustive d'abus. Garder signalement, blocage, support et traitement humain opérationnels. Objectifs affichés dans l'app : support/compte48h ouvrées, signalements24h ouvrées, urgent dès lecture. Les objectifs ne valent pas preuve de permanence réelle.

Rollback UGC : traiter/valider la photo en file avec staff, sans la republier sans revue. Un rollback logiciel n'exige pas supprimer les tables ou les signalements. Toute modification de la politique de modération doit être décidée et testée séparément.
