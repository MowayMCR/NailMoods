# Phase 12B — périmètre consolidé et conditions d’ouverture

État au 18 septembre 2026 : travaux de préparation, pas une Phase 12B validée. La V1 publiée reste la référence. Les ajouts de ce lot sont à intégrer au même produit, sans portail ou bêta séparée.

## Identités et visibilité

UUID = clé technique de toutes les relations. @ID = nom public modifiable, normalisé en minuscules, 3–30 caractères ; contrôle serveur et index unique. Aucune relation ne dépend d’un pseudo. La disponibilité est indicative jusqu’à l’enregistrement atomique.

Le lot préparé distingue les espaces de noms utilisateurs et workspaces ; un même handle pourrait exister dans chacun. Les résultats portent un type et un UUID non affiché. Avant un futur lien court non typé `/@handle`, choisir soit un registre global unique, soit des routes `/personne/@handle` et `/pro/@handle` pour lever l’ambiguïté. Aucun lien court ni QR code n’est présenté comme actif.

Après confirmation : nom → suggestion @ID → validation facultative → découverte des offres. « Plus tard » ne bloque pas les inspirations. Choisir une offre ne doit jamais modifier `account_tier` : attribution exclusivement administrative, entitlements serveur pour les opérations protégées.

Plus : recherche par tout le monde connecté / Pros seulement / personne ; défaut Pros seulement. Les préférences, collection, journal, photos, messages et email ne sortent jamais dans la réponse de recherche. Seuls les champs publics définis sont retournés. Désactivation d’un profil Pro via `is_public=false`, sans suppression du compte. Aperçu « comme les autres » doit utiliser la même projection que le public.

Recherche : @ID exact, préfixe, nom exact puis partiel ; filtres PO/Institut/Créateur et ville explicitement publique. Pas de recherche floue extensive. Profil, favoris, suivi, messages et inspirations restent liés aux UUID après renommage.

## Institut — condition obligatoire de fin 12B

Le cycle complet doit être réellement implémenté et testé avant fermeture de la phase :

| Action | Autorisation serveur | Effet attendu |
|---|---|---|
| Inviter | Propriétaire actif, droit et capacité disponibles | Invitation ciblée sur UUID, état pending, expiration, pas d’ajout automatique |
| Accepter/refuser | Destinataire seul | Acceptation atomique avec recontrôle capacité ; refus sans membership |
| Révoquer une invitation | Propriétaire | Une invitation révoquée ne peut plus être acceptée |
| Quitter | Membre ; propriétaire après transfert | Fin d’accès aux données, conversations et prochaines notifications |
| Retirer | Propriétaire ; jamais le propriétaire courant | Fin d’accès effective côté serveur, pas seulement menu masqué |
| Transférer | Propriétaire vers membre existant ayant accepté | Modification atomique owner_user_id + deux rôles ; toujours un propriétaire |
| Expiration Pro | Administration/entitlements | Espace et données conservés ; écritures premium verrouillées selon règle annoncée |

Nombre de comptes 2 / 3–5 / 6–10 / >10 : la sélection commerciale n’est pas un entitlement. Une capacité numérique autorisée par le serveur doit être définie ; éviter de compter les invitations expirées comme membres. Verrouillage transactionnel pour deux acceptations simultanées à la dernière place. Aucun RH, planning, CRM ou paiement.

Les messages communs distinguent l’UUID de l’expéditeur de l’UUID d’espace. Affichage « Marie · Institut Cassis ». Pas d’assignation CRM. Invitations, membres, notifications et droits ne sont pas encore implémentés dans ce lot.

## Messagerie, sécurité et modération

Demandes de message → accepter/refuser → conversation autorisée. Le client ne doit pas pouvoir ajouter arbitrairement un destinataire à une conversation. Bloquer empêche nouvelles demandes, nouveaux messages et notifications ; débloquer ne restaure pas implicitement une demande refusée. Masquer une conversation ne supprime pas celle du correspondant. Non-lu calculé avec last_read_at par membre.

Partages explicites : snapshot minimal choisi par l’expéditeur, jamais export automatique du journal ou de la collection. Contexte inspiration/pose/moodboard identifié par UUID. Compte supprimé : état lisible, pas de lien vers une fiche inexistante.

Rate limit transactionnel serveur par expéditeur pour demandes/messages/invitations. Seuils à mesurer en bêta ; bouton désactivé ou compteur JavaScript ne suffisent pas. Signalements profil/message : auteur, cible UUID, catégorie, texte facultatif borné, statut interne ; aucun accès public aux signalements ni droit de s’auto-vérifier.

Choix produit à confirmer : suppression des messages envoyés ou anonymisation dans les fils des destinataires. Le schéma actuel **supprime** messages envoyés et conversations créées par l’utilisateur supprimé via FK CASCADE. Ne pas promettre une anonymisation sans modifier et tester cette architecture. La suppression automatique préparée n’est pas activée avant cette décision.

## Photos

Migration Storage à réaliser avant la vraie app : buckets privés par défaut, chemins par utilisateur/espace, RLS tenant compte des memberships, URLs signées courtes. Publication explicite d’une copie d’avatar/logo public, jamais réutilisation d’un lien public pour un journal privé. Compression mobile et limites taille/type à contrôler côté client **et serveur**. Effacement des fichiers par API Storage, pas suppression SQL de leurs seules métadonnées.

Les snapshots existants restent lisibles. Aucun bucket ni migration de photos n’est créé dans ce lot. La procédure de suppression préparée bloque si des objets Storage appartiennent au compte : nettoyage sécurisé encore à ajouter lorsque Storage sera activé.

## Offres et cycle de vie

Free conserve scan et génération sans profil/collection, même après refus facultatif. Plus/Pro sans publicité. Entitlement distinct de l’UI, attribué serveur. Fin future d’abonnement : conserver les données, annoncer les limitations et permettre l’export ; ne jamais supprimer automatiquement la collection ou l’espace Pro. Modèle de dates/statuts d’entitlements encore à développer avant 12C.

## Notifications et sécurité du compte

Centre interne : demande de message, inspiration reçue, invitation Institut, nouveau message ; préférences par catégorie. Les contrôles bloqués/membership/visibilité s’appliquent aussi aux notifications. Push uniquement plus tard. Changement d’email avec confirmations Supabase à ajouter ; mot de passe, récupération et déconnexion locale existent. Déconnexion des autres appareils préparée ultérieurement.

## Confidentialité et ouverture publique

Voir PHASE12B_CONFIDENTIALITE_AVANCEMENT.md. Âge minimum à décider explicitement, en particulier avant ouverture de la messagerie. Ne pas déduire une politique d’âge d’un choix technique. Identité juridique, contact, durées et textes définitifs à fournir/valider par l’éditeur.

## Tests de sortie

Trois vrais comptes confirmés, aucune création artificielle de comptes Auth. Tests positifs ET négatifs : tier, visibilité, recherche personne cachée, renommage, claim concurrent, invitations concurrentes, membre retiré, transfert, blocage, rate limit, signalement, suppression, export, session expirée, migration, deux navigateurs et téléphone physique. Une erreur réseau ne vaut jamais preuve de refus RLS. Rejouer tous les parcours V1.

Les demandes tronquées « signaux », « lien di », « que », « représentant », « Le fa », « possi », « état vide p » ne sont pas transformées en fonctionnalités inventées. Signalements et liens contextuels sont couverts par les points explicites ; préciser les autres si nécessaire.
