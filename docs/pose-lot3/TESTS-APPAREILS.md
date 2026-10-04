# Validation mobile restante — Lot 3

Statut : À EXÉCUTER sur Android et iPhone. Aucun des résultats ci-dessous n’est encore déclaré réussi.

Utiliser une compilation de recette, jamais la Production, avec comptes de test dédiés. Java 21 + SDK Android / Xcode 26+ requis selon les plateformes. Aucun AAB public n’est demandé à ce stade.

1. Ouvrir un projet → Planifier cette pose. Choisir une heure de pose et un rappel à quelques minutes dans le futur.
2. Refuser les notifications : le Planning reste utilisable et aucun succès de programmation n’est annoncé.
3. Autoriser dans Mes rappels : contrôler l’apparition du compteur. Sur Android, aucune demande « alarmes exactes » ne doit apparaître.
4. Réception avec app au premier plan ; puis arrière-plan ; puis app fermée normalement (pas arrêt forcé). Noter délai réel, modèle, OS et réglage batterie.
5. Toucher la notification : elle ouvre le bon projet du bon compte, y compris au lancement à froid. Un autre compte ne doit pas accéder au projet.
6. Modifier, désactiver puis supprimer le rappel : l’ancien horaire ne doit plus produire de notification. Vérifier aussi l’annulation/suppression du moment.
7. Désactiver une catégorie : ses rappels ne doivent plus être programmés. Tester le retrait hors ligne, puis la restauration après reconnexion.
8. Se déconnecter avant le rappel ; reconnecter un second compte : aucun ancien rappel ne doit subsister sur le téléphone.
9. Ajouter au calendrier : vérifier titre, date, fuseau, durée et lien. Annuler l’éditeur puis recommencer et enregistrer. Sur Android, confirmer que l’app n’annonce jamais à tort « enregistré ».
10. Vérifier une journée entière, un événement horaire, un fuseau différent, un changement d’heure ; ouvrir le lien depuis le calendrier après fermeture de NailMoods.
11. Sur iOS 16, vérifier le fallback .ics ; sur iOS 17+, vérifier l’éditeur sans permission permanente. Sur Android sans calendrier, vérifier le message et le fallback .ics.
12. Détails privés non cochés : aucune note ni référence produit exportée. Cocher volontairement et contrôler la copie.
13. Reboot téléphone, réglages notifications désactivés depuis l’OS, perte réseau et reconnexion. Vérifier la limite des 60 prochains rappels et le rechargement de la file après retour dans l’app.

Conserver captures et résultats avant GO du Lot 3 mobile. Le Lot 4 attend cette validation ; aucune diffusion automatique.
