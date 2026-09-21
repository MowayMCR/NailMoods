# NailMoods — P2 — 21 septembre 2026

## Production validée

Les P1 et Découvrir validés ont été promus en Production sur https://mowaymcr.github.io/NailMoods/.

- Première promotion : `59bac67f320e1158833648377af1c8459dfc2682`, workflow Pages `35619443241`, terminé avec succès.
- Alignement des quatre illustrations avec les fichiers complets validés en Recette : `b5fb3560b88020909e03fd5a66d9a4a06061e95a`. L’arbre final `9fb7c37be14256b6094daa99111303564bd6db55` est exactement celui de la version Recette validée `e73191c8159fe822709417d8e8d202d00c650523`.
- Migrations P1 + Découvrir et Edge Function media-read appliquées au backend Production. Les migrations et le frontend P2 ci-dessous concernent uniquement la Recette.
- Vérification HTTP directe indisponible via l’outil web ; le statut Pages est la preuve de déploiement. Aucun scénario avec des comptes réels de Production n’a été exécuté.

## P2 livrés en Recette

1. **Droits serveur** : autorisations calculées depuis `private.account_entitlements`, avec statut, date de début et expiration. Le niveau affiché est chargé par `nm_capabilities` ; un niveau fourni par le navigateur n’accorde aucun droit. Free garde collection, matériel, inspirations illustrées, favoris personnels, tutoriels et journal personnels. Social, recherche de profils, Découvrir, publication publique et création/modification des projets photo sont réservés à Plus/Pro. L’espace professionnel reste réservé à Pro.
2. **Changement d’offre** : aucune suppression. Les projets photo restent lisibles après passage à Free ; leur modification avancée est bloquée. Les échanges et les pièces jointes privées sont contrôlés à chaque lecture serveur. Une publication existante peut toujours repasser en privé.
3. **Fiche PO enrichie** : aperçu illustré, palette, mood, niveau, techniques, références des produits, matériel et manquants. Photos et notes sont deux choix explicites, désactivés initialement. Les photos jointes sont copiées vers des objets privés propres au partage pour éviter qu’un remplacement ultérieur de la photo source change la pièce jointe. Recherche d’une PO parmi les connexions acceptées, aperçu, confirmation puis conversation. Une clé de tentative évite les doublons d’envoi.
4. **Comparaison PO** : quatre résultats : Disponible (identité catalogue/code-barres ou marque + référence), Alternative proche (proximité de couleur bornée), Manquant et À vérifier. Le nom seul et la ressemblance de couleur ne prouvent pas l’identité. La compatibilité des produits et la faisabilité restent à confirmer par la PO.
5. **Propositions privées de la PO** : sélection d’un projet ou favori de la PO, aperçu et envoi à la cliente connectée. Enregistrement de la composition dans les projets de la cliente uniquement si la PO l’autorise ; contrôle serveur de cette permission. Photos et notes jointes restent dans l’échange privé.
6. **Photos et projets** : import 1–4 JPEG/PNG/WebP, validation du format/poids/doublon, suppression, remplacement et réordonnancement. Palette, Mood contrôlé et effets modifiables. Brouillon, choix et références allégées synchronisés ; photos en Storage privé, chemins dans les snapshots. La file de sauvegarde garde le brouillon en cas d’échec et permet la reprise. Mes projets conserve les compositions ; « J’ai fait cette pose » ouvre le journal avec ajout possible d’une photo finale. Aucun modèle de vision distant ni génération réaliste payante n’est activé.
7. **Analytics** : raccordement au collecteur existant des parcours photo, social, favoris, projets et accès verrouillés. Audit : bases séparées, identifiants pseudonymes, tables privées, catalogue d’événements et liste de métadonnées autorisées, dernier consentement obligatoire, rétention existante. Aucune image, note, texte de message ou identifiant de profil dans les événements ajoutés. Le retrait du consentement arrête la file locale et le serveur refuse les lots suivants.
8. **Quotas préparatoires** : registre privé et lecture des périodes/usage/plafonds ; Plus 3/mois et institut 15 + 5 par membre, Pro solo sans plafond inventé. Le rendu réaliste reste désactivé, sans endpoint de consommation accessible au navigateur, sans paiement ni appel IA.

