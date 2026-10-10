# NailMoods AI — pilote Web administratrice, 10 octobre 2026

## Périmètre autorisé
La consigne du 10 octobre autorise les essais API sur la Web App Production, pour le seul compte administratrice. Elle remplace la restriction recette de l’audit initial. Aucune nouvelle version mobile distribuée. Un workflow existant a déclenché involontairement des contrôles natifs à la fusion : iOS simulateur terminé, Android annulé sans AAB livré. PR42 réserve désormais ces jobs à workflow_dispatch. Les correctifs de synchronisation iOS/Android sont inclus au code commun.

## Accès et arrêt
Le bouton NailMoods AI est affiché seulement après réponse serveur uiAccess=true. Les deux conditions sont vérifiées côté serveur : liste privée ai2_accounts et rôle privé account_administrators. Les autres comptes ne peuvent ni lancer de requête ni activer le service. Le bouton « Désactiver immédiatement l’IA » appelle nm_ai2_switch : il interdit les nouvelles admissions ; les appels déjà envoyés peuvent finir.

En secours : UPDATE private.ai2_config SET enabled=false WHERE id;

## Clé existante
OPENAI_API_KEY n’est ni remplacée, ni copiée, ni affichée. Dépendance existante confirmée dans la fonction déployée ai-internal (rendu expérimental). Le nouveau service lit le même secret uniquement dans Supabase. Le bouton « Vérifier la connexion OpenAI » vérifie sa présence et GET /v1/models, sans génération. Contrôle serveur effectué le 10 octobre à 17 h 14 Paris : HTTP 200, modèles texte et image présents.  le projet de facturation exact de la clé ne peut pas être déduit de son nom Supabase. Aucune rotation effectuée.

## Budgets du pilote
Réservations serveur atomiques : 2 USD/jour, 10 USD/mois, 30 demandes/jour. 0,10 USD réservés pour texte/recherche/analyse ; 0,50 USD pour image. Les consommations inconnues restent réservées, sans nouvelle tentative automatique. Ces compteurs couvrent nailmoods-ai, pas les autres services partageant la clé. Achats, allocations commerciales et récompenses réelles désactivés. Les essais de l’administratrice n’exigent aucun jeton acheté.

Modèles configurables côté serveur : gpt-4.1-mini ; gpt-image-2.5-sunburst. Images : une composition de cinq capsules, sans main humaine, référence limitée à 1024 pixels par dimension, sortie 1024x1024 médium. Prix documentés : https://developers.openai.com/api/docs/pricing et https://developers.openai.com/api/docs/models/gpt-4.1-mini . Estimations distinctes de la facture fournisseur.

## Parcours à tester
Accueil → NailMoods AI. Vérifier la connexion dans Pilotage. Sélectionner Assistante IA, accepter l’envoi des données, demander une French léopard dorée. Tester une variante sur un seul ongle, le tutoriel inclus, l’enregistrement du projet, le rendu réaliste, les tendances sourcées et la suppression de conversation. Les échanges IA sont privés ; la composition locale n’a pas d’historique persistant. Le rendu distant reste dans l’historique privé et n’est pas automatiquement joint au projet enregistré.

## Validation et limites
Tests unitaires et SQL locaux : accès, séparation des comptes, crédits, budgets, arrêt serveur, suppression concurrente. Compilation web effectuée. Le navigateur de recette supporté n’est pas disponible dans cette session : aucune nouvelle validation visuelle sur appareil réel annoncée. Aucun appel de génération réel lancé par l’agent ; qualité des réponses, dessins et rendus à valider avec Marie. Le diagnostic ne certifie pas les permissions de génération d’images ni le projet auquel la clé appartient.

## Retour arrière
Désactiver le serveur, puis revenir à la version précédente du site. Conserver les tables et historiques privés pour éviter toute perte. Ne pas remplacer les secrets. Les bêtas natives restent inchangées.

## File commerciale
Voir RAPPORT-PRODUCTION-COMMERCIALE.html et evidence/load-local.json. File SQL persistante, workers authentifiés par nonce à usage unique, relance de file par Cron chaque minute, aucune relance fournisseur ambiguë.
