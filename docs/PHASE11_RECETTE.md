# Phase 11 — recette bêta V1

État : préparation et corrections livrées, validation utilisatrices en attente.
La Phase 12 et le packaging ne sont pas déclarés terminés.

## Modifications

- Nuancier partagé entre fiche produit et Scan & Génère : 26 teintes, 6 familles, pastilles tactiles de 44 px, couleurs récentes, couleurs de la collection, sélecteur libre, HEX.
- Le HEX choisi reste exact. Une correction manuelle ou par pipette remplace l'ancienne couleur catalogue dans la fiche personnelle ; le catalogue global reste inchangé.
- En scan photo, les couleurs extraites et la pipette sont accessibles dès la confirmation. Le bouchon/fond peut être détecté : la couleur exige toujours une vérification humaine.
- Aide Scan & Génère en deux étapes, relançable par (?).
- « Donner mon avis sur NailMoods » accessible en bas des écrans. Impact bloquant/gênant/cosmétique, bilan facultatif sans réponses préremplies, brouillon local, copie/téléchargement. Aucun envoi automatique.

## Scénario à réaliser sans accompagnement

Utiliser un téléphone réel et un navigateur/profil neuf (ou navigation privée). Ne pas effacer la collection habituelle. Le mode privé peut supprimer ses données à la fermeture : pour le test de persistance, utiliser un profil neuf non privé.

1. Ouvrir https://mowaymcr.github.io/NailMoods/ ; expliquer spontanément à quoi sert l'accueil.
2. Créer une idée via Inspire-moi sans remplir profil ni collection.
3. Scan & Génère : autoriser la caméra, photographier un produit, vérifier/corriger la couleur ; refaire en refusant la caméra et en choisissant une photo.
4. Ajouter éventuellement une seconde couleur, comparer les effets (French + brillant, French + mat, pas de préférence), générer et ouvrir la recette.
5. Ajouter un premier produit à la collection, avec une teinte exacte choisie au nuancier ou au HEX.
6. Chercher volontairement une référence absente ; essayer recherche externe, photo/étiquette, couleur, saisie manuelle. Continuer avec sa couleur.
7. Ajouter une planche de stickers et plusieurs tags (ex. floral, lune, doré). La sélectionner explicitement dans Mes décorations.
8. Générer avec 1, 2 puis 3 vernis ; avec/sans stickers ; avec/sans matériel. Vérifier les couleurs et les outils manquants indiqués.
9. Inspiration → recette → tutoriel → Je l'ai faite → journal. Ajouter date, note et photo ; vérifier schéma, produits, mood, recette et stickers.
10. Ouvrir les aides, passer, fermer, rouvrir et recharger : pas de réapparition automatique après fermeture.
11. Fermer puis rouvrir le navigateur normal ; retrouver collection, journal, profil et favoris.
12. Vérifier portrait/paysage, clavier mobile, boutons, textes, absence de superposition/scroll horizontal.
13. Remplir le bilan dans « Donner mon avis » ; copier/télécharger puis transmettre à Marie. Ne pas préremplir les réponses.

## Classification

- **Bloquant** : fonction essentielle inutilisable. Priorité avant poursuite.
- **Gênant** : action possible mais incompréhension/friction importante. Corriger avant packaging.
- **Cosmétique** : confort/visuel. Roadmap si non bloquant.
- Scan : fiable / partiel mais utilisable / bloquant, selon l'essai réel (pas le score interne).

## Vérifications techniques et limites

Les tests automatisés utilisent des stockages mémoire vierges. Ils couvrent les générations avec/sans collection et matériel, les teintes précises, stickers, recettes, tutoriels, persistance journal, aides, produit inconnu et non-régression KIKO. Ils ne remplacent pas une session réelle vierge sur téléphone.

Test photo dans le navigateur distant : photo face avant KIKO → noir du bouchon estimé ; photo dos → EAN 8059385036113 décodé, conservé, inconnu du catalogue. OCR indisponible dans cet environnement. Cela motive l'accès direct aux couleurs extraites et à la pipette. Aucune réussite de reconnaissance exacte n'est revendiquée.

Le stockage reste local à ce stade. Les permissions caméra, capture native, compréhension sans accompagnement et reprise après fermeture sur téléphone restent à valider par les testeuses. Aucun compte externe neuf n'est simulé.

## Registre à remplir pendant la bêta

| Identifiant | Écran | Impact | Étapes pour reproduire | Attendu / observé | Appareil / navigateur | Statut |
|---|---|---|---|---|---|---|

Freeze V1 seulement après absence de bloquant/gênant restant et validation humaine du scénario.
