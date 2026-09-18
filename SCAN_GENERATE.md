# Scan & Génère — intégration NailMoods

## Disponible

- Carte d’accueil et route `#scan`, sans collection, profil complet ni statut payant.
- Parcours Couleurs → Effet → Idées ; 1 ou 2 produits maximum.
- Caméra arrière via demande navigateur, fermeture/libération du flux ; galerie et couleur manuelle en secours.
- Photo redimensionnée ; palette extraite des pixels, correction HEX ou prélèvement sur la photo. Les reflets et la lumière limitent la précision : confirmation obligatoire.
- OCR local facultatif et catalogue existant en lecture seule ; candidats explicites, jamais de référence automatiquement validée. La couleur suffit pour continuer pendant la reconnaissance ou si le catalogue/OCR est indisponible. Une marque connue peut être proposée si le texte la contient.
- Identité, finition et type corrigeables ; les références non reconnues restent personnelles/non vérifiées. Aucun enrichissement automatique du catalogue global.
- Classique, Mat, Brillant, French, sans préférence ; deux effets compatibles maximum. Choisir Mat remplace Brillant, choisir French remplace Classique, et réciproquement.
- Aperçus et recettes réutilisés. Les teintes scannées restent les seules couleurs de vernis principales ; les zones d’ongle naturel sont explicitement signalées. Stickers et outils réellement renseignés peuvent enrichir les propositions. Les protocoles et outils nécessaires restent indiqués.
- Voir le détail, refaire, changer l’effet, recommencer avec une autre couleur. Les données du parcours sont temporaires ; quitter/recharger le parcours les réinitialise.

## Architecture et limites réelles

L’application actuelle a un profil local anonyme, sans comptes ni abonnements vérifiés. Le parcours de base est disponible à tout le monde.

`ScanGenerate` expose `capabilities.addScannedProducts`, `capabilities.saveScannedIdeas`, `onAddProducts(products)` et `onSaveJournal(snapshot)`. Les boutons apparaissent seulement si une capacité réelle ET son adaptateur sont fournis. Le composant racine ne fournit aucune capacité payante fictive. L’ajout collection et l’enregistrement journal depuis ce parcours ne sont donc pas encore disponibles.

Le futur adaptateur doit vérifier les droits côté serveur, traiter les doublons, préserver couleur/photo/provenance/référence catalogue, retourner un échec explicite en cas d’échec, et conserver/remapper de façon cohérente les identifiants des produits dans les poses. Le même parcours pourra servir aux comptes Pro ; aucun système de nuancier Pro n’est créé ici. Les fonctions existantes de collection, favoris et journal restent disponibles dans leurs parcours habituels.

Les événements demandés sont instrumentés localement sous `nm-scan-events-v1`, maximum 200 entrées, sans photo, OCR, couleur, nom ou identifiant produit. Seuls événement/date/compteur autorisé sont stockés. Les deux événements d’enregistrement seront émis après succès des futurs adaptateurs. Aucun service de collecte centralisé n’est connecté. Le choix d’une photo ne prétend pas constituer une autorisation caméra.

Il n’y a pas de reconnaissance visuelle sémantique du flacon : la couleur est une estimation depuis les pixels, la référence vient du catalogue et du texte OCR. Les photos ne sont pas envoyées à un service d’analyse. Les moteurs OCR et le catalogue sont chargés depuis les ressources du site.

## Vérifications

- Suite complète : 149 tests réussis ; compilation Vite réussie.
- Cas 1/2 couleurs sans profil ni matériel, produits inconnus, vrais HEX, plusieurs compositions distinctes, sérialisation des poses, absence de produits non scannés, compatibilité des effets, outils manquants et données source inchangées.
- Contrôle spécifique : les zones naturelles du schéma ne deviennent pas des produits à appliquer dans la recette.
- Événements bornés sans données privées et stockage indisponible non bloquant.

## À valider sur téléphones

- iOS Safari et Android Chrome : demande caméra, refus puis reprise, choix caméra arrière, orientation, capture, galerie, retour/quitter libérant la caméra.
- Photos physiques : éclairages variés, reflets, flacons opaques, étiquettes OCR, référence connue/inconnue, correction de couleur.
- Collection/profil vierges dans un nouveau navigateur ; aucune gestion de vrais comptes externes n’existe encore.
- Tactile, clavier natif et petits écrans 320–430 px. La recette navigateur à largeur d’application étroite ne remplace pas ces essais matériels.

## Recette publique effectuée le 18 septembre 2026

- Carte d’accueil visible sous le hero, bouton vers `#scan`, progression et retour à l’accueil.
- Caméra : le navigateur de test retourne `NotFoundError` (absence de matériel). Le secours permet de poursuivre. Message traduit en français et effacé à l’entrée de la saisie de couleur.
- Référence `ReferenceScan999999999` : aucun candidat ; message non bloquant ; validation de la couleur `#356a59`.
- Une seule couleur : French + Mat, trois propositions distinctes, zones naturelles explicitement décrites. Détail et recette ouverts ; aucune étape ne demande d’appliquer un faux vernis naturel.
- Variante sans pinceau, ajout d’une deuxième couleur `#813c60`, recherche et confirmation explicite de CANNI 9058. Cette couleur est une donnée de test choisie, pas une validation de la teinte officielle du catalogue.
- Brillant remplace Mat tout en conservant Classique. Aucun troisième produit proposé. Quatre poses obtenues ; vérification des remplissages SVG : uniquement `#356a59` et `#813c60`.
- Régénération, changement d’effet, fermeture du détail et redémarrage vérifiés ; aucune action payante fictive visible.
- Retour Collection : toujours 8 produits de test, sans ajout issu du scan. Journal : 2 poses existantes conservées. Profil : questionnaire et préférences accessibles.
- Captures inspectées sur la colonne d’application de 430 px ; absence de débordement horizontal de la page. Il ne s’agit pas d’une validation sur téléphone physique.
- Capture, galerie réelle et OCR sur une photo de flacon restent à valider sur téléphone. Les tests publics ci-dessus utilisent le secours manuel et la recherche catalogue, sans prétendre avoir scanné un objet physique.
