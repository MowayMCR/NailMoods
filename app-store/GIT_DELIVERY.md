# Livraison Git

- Dépôt : https://github.com/MowayMCR/NailMoods
- Base : `feat/google-play-billing-beta6`, `2ad90410549b5b0da31e2541d731742264f00717`.
- Branche créée et publiée : `feat/apple-storekit-ios`.
- Aucune fusion sur `main` ou la branche Android ; aucun push forcé.

| Commit | Contenu |
|---|---|
| e480cf91bdd4dd0f00a39e761d326f32554c45b3 | iOS/StoreKit, backend Apple, modèle de droits, UGC/privacy, tests et documents initiaux |
| f9aa1cd8e46558328aef14148f31f2af4b1026d8 | résolution `.jsx` sur macOS, tentative de restriction des permissions pg_net |
| aa588eebce793be67e263202a91fa7d3841cbce4 | nettoyage médias par nonce une fois, tests et CI d’archive appareil non signée |
| c49f5f73dfdd9f43665e68a2df4b56439bde4315 | textes inscription iOS cohérents avec achats facultatifs et largeur tactile minimale |
| 7bf749372787b80c1deec12c21a704199f77e221 | pièces jointes support réencodées avant upload pour retirer les métadonnées photo source |
| HEAD du dossier livré | audit final, preuves, checklist, actions Marie et état de livraison |

Le SHA exact du dossier/package final est inscrit dans `SOURCE_REVISION.txt` à la racine de l’archive livrée. Le commit du document ne peut contenir son propre SHA à l’avance. Comparaison lisible : [diff base → Apple](https://github.com/MowayMCR/NailMoods/compare/feat/google-play-billing-beta6...feat/apple-storekit-ios).

`FILES_CHANGED.txt` donne les chemins modifiés/créés par rapport à la base. Les assets PNG iOS et les ressources web natives sont générés, ignorés par Git et reproductibles via les scripts npm. Le package peut les inclure pour inspection ; `npm ci` puis `npm run ios:recette|production` reste la source de vérité du build et régénère la configuration.

Les changements backend exécutés en ligne sont listés séparément dans l’audit : ne pas assimiler le seul push de branche à un déploiement public web, à la publication Android ou à une activation des abonnements Apple Production.
