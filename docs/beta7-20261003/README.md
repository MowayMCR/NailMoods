# NailMoods — candidat Android bêta 7 / scan

Date : 3 octobre 2026. Code : `563cbf7b22229c3f964d73a95c4c488f2200a480`.

## Livraison

Android Production : `com.nailmoods.app`, version `0.3.0-beta.7`, versionCode `7`.
Marie a demandé le 3 octobre de terminer et livrer l’AAB après information sur le blocage de signature. La clé d’importation existante et son mot de passe ont été récupérés sans affichage ni inclusion dans le dépôt. Son certificat SHA-256 correspond au certificat d’importation Play Console relevé le 2 octobre. Le bundle final est signé et validé : certificat existant, signature stricte et bundletool contrôlés, 1 139 fichiers de contenu inchangés après signature.

Le dernier bundle livré était le code 6. Le code 7 est préparé conformément à la demande ; l'état actuel de Play Console n'a pas été relu dans cette session. Si un code 7 y a déjà été importé ailleurs, il faudra construire un code supérieur.

## Changements

- Récupération du code réellement déployé dans `product-lookup` Production v2, qui n'était pas encore sauvegardé dans Git : fournisseurs officiels supplémentaires et normalisation des marques.
- Reconnaissance de Maybelline/Gemey, Monoprix/Monop' Make Up, Fashion Make Up, H&M, Yves Rocher, Essie et Biguine même lorsque le catalogue ne contient pas leur produit. Biguine reconnu ne signifie pas catalogue Biguine complet.
- Correction de la sélection des variantes officielles autres que Shopify : conservation de la bonne référence, source et couleur publiée, puis confirmation par l'utilisatrice.
- Complément local de 117 identités issues des fiches officielles : Yves Rocher 22, H&M 17, Fashion Make Up 72, Monoprix 6. Aucun HEX inventé ; ces 117 fiches ne contiennent pas de nouvelle couleur exacte publiée.
- Catalogue V2 d'origine conservé : 2 631 fiches, 1 047 associations de codes vérifiées. Son empreinte source correspond exactement à l'Excel joint. Supplément KIKO Smart conservé : 64 fiches. Total des trois fichiers : 2 812 fiches.
- Numérotation Android portée à bêta 7 / code 7. Le numéro iOS reste inchangé ; le code partagé est propagé sur la branche Apple.

Branches sauvegardées : `feat/google-play-billing-beta6` (nom historique conservé) et `feat/apple-storekit-ios`. Aucun changement du site public, des offres ou des droits bêta n'a été demandé ni appliqué dans cette passe.

## Portée et limites du scan

Le parcours reste catalogue local, puis recherche serveur si l'identité locale est insuffisante, proposition sourcée et confirmation avant ajout. Il ne recherche pas tout Internet : seuls les fournisseurs intégrés et Open Beauty Facts pour les codes-barres sont interrogés. Aucun catalogue de marque n'est annoncé exhaustif.

Maybelline, Essie et Fashion Make Up disposaient déjà d'un fournisseur serveur déployé ; la présente passe a récupéré ce code sans prétendre répéter tous les appels authentifiés précédents. Les sites Monoprix, H&M et Yves Rocher peuvent être inaccessibles depuis le serveur. Les 117 fiches embarquées réduisent cette dépendance pour les références effectivement ajoutées.

Le mot « béguin » de la demande précédente reste ambigu : Biguine est reconnu comme marque possible, sans inventer de références ni renommer un produit existant. Une référence absente reste ajoutable manuellement ou par son lien.

Les tests navigateur utilisent des photos synthétiques, le moteur OCR et le lecteur WASM réels. Les parcours Internet du navigateur rejouent une réponse serveur archivée pour isoler le formulaire et la sauvegarde. Ils ne constituent pas une nouvelle validation réseau authentifiée ni un test caméra physique Android/iOS.

## Vérification

- Suite automatisée : 68 fichiers de tests passent, aucun fichier en échec sous Node 24. Les intégrations nécessitant des comptes réels restent conditionnelles.
- Tests dédiés : marques absentes du catalogue, chaque référence du complément retrouvable, choix de variante et priorité de la couleur manuelle.
- Build web Production réussi, assets OCR locaux inclus.
- Interface Internet : trois parcours réussis (fiche/Collection/rechargement, cache hors connexion, couleur personnelle conservée).
- La preuve native Android et la validation du bundle sont ajoutées dans `evidence` après compilation.

CI Android : https://github.com/MowayMCR/NailMoods/actions/runs/37133113490

## À terminer

1. Installation du candidat et recette sur téléphone : caméra autorisée/refusée, code et étiquette, bonne référence/gamme, couleur, ajout/rechargement, hors connexion, référence inconnue.
2. Importation du bundle signé dans le canal de test existant et vérification de son acceptation par Google Play. Rien n'a été publié sur Play dans cette session.

Ne transmettre ni clé privée ni mot de passe dans la conversation. Les fichiers de signature ne font pas partie du package.

## Correctifs Pro ajoutés

- Catégorie gel de construction détectée sur la gamme BIAB, conservée à l’import.
- Bases, tops, primers, cleaners, dépose et gels sans teinte enregistrables sans HEX inventé.
- Produits auxiliaires et gels sans couleur confirmée exclus de la génération de poses.
- Alias DND, Luxio et TGB reconnus.
- Contrôle navigateur : primer et BIAB sans couleur, ajout puis Collection après rechargement ; deux cas réussis.
- Les cinq cas de scan existants restent réussis. Caméra physique toujours non testée.

## Fichier livré

`NailMoods-Beta7-2026-10-03.aab` — 39 252 516 octets.

SHA-256 : `a857179383e664e0771385f3029497d797dd0f51d8255ed6587413be03a60043`.

Compilation Android complète réussie. Aucune importation Play effectuée ; caméra physique non testée.
