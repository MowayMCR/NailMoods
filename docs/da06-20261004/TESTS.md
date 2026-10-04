# Vérification — DA 06

## Résultats obtenus
- Avant : 443 tests, 441 réussis, 2 ignorés, 0 échec.
- Après : 453 tests, 451 réussis, 2 ignorés, 0 échec. Les 10 nouveaux couvrent contrastes des quatre palettes, conversion des thèmes, éligibilité onboarding, callbacks natifs/web et confidentialité publique.
- Les textes primaires/secondaires/muets sur toutes les surfaces et accentSoft dépassent 4,5:1 ; les CTA dépassent 4,5:1, les icônes actives 3:1. Ce contrôle des tokens ne remplace pas une certification d'accessibilité de chaque écran historique.
- Navigateur Chromium : 10 cas réussis, aucune erreur JavaScript. Même accueil capturé dans les quatre moods ; dimensions de grille identiques, quatre fonds distincts. Fenêtres et profil reçoivent le thème, fermeture/rechargement conserve le choix et les univers. Produit de contrôle #bd7084 inchangé sur surface neutre #f4f3f1.
- Écrans principaux et Profil ouverts à 320, 390, 430 et 768 px ; aucun débordement horizontal détecté. Clavier/focus de guide, reprise onboarding et skip mémorisé vérifiés.
- Contrôles complémentaires : profil public autorisé en lecture seule, deux poses privées enregistrées/rechargées avec leurs notes, grille et détail ; safe areas natives simulées à 24/34 px. Ces simulations ne remplacent pas les appareils physiques.
- Régression navigateur : 6 cas réussis (codes-barres connus/inconnus, OCR avec worker réel sur étiquette synthétique, confirmation/correction/ajout/rechargement, matériel standard/personnalisé, génération et favoris double-tap).
- Projection publique exécutée dans PostgreSQL local (PGlite) : opt-ins, liste de champs autorisés, rejet anonyme, absence de fuite après refus/visibilité privée. Ce test ne modifie pas Supabase.
- Compilations Vite web et bundles natifs Android/iOS réussies. Le warning de taille de bundle préexistant reste présent.
- 12 assets graphiques publics préexistants conservés octet pour octet. MoodGlyph, iconAtlas, iconRegistry, colorAnalysis et creationEngine restent inchangés. Les règles d’interface de finish.css sont migrées, en conservant ses masques et les règles de rendu des ongles.

Les données visibles « Marie », les deux univers et le produit de contrôle sont des fixtures locales de test, sans publication ni création de compte réel.

## Validation restant obligatoire avant diffusion
1. Appliquer la migration en recette puis vérifier le profil public avec deux comptes distincts et les options de visibilité.
2. Inscription réelle, réception du mail, lien valide/expiré, application fermée/ouverte, retour de session et onboarding sur Android et iPhone. Aucune simulation n’est présentée comme un test de boîte e-mail ou d’OS.
3. Tests caméra native, restauration hors ligne, clavier/safe areas sur appareils physiques, paiements Google/Apple et droits Free/Plus/Pro. Leurs tests automatisés existants passent ; les stores n’ont pas été sollicités.
4. Relecture de tous les écrans secondaires authentifiés avec les données réelles (Pro, messagerie, modération, profil public) et validation visuelle par Marie par rapport à la planche.
5. Nouvelle compilation native signée et distribution en test fermé après validation. Aucune AAB/IPA de cette refonte n’est fournie ici.

La livraison est une branche de développement testée et reviewable ; elle n’est pas déclarée comme une release finale validée sur appareils.
