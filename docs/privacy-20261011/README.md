# Audit confidentialité NailMoods — 11 octobre 2026

## Résultat

Audit statique du code et du binaire signé 0.8.1 (30004) réalisé. Publication de la déclaration encore bloquée : tracking AdMob non démontré sur appareil, rapport Xcode Organizer non fourni, contrôles contractuels OpenAI et repères de santé non vérifiés.

Le [tableau complet Apple](../../app-store/APPLE_PRIVACY_ANSWERS.md) remplace les réponses obsolètes du 2 octobre. Sept catégories supplémentaires sont justifiées ; trois catégories existantes doivent inclure les usages des SDK. Santé et Contacts sont conservées avec une justification précise. Santé perd la finalité de personnalisation non démontrée ; l'historique de recherche des tendances IA est ajouté au manifeste app. Les manifestes des fournisseurs sont intacts.

## Preuves

- [Manifestes réellement embarqués](evidence/shipped-manifest-report-30004.json) : cinq fichiers, 18 types de données dans leur union. SearchHistory, supplémentaire dans le code AI, n'était pas déclaré dans 30004.
- [Inspection de l'archive](evidence/archive-inspection.json), version/signature/SDK et fermeture de l'ancien laboratoire seulement.
- [Provenance et empreintes](evidence/artifact-provenance.json) : IPA signé et artefact GitHub.
- [Statut Apple](evidence/apple-testflight-status.json) : VALID, IN_BETA_TESTING dans le groupe interne Nailmoods ; pas publication publique.
- [Versions SPM](evidence/Package.resolved) : GoogleMobileAds 13.6.0, UMP 3.1.0, Capacitor 8.5.2.

L'IPA contient aussi NailMoods AI : la fermeture d'IAPlus n'est pas une fermeture de l'assistant commun. L'audit du code ne certifie pas la version déployée de chaque Edge Function ni les paramètres actuels des comptes de production.

## Reproduction

```
python scripts/ci/privacy-report.py chemin/App.ipa rapport.json
```

Sur macOS, le même script accepte le dossier .app de l'archive. Il extrait intégralement les manifestes et agrège les déclarations, sans accès réseau. Cette agrégation ne représente pas une observation de collecte effective et ne remplace pas Xcode Organizer → archive → Generate Privacy Report. Conserver le PDF Organizer avec l'archive finale et confronter son contenu à ce rapport et au tableau Apple.

## Corrections préparées

Politique publique 0.9-beta : rectificatif daté, copie antérieure conservée ; OpenAI, synchronisation du profil, repères et suivi décrits. Aucun changement de clé/version de consentement, aucune attribution de droits. Publication web du rectificatif non réalisée dans cette branche.

Message des repères : suppression de l'affirmation « sur cet appareil », incompatible avec la synchronisation du profil connecté. Manifestes : finalité Santé corrigée et SearchHistory ajouté. Inspection CI : inclut collectes et tracking des SDK. Binaire 30004 déjà signé inchangé : les corrections doivent être embarquées dans une nouvelle archive.

## Contrôles restant nécessaires

1. Valider le tracking sur iPhone/iPad pour UMP/AdMob : état ATT, requêtes avant opt-in, après opt-in et après refus/relancement ; obtenir la preuve de l'usage des identifiants. Ne pas conclure « aucun suivi » d'après le seul mode test. Aucun achat ni annonce payante requis.
2. Générer le vrai rapport Organizer de la nouvelle archive ; l'artefact disponible ne livre pas le .xcarchive.
3. Vérifier les réglages/DPA/transferts/rétention du projet OpenAI. store:false ne garantit pas une conservation nulle. Valider les dispositions relatives aux données d'état des ongles avant publication.
4. Intégrer le rectificatif et vérifier de nouveau l'URL publique ainsi que les textes embarqués.
5. Saisir les changements Apple après clôture du point tracking ; aucune saisie ni publication automatique effectuée.

Aucun accès compte, achat commercial, publicité commerciale ou appel IA payant réalisé par cet audit.

## Vérifications des corrections

63 tests ciblés réussis, aucun échec ; compilation Web réussie ; plist et scripts Python validés ; concordance de l’agrégation depuis l’IPA et depuis son dossier .app vérifiée ; diff sans erreur de format. Aucune compilation native nouvelle ni observation réseau SDK réalisée dans cet environnement Linux. [Résultats](evidence/validation.json).
