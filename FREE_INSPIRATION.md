# Règle produit Free — inspiration immédiate

La génération est centrale et toujours accessible, sans collection, profil, outils, stickers ni compte serveur. Ces éléments personnalisent les résultats ; ils n’autorisent pas l’accès. Cette règle remplace le comportement historique de blocage documenté dans BETA_READINESS.md.

## Implémenté
Deux intentions visibles : Inspire-moi (palette de couleurs de style, sans fausses références commerciales) et Avec ma collection (teintes personnelles). Une collection vide bascule explicitement sur une inspiration libre. Des choix impossibles proposent une alternative signalée. Aucun produit ou outil inventé n’est écrit dans la collection.
Le moteur de composition est réutilisé. La couche produit Free autorise le matériel absent, privilégie les poses simples selon le niveau et affiche les éléments nécessaires à la réalisation. Une lampe compatible reste nécessaire à la pose physique d’un semi-permanent, mais jamais à l’affichage d’une inspiration. Les variantes sans pinceau/dessin sont accessibles depuis la fiche quand des éléments manquent.
Les idées de style peuvent être sauvegardées, rouvertes et déclinées avec leur aperçu ; leurs couleurs sont identifiées comme concepts et non comme produits possédés. Les anciens snapshots ne sont pas modifiés.
L’accueil peut proposer une idée sans inventaire. Les aides n’imposent plus d’ajouter un vernis avant de découvrir la génération. En cas d’échec catalogue/import, les champs manuels restent disponibles, ainsi que photo, URL et correction de teinte ; un lien de recherche publique est proposé. Les correspondances proches existantes restent proposées par la reconnaissance d’étiquette lorsqu’elles existent.

## Vérifications
127 tests réussis, build production réussi. Tests dédiés : profil/collection/outils/stickers vides, génération et sauvegarde de compositions de style, semi-permanent sans lampe avec vraie teinte prioritaire et exigence de lampe pour réalisation, options incompatibles avec alternative, aucune mutation de l’inventaire. Deux tests d’anciens blocages ont été remplacés par les assertions de la nouvelle règle. Le calcul strict de compatibilité interne reste testé séparément ; il ne conditionne plus l’accès au générateur produit.

## Critère externe restant
Pas de compte propriétaire/administrateur ni d’authentification dans cette version : les données sont locales au navigateur. Le navigateur de contrôle contient les données QA précédentes et n’expose pas de contexte privé neuf pilotable. Le test automatisé vierge ne remplace donc pas une première visite complète dans un nouveau navigateur. Ce critère demandé ne peut pas être déclaré validé sans cet essai.

## Vérification publique
Commit applicatif f2103a4dd6e368e963fa69d5397ddad2f009c168 ; workflow 35347876993 terminé avec succès. Sur le lien public : sélection Inspire-moi, génération de quatre compositions libres, sauvegarde d’une idée et réouverture après rechargement, couleurs explicitement signalées comme couleurs de style ; sélection Avec ma collection et génération de quatre idées avec les produits QA. Inventaire préexistant du navigateur : trois couleurs et une lampe. Ce test public ne satisfait pas le critère de session intégralement vierge, qui reste ouvert.
