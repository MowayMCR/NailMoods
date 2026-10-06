# Rendu IA photo réaliste — laboratoire privé

Le laboratoire IA interne dispose d’un adaptateur OpenAI Images Edits et d’un bouton distinct « Générer un aperçu réaliste ». Les autres fonctions restent des vérifications de contrat sans fournisseur payant. Aucun accès public IA+, abonnement ou droit Free/Plus/Pro n’est modifié.

## Activation

Dans Supabase Dashboard → projet → Edge Functions → Secrets, enregistrer `OPENAI_API_KEY` (clé dédiée au projet OpenAI, jamais dans Git, le navigateur ou le chat) et `AI_IMAGE_RENDER_ENABLED=true`. Commencer dans le projet recette `pueqkbwfwxgqzmkauxoz`, avec une limite de dépenses définie dans OpenAI. La production est `rvqmtnqvzzxzwfxfyjcg`. L’absence de l’un des secrets bloque le rendu avant réservation du quota et avant appel fournisseur.

Connecter un compte disposant déjà du droit IA+ interne, ouvrir Créer → Laboratoire IA+, sélectionner un projet de cinq ongles, accepter l’envoi de la composition puis générer. Aucun droit interne n’est attribué par cette livraison. Vérifier chaque ongle, motif, finition et couleur sur le premier vrai résultat avant toute ouverture publique.

## Circuit

Le navigateur exporte uniquement les cinq SVG illustrés en PNG 1024×512. Le serveur vérifie l’identité avec getUser, la propriété du projet, les droits internes, la taille du PNG et la composition. nm_ai_begin réserve une tentative sous verrou par compte, avec UUID idempotent et quota quotidien existant (10 par défaut). Un seul rendu medium 1024×1024 est demandé à gpt-image-2.5-sunburst via /v1/images/edits. Aucun retry automatique sur timeout ou erreur. Les données de profil, titres, notes et photos ne sont pas envoyées.

La sortie est dans le bucket privé nailmoods-private sous utilisateur/workspace/ai/job.png. Le laboratoire délivre un lien signé de dix minutes après vérification des droits. La suppression retire le fichier puis l’historique. La suppression du compte inclut les fichiers IA chargés par le service, même sans owner_id. Les métadonnées de quota/coût restent jusqu’à suppression du compte. Les coûts basés sur les tokens sont indicatifs ; une réponse sans usage donne NULL, pas zéro. Une erreur fournisseur/timeout peut déjà avoir été facturée sans usage retourné : consulter aussi les dépenses OpenAI.

## Validation de cette livraison

Tests de transport simulé : données envoyées, format et taille, un seul appel, absence de retry, erreurs fournisseur, coût inconnu. Tests PostgreSQL locaux : droits, quota/idempotence existants, coût serveur, nettoyage des fichiers du bon compte. Test navigateur : consentement, export PNG des cinq ongles et message quand le serveur est désactivé. Compilation web et suite complète. Aucun appel payant ni qualité de résultat réel validés sans clé et activation serveur.

Documentation vérifiée le 6 octobre 2026 : https://developers.openai.com/api/docs/guides/image-generation ; https://developers.openai.com/api/reference/resources/images/methods/edit ; https://supabase.com/docs/guides/functions/secrets .
