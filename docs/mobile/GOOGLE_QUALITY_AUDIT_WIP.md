# Audit Google — checkpoint du 30 septembre 2026

Travail en cours, exclu du candidat juridique Phase 14E beta.5 à la demande explicite de Marie. Aucun build signé ni conformité globale Google 2027 ne sont revendiqués pour cette branche.

Base : correctif photo de profil 51398ad. Évolutions préparées : R8/ressources optimisés (AGP 8.13), libération de canvas temporaires après OCR/code-barres/compression. 66 tests ciblés Node PASS et test UI photo Chromium avec backend simulé PASS. Compilation Android optimisée interrompue avant validation finale par le changement de périmètre vers 14E. Aucun déploiement fonctionnel Production.

Constats à reprendre :
- targetSdk 36 déjà en place ; aucune migration requise sur ce point.
- R8 désactivé dans beta.4 ; exigences d’optimisation DEX annoncées pour février 2027. Mesurer le DEX et les taux effectifs, ne pas confondre taille AAB et DEX ni flags et taux.
- Seuils mémoire Android vitals : établir des mesures sur appareil, puis observations P90 sur la fenêtre Google. Le nettoyage des buffers ne démontre pas à lui seul leur respect.
- Restore Credentials annoncé pour avril 2027 : absent. La session Supabase persistante actuelle n’est pas ce mécanisme de transfert vers un nouvel appareil. Concevoir une intégration sécurisée avec le backend existant ; aucun contournement, second système Auth ou enregistrement serveur n’a été ajouté.
- Bibliothèques CameraX 1.4.2 de beta.4 : alignements PT_LOAD 16 Kio, mais certains contrôles GNU_RELRO de la documentation Google échouent. CameraX stable 1.6.2 téléchargé pour inspection uniquement : le contrôle reste négatif sur libsurface_util_jni.so. Aucune mise à jour de dépendance effectuée ; investigation / test 16 Kio requis avant revendication de conformité complète.
- L’article abonnements décrit des possibilités de croissance facultatives. Billing reste hors Phase 14 ; aucun SDK ajouté.

Sources officielles consultées :
- https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html
- https://android-developers.googleblog.com/2026/09/unlocking-Google-play-subscription-growth.html
- https://support.google.com/googleplay/android-developer/answer/17492799
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://developer.android.com/guide/practices/page-sizes
- https://developer.android.com/identity/sign-in/restore-credentials
- https://developer.android.com/topic/performance/app-optimization/enable-app-optimization

Les détails de cet audit devront être validés dans un lot distinct, avec numéro de candidat ultérieur, avant distribution de ces changements. Ne pas confondre le GO juridique 14E avec une certification des futures exigences techniques.
