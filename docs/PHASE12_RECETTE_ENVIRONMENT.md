# NailMoods-Recette — 19 septembre 2026

## Environnement réellement utilisé

- Recette : `pueqkbwfwxgqzmkauxoz`, eu-west-3.
- Production `rvqmtnqvzzxzwfxfyjcg` : aucune migration, modification de compte,
  configuration ou publication effectuée dans ce lot.
- Preview Sites indépendante, privée au propriétaire. Backend distinct de la production.
- Configuration : `node scripts/build-recette.mjs`, clé publishable moderne,
  `VITE_BETA_ACCOUNT_TIERS=true`, `VITE_DEPLOYMENT_ENV=recette`, base frontend `/`.
- Bandeau « NailMoods-Recette » visible. Le mode recette refuse le backend de production.

## Règle de promotion recette → production

Chaque lot Phase 12 suit cet ordre : migration et fonctions sur la recette,
preview recette, tests/corrections, compte rendu, validation explicite, puis
promotion du même commit et des mêmes migrations vers la production. La
vérification post-déploiement précède la fermeture du lot. La production n'est
jamais utilisée pour mettre au point le lot, mais une fonction validée ne doit
pas rester durablement réservée à la recette.

Pour le présent lot Profil Pro / Institut, la promotion production est donc
**interdite tant que la recette mobile humaine n'est pas validée**. Lorsqu'elle
le sera, l'ordre prévu est : migration SQL, fonction `media-read`, frontend,
smoke tests profil/recherche/invitation/rôles, puis vérification que le site
principal pointe toujours vers `rvqmtnqvzzxzwfxfyjcg`.

## Migrations appliquées, dans cet ordre

1. `phase12_recette_bootstrap` : socle manquant dans le dépôt, reconstruit depuis
   les contrats applicatifs, 15 tables avec RLS, trigger profil/espace/membership.
2. `phase12_privacy_consents`
3. `phase12_public_identities`
4. `phase12_storage_private`
5. `phase12_media_visibility`
6. `phase12_media_revocation`
7. `phase12_security_column_privileges_applied`
8. `phase12_institute_lifecycle`
9. `phase12_beta_account_tiers`
10. `phase12_recette_media_hardening`
11. `phase12_recette_worker`
12. `phase12_recette_fixtures`
13. `pro_profile_institute_adaptation` : statut professionnel persistant,
    rôles Institut `owner/manager/creator/member`, RPC de création/édition/fermeture
    d'espace, attribution de rôle réservée au propriétaire et types de recherche
    métier explicites.
14. `pro_profile_search_avatar` : expose uniquement la présence/référence de
    l'avatar autorisé dans les résultats ; l'image reste servie par `media-read`.

Le socle de recette n'est pas une copie certifiée du schéma de production :
aucune lecture/copie de données de production n'a été utilisée. Les tables
sociales non nécessaires restent volontairement sans droits client.

## Comptes jetables

| Compte | Niveau final | Sélecteur bêta | Espace |
|---|---|---|---|
| A — Recette Alpha / @recette.alpha | Plus | Autorisé 14 jours | Personnel |
| B — Recette B | Pro | Autorisé 14 jours | Personnel + Studio Recette B |
| C — Recette C | Free | Autorisé 14 jours | Personnel |
| D — Recette D | Free | Non autorisé | Personnel |

Créés via l'API **Admin Auth de recette**, emails synthétiques
`@nailmoods-recette.invalid`, confirmation administrative. Ce n'est donc PAS
un test de réception d'email ou d'inscription UI.
Les mots de passe aléatoires sont exclusivement dans Supabase Vault, secrets
`RECETTE_ACCOUNT_A` à `RECETTE_ACCOUNT_D`, accessibles à l'administratrice dans
le dashboard de recette. Aucun identifiant secret dans le frontend, le dépôt
ou ce rapport. Ne pas utiliser ces comptes hors recette.

## Backend réellement testé

L'environnement local ne pouvait pas joindre le domaine Supabase (expiration
réseau). Le lanceur `recette-runner`, protégé par secret Vault et verrouillé sur
le ref de recette, a donc exécuté les appels Auth/REST/Storage depuis Supabase.
Sa clé administrateur sert uniquement à la préparation/lecture des fixtures
et rapports. Les contrôles de permission sont effectués avec les sessions
ordinaires A/B/C/D ou anonymement, jamais avec service_role.

**Dernier passage : 90 contrôles PASS, 0 FAIL.** Rapports persistés dans
`public.recette_test_runs`, inaccessible aux utilisateurs ordinaires.
Le premier passage a aussi vérifié la création Auth des quatre comptes.

Vérifications : tiers A/B/C ; refus D et modification directe du tier ; refus
écriture produit Free ; identité ; upload réel PNG ; journal privé ; refus B
et anonyme ; refus URL signée B ; refus chemin autre utilisateur et workspace ;
refus association au média d'autrui ; seconde session indépendante ; publication ;
profil public ; retour privé et refus réseau AVANT suppression de la copie ;
original conservé ; job créé ; transitions de tiers et conservation du journal ;
reconnexion ; recherche exacte/partielle/casse/@ ; profil non découvrable ;
avatar upload/lecture/publique/retrait ; écriture profil Pro ; auto-vérification refusée.
Le passage du 19 septembre couvre aussi le scénario métier complet : B choisit
« propriétaire », crée un Institut, A passe temporairement Pro et choisit le
statut « associée », accepte l'invitation, puis B attribue le rôle
`creator`, A voit ce rôle sans pouvoir le modifier, A quitte, B constate son
retrait, revient en Plus et B ferme l'espace. A retrouve également B comme propriétaire et le
profil public de l'Institut avec leurs types métier distincts. Le statut de
présentation n'accorde aucun droit à lui seul ; le workspace, le membership et
le rôle restent la source d'autorité.

