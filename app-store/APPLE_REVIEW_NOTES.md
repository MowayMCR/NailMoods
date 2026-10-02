# App Review — accès et notes

🟡 Aucun compte de démonstration ni mot de passe n’a été inventé/créé dans cette livraison. Ne pas soumettre les placeholders. Les secrets de ces comptes se saisissent directement dans Review Information et dans un coffre, pas Git.

## Préparer les comptes stables

Créer sur le backend exact du build final :

- compte Free review confirmé 18+, CGU à jour, sans grant manuel, Sandbox autorisé ; il expose le paywall et l’achat ;
- compte Plus manuel et compte Pro manuel pour tester immédiatement les fonctions correspondantes ; les expliquer comme comptes de démonstration ;
- deuxième compte social de démonstration, connecté au premier pour la messagerie, avec contenus fictifs approuvés ;
- compte jetable dédié suppression, sans abonnement ; ne pas supprimer le compte principal Apple Review ;
- une procédure de création d’un compte Free utilisable sans invitation payante/numéro privé. Email/mot de passe uniquement : aucune connexion Facebook/Google n’est implémentée, donc aucun flux de connexion tierce auquel ajouter Sign in with Apple n’a été trouvé.

Tester ces identifiants sur le binaire final depuis un iPhone externe. S’assurer que le staff répond pendant Review pour les nouvelles photos en attente. Ne jamais donner à Apple un accès staff/service-role. Le compte principal ne doit pas expirer pendant la review. Le taux de vérification email/password et le support ne doivent pas nécessiter Marie pour une connexion déjà préparée.

## Champs Review Information

Sign-in required : Yes. Username : `<EMAIL_FREE_REVIEW_A_SAISIR_DANS_APPLE>` ; Password : `<MOT_DE_PASSE_REVIEW_A_SAISIR_DANS_APPLE>`. Contact First name : Marie ; Last name : Chatelain (confirmer). Email : contact@nailmoods.com. Phone : `<TELEPHONE_REVIEW_A_FOURNIR>`. Pièce jointe : vidéo facultative des parcours avec données fictives, ne remplace pas l’accès réel.

## Notes à coller — anglais, compléter et relire

NailMoods is an account-based nail art app for adults aged 18 and over. It provides a product/color collection, local creative suggestions and drawing, a private Journal, and optional social features depending on the plan. Photo analysis and creative rendering in this build run locally; no personal content is sent to a third-party AI provider.

Please sign in using the Free review credentials above. Profile → My plan displays the StoreKit localized subscription price and period, Purchase Plus/Pro, Restore purchases and Manage subscription. Plus (nailmoods_plus) and Pro (nailmoods_pro) are auto-renewable subscriptions in the same group; Pro is the higher level. Access is granted only after our server verifies the Apple-signed transaction and current App Store Server API subscription state. The provided Free account is authorized for review Sandbox purchases. There is no external purchase flow.

For immediate feature access, additional demonstration accounts are available: Plus `<EMAIL_PLUS_REVIEW>` / `<PASSWORD_ENTERED_ONLY_HERE>` ; Pro `<EMAIL_PRO_REVIEW>` / `<PASSWORD_ENTERED_ONLY_HERE>`. These are manually granted demo entitlements independent of billing. Existing valid cross-platform entitlements remain available without requiring another purchase.

Suggested path: sign in, add a product/photo, create and save an inspiration, add a Journal entry, then submit a photo for publication. Uploaded public photos remain private until staff review. Approved demo publications are available in Discover. Open a demo profile to connect, message, report or block it. Blocking prevents new contact and access according to the relationship rules. Private Journal notes are never exposed to the moderation queue.

To test deletion, use the separate disposable account `<EMAIL_DELETE_REVIEW>` / `<PASSWORD_ENTERED_ONLY_HERE>`, then Profile → Manage my account → Privacy and my data → Delete my account, and type SUPPRIMER. This deletes account data and media; sent text messages may remain anonymized for their recipients. Deleting the NailMoods account does not cancel an App Store subscription; the screen explains this and provides Apple subscription management.

Support: contact@nailmoods.com. Privacy: https://nailmoods.com/legal/confidentialite.html. Terms: https://nailmoods.com/legal/conditions.html. Public support: https://nailmoods.com/legal/support.html.

## Avant collage

Remplacer toutes les valeurs entre chevrons dans Apple seulement. Vérifier les URL hors connexion après retrait de la protection Netlify. Traduire les labels ci-dessus si l’interface du build est française (Profil, Mon offre, Restaurer mes achats, Gérer mon abonnement). Retirer une fonctionnalité des notes si le test sur le binaire final n’aboutit pas ; ne pas promettre une génération distante ou un compte inaccessible.
