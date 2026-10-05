# Recette sur iPad physique — à remplir avec le numéro du build

Build 0.8.0 (____), commit ____, iPad/modèle ____, iPadOS ____, date ____, compte NailMoods jetable ____ (sans mot de passe). Statuts : À faire / PASS / FAIL, avec reproduction et capture sans secret. Les simulateurs valident lancement/orientation ; Chromium valide une partie du responsive. Aucun des deux ne remplace les essais ci-dessous.

| Parcours | Manipulation | Résultat attendu | Statut |
|---|---|---|---|
| Installation | Invitation interne, installation, lancement à froid | Bon nom/version/build, aucune page blanche ni crash | À faire |
| Création | Email neuf + mot de passe, confirmer 18+/CGU | Compte Free, pas de paiement demandé | À faire |
| Confirmation | Ouvrir email sur même iPad, revenir à NailMoods | Session correcte, onboarding, données cohérentes | À faire |
| Liens | App fermée puis lien valide ; lien expiré/invalidé | Retour correct ou erreur contrôlée, aucun token affiché | À faire |
| Mot de passe | Mot de passe oublié, email, nouveau mot de passe | Retour recovery, nouveau mot de passe utilisable | À faire |
| Session | Fermer/reprendre ; déconnexion/reconnexion ; second appareil | Pas de mélange de comptes, données cloud restaurées | À faire |
| Onboarding | Profil/mood/forme/niveau puis fin | Pas de retour répétitif à l'onboarding à chaque lancement | À faire |
| Consentement | Refuser analytics, accepter, retirer | Fonctions essentielles disponibles ; collecte arrêtée au retrait | À faire |
| Caméra acceptée | Scan puis capture | Texte permission NailMoods, photo exploitable | À faire |
| Caméra refusée | Refuser permission, recommencer | Message utile, app utilisable ; pas de boucle popup | À faire |
| Caméra réactivée | Réglages → Apps → NailMoods → Appareil photo | Capture possible après retour app | À faire |
| Galerie | Import simple et 1–4 photos, annulation | PHPicker laisse choisir les éléments sans accès global Photos | À faire |
| Photos limitées | iPad avec accès Photos restreint puis sélection PHPicker | Seuls les éléments choisis importés ; pas d'exigence d'accès complet | À faire |
| Gros fichier | Photo haute résolution / HEIC et photo tournée | Orientation correcte, limite/erreur lisible si conversion trop lourde | À faire |
| Interruption photo | Passer autre app pendant import/capture, reprendre | Récupération ou abandon explicite, pas de photo affectée au mauvais compte | À faire |
| Scan | Produit du catalogue avec code connu + inconnu | Résolution fiable ou demande de confirmation ; pas de produit inventé | À faire |
| Collection | Ajouter/modifier/favori/recherche, détail produit | Grille adaptée, modale non débordante, clavier ne masque pas Enregistrer | À faire |
| Créer | Inspire-moi, Scan & Génère, composer/dessiner, variantes | DA06/moods et contour corrects ; 5 ongles illustrés cohérents | À faire |
| Projet/Tenue | Créer projet depuis 1–4 photos et tenue si accès requis | Sauvegarde/reprise du projet, aucune activation IA+ | À faire |
| Journal/Mes poses | Enregistrer, modifier, partager selon droit | Persistance cloud, notes privées conservées privées | À faire |
| Planning | Date/fuseau, rappel, calendrier et .ics | Date correcte ; permission notifications uniquement lors de l'usage ; export calendrier choisi | À faire |
| Navigation | Accueil/Fil/Créer/Collection/Mes poses/Profil | Header/bottom nav accessibles, retour cohérent et scroll fluide | À faire |
| Orientations | iPad portrait et deux paysages ; rotation formulaire ouvert | Safe areas, modales, clavier et données conservés ; iPhone portrait déclaré | À faire |
| Split View | Fenêtre étroite/large si disponible, gros texte, zoom | Aucun débordement horizontal ou action inaccessible | À faire |
| UGC publication | Deux comptes ordinaires ; photo publique d'essai | Photo en attente de revue avant diffusion ; notes privées hors file | À faire |
| UGC signalement | Signaler publication/utilisateur avec second compte | Signalement enregistré et visible au staff autorisé | À faire |
| UGC blocage | Bloquer un compte, vérifier profil/feed/messagerie | Contenu et échanges bloqués selon règles ; pas simple bouton décoratif | À faire |
| Connexion | Inviter/accepter/retirer connexion | État cohérent des deux côtés, partage PO respecte droits | À faire |
| Modération | Compte staff séparé, revue/refus/approbation et traitement | Action backend effective, compte de revue Apple sans accès staff | À faire |
| Support | Ouvrir support, envoyer ticket | Contact joignable et suivi réel ; objectifs support 48 h ouvrées, signalement 24 h ouvrées, urgent dès lecture | À faire |
| Offline | Couper réseau, modifier/sauver, retrouver réseau | Message/reprise sans perte silencieuse ; droits jamais accordés localement | À faire |
| Achats | Matrice STOREKIT.md après configuration Sandbox | Prix Apple, validation serveur, restauration et droits manuels préservés | À faire |
| Suppression | Profil → Gérer mon compte → Confidentialité/Données → Supprimer ; SUPPRIMER | Médias/compte/cascades supprimés, cache purgé et déconnexion ; autre session inutilisable | À faire |
| Après suppression | Reconnexion ancien compte, ancienne URL privée, notification achat | Accès refusé ; renouvellement ne recrée pas le compte ; copies chez correspondants selon politique | À faire |

Ne pas activer la sélection gratuite d'offre pour masquer un échec StoreKit. Utiliser un compte sans droit offert pour les achats, un autre pour tester la priorité manuelle, un autre jetable pour la suppression. La suppression NailMoods ne résilie pas l'abonnement Apple : **Réglages → Apple Account → Subscriptions** pour gérer celui-ci.

Pour un FAIL : écran précédent, taps exacts, résultat attendu/observé, modèle/iPadOS/build, réseau et capture. Ne pas joindre email complet, mot de passe, tokens, clé privée, données d'une autre personne ou photo privée non nécessaire.