Un passage intermédiaire a échoué sur le test Pro utilisant `upsert` : cette
opération tentait aussi de réécrire les colonnes d'identité, volontairement
non modifiables. Test corrigé en INSERT ou UPDATE limité aux colonnes autorisées.
Aucun élargissement de privilèges pour faire passer le test.

Tests locaux : **243 PASS, 0 FAIL, 2 intégrations locales SKIPPED (245 total)**.
Ces deux scripts locaux restent non exécutés localement ; les 90 contrôles
serveur ci-dessus sont une suite distincte, pas une requalification des skips.
Build recette : PASS. Avertissement existant sur la taille des bundles.

## Médias et nettoyage

`media-read` et `media-cleanup` sont déployées sur la recette.
Deux buckets privés : `nailmoods-private`, `nailmoods-public`. Ce second nom
historique désigne des copies, pas un bucket publiquement lisible.
JPG/PNG/WebP, maximum 5 Mo.

Lecture publique : route contrôlée, vérification visibilité et lien
propriétaire/workspace, octets renvoyés sans redirection, `private, no-store`.
« Public » signifie accessible aux internautes via la route, pas seulement
aux membres connectés. Une image déjà téléchargée ne peut pas être effacée
chez son destinataire. Les URLs signées sont utilisées pour les originaux
du propriétaire : 300 secondes par défaut. B ne peut pas en créer pour A.

Secret worker `MEDIA_CLEANUP_SECRET` généré dans Vault. La fonction accepte
soit le secret d'environnement existant, soit sa validation serveur via Vault.
Cron toutes les cinq minutes, secret résolu au moment de l'appel et jamais
inséré dans le texte de la tâche. Traitement par lots de 25 avec réservation
atomique, cinq tentatives maximum, backoff 2/4/8/16 minutes puis échec.

Tests worker réels : suppression d'une copie orpheline PASS ; refus de supprimer
un objet encore référencé PASS ; erreur `object_still_referenced` et délai de
2 minutes persistés PASS. La confidentialité ne dépend pas du succès du worker.
Les erreurs HTTP physique de Storage, crashes prolongés et charge restent à tester.

Corrections applicatives nécessaires à la recette : passage privé→public d'une
photo déjà uploadée ; absence du champ `photo_url` invalide pour inspirations ;
références Storage à la place des champs image de snapshots traités ; avatar
dans Profil ; ouverture du profil public depuis les résultats de recherche.

## Checklist UI indépendante — NOT RUN avec comptes

1. Ouvrir la preview dans trois profils de navigateur distincts, puis un quatrième pour D.
2. Vérifier le bandeau NailMoods-Recette avant chaque connexion.
3. A : Mon compte → Plus ; B → Pro ; C → Free ; D sans sélecteur.
4. A : Journal → nouvelle pose, titre/photo → Privé → enregistrer.
5. Rafraîchir, déconnecter/reconnecter, ouvrir une seconde session : photo présente.
6. A : rendre la pose publique ; Profil → Mon NailMoods ID → Tout le monde.
7. B : Profil → Rechercher → @recette.alpha → Voir le profil : pose publique seule.
8. A : repasser privé ; B : Actualiser le profil : pose absente.
9. A : remplacer/retirer l'avatar, puis refresh et reconnexion.
10. C : Collection/Journal affichent Plus ; génération simple reste utilisable.
11. C → Plus → créer un produit → Free → Plus : produit conservé.
12. D : vérifier refus de promotion ; A ne doit pas hériter du rôle Pro de B.
13. B : Profil → Mon profil Pro → choisir Propriétaire → créer l'Institut.
14. B : inviter A ; A : accepter ; B : attribuer Créatrice / PO.
15. A : vérifier son rôle et l'absence d'actions propriétaire ; quitter l'espace.
16. B : vérifier le départ, puis fermer l'espace avec confirmation explicite.

## À terminer avant validation humaine complète

- **BLOCKED** : configuration Site URL/redirects Auth par dashboard, connexion
  administratrice requise. Ajouter l'origine exacte de la preview et les deux
  retours `/?auth=callback`, `/?auth=recovery`. Aucun changement fait en production.
- **NOT RUN** : vrais emails, recette UI connectée, téléphone et caméra physique.
- Les comptes techniques peuvent se connecter sans email de confirmation.
- Recherche avec accents/pagination et rendu connecté des écrans Pro sur téléphone
  restent à valider humainement. Le cycle Institut et ses refus d'autorisation
  ont été validés côté backend avec les sessions ordinaires A/B.
- Le média historique réel n'a pas été touché ni copié en recette : NOT RUN.
- Le traitement de tous les anciens médias et le renouvellement d'URL privée
  sur un écran ouvert plus de 300 s restent à vérifier sur téléphone.
- Advisors : tables sociales/techniques sans policies = refus intentionnel ;
  RPC profil public SECURITY DEFINER intentionnelle et limitée aux champs publics ;
  protection mots de passe compromis désactivée, à traiter avant ouverture large.
- Aucun feed, favoris sociaux, messagerie ou notification n'a été publié.

## Retour arrière

Retirer l'accès à la preview Sites ou redéployer sa version précédente, sans
modifier GitHub Pages. Désactiver le cron `nailmoods-recette-cleanup` si besoin.
Révoquer les lignes `private.beta_tier_testers` pour arrêter les changements de tier.
Ne jamais appliquer ces actions au ref de production. Conserver les données de
recette pour diagnostic ; aucun rollback destructif du schéma n'est requis.

Verdict : backend principal **PASS**, recette humaine **à exécuter**. Pas de
validation globale V1 ni de publication principale.