## Vérifications et limites

| Contrôle | Résultat | Portée |
|---|---|---|
| Suite Node complète | PASS | 282 tests : 280 réussis, 2 intégrations ignorées, aucun échec |
| Compilation Recette | PASS | Build Vite et paquet statique |
| Expiration vs ancien profil Plus | PASS | Véritables RPC et RLS Recette, rôle authenticated, transaction annulée |
| Free : collection/journal personnels, refus social/photo/public | PASS | Tests SQL et matrice frontend |
| Déclassement : données conservées, accès verrouillés | PASS | Projet toujours lisible ; modification avancée et partage refusés |
| Notes opt-in, image d’autrui refusée | PASS | Tests SQL d’autorisation et listes de champs autorisés |
| Proposition Pro / autorisation de copie / répétition d’envoi | PASS | SQL avec identités de test, ROLLBACK |
| Découvrir après modifications P2 | PASS | Filtres, pagination 20+2, favoris, profils, médias et passage Public → Privé |
| Références privées + reprise après échec + nouvel appareil | PASS | Tests de stockage avec backend simulé et IndexedDB ; y compris modification pendant un upload |
| Consentement analytics : refus / accord / retrait | PASS | RPC réelle + test des listeners et de la file frontend |
| Écrans 390/360 px | PASS | Composants réels, données de démonstration locales : génération, sauvegarde, notes opt-in, sélection PO, conversation |
| Échange complet sur deux téléphones et vrais uploads réseau | NOT RUN | Nécessite la recette humaine publiée ; les mocks de stockage ne remplacent pas cette vérification |
| Expiration réelle pendant une session prolongée, mode hors ligne mobile, équipe Institut multi-membres | NOT RUN | Les règles serveur sont testées, pas ces parcours matériels complets |
| Charge et quotas IA consommés | NOT RUN | Pas de test de charge ni de rendu IA activé |

Ces résultats permettent la recette des P2, pas un GO global de la Phase 12 ni leur promotion automatique en Production. Les fixtures SQL s’annulent intégralement ; les écrans de démonstration ne sont pas intégrés au build publié.

## Ordre des migrations P2

`p2-entitlements.sql`, `p2-discovery-entitlements.sql`, `p2-rich-sharing.sql`, `p2-analytics.sql`, `p2-share-retry.sql`, `p2-proposals.sql`, `p2-proposal-save.sql`, `p2-profile-entitlements.sql`, puis la version P2 de `supabase/functions/media-read/index.ts`. `p2-validation.sql` et `discovery-test.sql` sont des tests Recette transactionnels, jamais des migrations Production.

Pour le contrôle humain : Free → collection/journal personnels et refus social ; Plus → photos, projet, partage vers PO ; Pro → comparaison, proposition avec/sans copie autorisée ; enfin retour à Free, reconnexion et vérification des projets conservés.

## Contrôle après publication

La Recette v28 est publiée avec succès depuis `6347dcb7668d2586dcb0b318ca6aea83c7ab4818` (déploiement `appgdep_6ab154b788a08191abf0185c1d232dff`). L’archive a été relue entièrement ; elle contient uniquement les assets construits, sans fixtures, et sa seule URL de backend Supabase est celle de Recette. Le nom d’hôte Production apparaît seulement dans le garde-fou qui refuse un mélange d’environnements.

Le conseiller Supabase ne signale pas de défaut de droits introduit par les P2. Il relève les tables volontairement fermées par RLS sans accès direct (RPC contrôlées uniquement) et le réglage Auth existant « protection contre les mots de passe compromis » non activé. Ce réglage n’a pas été modifié dans ce lot : [documentation du réglage Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

L’alignement final Production a également terminé avec succès : workflow Pages `35622268850`, commit `b5fb3560b88020909e03fd5a66d9a4a06061e95a`. Les tests et la compilation GitHub sont réussis. Les P2 restent exclusivement sur la Recette v28.
