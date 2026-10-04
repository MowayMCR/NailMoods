# Refonte DA 06 — développement et reprise

Base commune : 9ff7aa8. Branche : feat/da06-moods-ux. Android et iOS utilisent exactement les mêmes modules React, tokens et comportements. Les scripts mobile ont compilé le bundle pour chaque plateforme ; aucune compilation Gradle signée ni archive Xcode n’est incluse dans cette livraison.

## Comportements
- Navigation : #accueil, #fil, #creer, #collection, #journal ; #profil reste accessible dans le header. Anciennes routes conservées. Le Fil utilise le même service public, les mêmes filtres, favoris, signalements et droits Plus/Pro. « Pour toi » recherche les tags des univers préférés. Aucun faux contenu, aucune promesse de recommandation serveur nouvelle. Le filtrage exclusif des connexions et un classement de tendances ne sont pas ajoutés.
- Thème : src/design/themes.js définit quatre palettes complètes ; visualMood est distinct de styles. Le champ historique theme reste lisible. Les identifiants historiques sont reconnus : witchy/goth → Dark Feminine, clean → Cottagecore, celestial/y2k → Pop Pastel, autres → Soft Glam. Aucun univers n'est modifié.
- Persistance : visualMood dans nm-profile, synchronisé par le store existant dans profiles.preferences.nailmoodsProfile. Sauvegarde de secours par compte/workspace ; dernier mood de démarrage mis en cache sans identité privée. Le boot CSS est généré depuis les tokens. Les fenêtres déjà ouvertes reçoivent aussi le changement. Transitions 220 ms, désactivées si mouvement réduit.
- Onboarding : 4 courtes introductions puis préférences, univers, ambiance et aperçu. Les champs existants sont utilisés directement. onboarding_completed n'est vrai qu’après le CTA final ; onboarding_step permet de reprendre. Un profil historique déjà renseigné reste accessible. Les nouveaux comptes sans préférences sont dirigés vers l’onboarding ; un invité peut le lancer depuis Profil.
- Guide : six coach marks ancrés aux vrais onglets et au Profil. Passer/Terminer enregistrent guide_completed ; guide_pending suit la fin d’onboarding. Rejeu depuis Aide ou Profil. Navigation réelle, retour, Échap et focus clavier.
- Profil : identité et avatar existants, préférences/univers modifiables, ambiance, dernières poses et inspirations conservées. Bio personnelle facultative. Les photos utilisent le service média existant.
- Couleurs produits : aucune transformation du HEX, des scans, du moteur de génération ou des finitions. Les flacons et rappels de couleurs utilisent la même surface neutre dans tous les moods.

## Données ajoutées
Dans le JSON de profil existant uniquement : visualMood (id), onboarding_completed (bool), onboarding_step (0…7), guide_completed (bool), guide_pending (bool), bio (texte max 300), publicProfile.{bio,universes,preferences} (bool, faux par défaut). Aucun nouveau rôle, niveau d’abonnement ou compte bêta.

Migration additive à examiner/appliquer en recette avant production : supabase/migrations/20261004093303_da06_profile_visibility.sql. Nouvelle RPC nm_public_profile_v2. Elle appelle la garde get_public_profile existante, revérifie le profil personnel visible et retourne uniquement les champs expressément autorisés. Pas de nouvelles tables, pas d’accès client aux préférences privées d’autrui. Le client reste compatible avec une base sans cette RPC : repli uniquement sur PGRST202 (fonction absente), jamais après un refus d’accès. Les nouveaux champs publics resteront absents tant que cette migration n’est pas déployée.

## Auth et liens
PKCE reste la voie principale : signup → mail → scheme natif → exchangeCodeForSession → session → workspace/profil → onboarding si nécessaire. Un succès ferme le formulaire de connexion. Le traitement reconnaît aussi les paires complètes access_token/refresh_token et token_hash de type email/signup/recovery. Il rejette les mélanges, origines, chemins ou environnements incorrects. Les erreurs expirées et les échecs de restauration ont un message dédié. Aucun jeton n’est journalisé.

Android et iOS conservent leurs schémas déjà déclarés : com.nailmoods.app://auth/callback et com.nailmoods.app.recette://auth/callback. Les redirections Supabase doivent autoriser précisément ces schémas et les URL web existantes avec ?auth=callback / ?auth=recovery. L’inscription web utilise son URL de retour web existante. Cette livraison n’ajoute pas de domaine universel ni de fichier d’association Apple/Android inventé. Un lien PKCE ouvert sur un autre appareil peut nécessiter un nouveau lien depuis l’application ou une connexion ; ce cas doit être vérifié avec de vrais e-mails. Aucune configuration Supabase de production n’a été changée.

## Lots et retour arrière
Tokens et CSS, puis parcours/écrans, puis Auth/projection publique et preuves sont séparés en commits. Revenir aux commits précédents restaure l’UI. La migration est additive et les anciens clients ignorent les nouveaux champs ; son retrait consiste à révoquer/supprimer uniquement nm_public_profile_v2, sans effacer de préférences.

Les avertissements Play de la future 0.8 (mapping R8 et symboles natifs) restent suivis dans l’issue #8 ; ce travail UI ne constitue pas une nouvelle AAB signée.
