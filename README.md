# NailMoods

Prototype V0.1 de NailMoods, une application web mobile-first pour créer des inspirations de manucure à partir de sa collection, de ses moods et de ses habitudes.

## Test local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Déploiement

Le dépôt contient un workflow GitHub Pages dans `.github/workflows/deploy-pages.yml`. Une fois GitHub Pages configuré sur **GitHub Actions**, chaque mise à jour de `main` construit et publie automatiquement l'application.

Les données de cette V0.1 sont conservées localement dans le navigateur (`localStorage`). Aucun backend n'est nécessaire pour ce prototype.

## Phase 2 — collection et matériel

- Le filtre **Matériel** donne accès à un ajout direct. Le menu général **Ajouter** propose aussi **Matériel & accessoires**.
- Une fiche matériel contient sa catégorie, son nom, sa marque, sa référence, sa quantité et ses notes. Les stickers, décorations et capsules peuvent préciser une couleur ou un motif.
- Les cartes matériel utilisent une icône dédiée ou la photo ajoutée. Elles ne contribuent pas au compteur des couleurs de vernis.
- Une photo peut être importée ou prise avec le téléphone, puis remplacée ou retirée. Elle est réduite à 800 px maximum et conservée avec la fiche sur l'appareil. Un échec de stockage laisse la fiche ouverte et préserve la collection enregistrée.
- Les liens de produits sont conservés. La récupération automatique des photos et des caractéristiques des boutiques, l'analyse visuelle et la lecture des codes-barres ne sont pas encore implémentées.
- La clé `nm-collection-v2` est conservée pour retrouver les produits existants ; le profil `nm-profile` n'est pas modifié.

## Phase 3 — créer une manucure

Accès direct : `https://mowaymcr.github.io/NailMoods/#creer`, ou onglet **Créer**.

- Trois envies : comme d'habitude, envie de changement, surprends-moi (Safe / Creative / Chaos).
- Tuiles tactiles pour l'humeur, l'univers, l'occasion, le temps, la difficulté et les limites. Les premiers choix viennent du profil ; les ajustements ne modifient pas ce profil.
- La tuile **Nombre de vernis** propose **Automatique** ou exactement **1, 2, 3, 4 ou 5 vernis colorés**. Le nombre est conservé et affiché sur chaque proposition. Stickers, bases et top coats ne sont pas comptés. Les compositions à trois, quatre et cinq références utilisent chaque vernis dans les cinq ongles de l'aperçu.
- Si le nombre demandé ne peut pas être atteint avec les produits du même type de pose et les limites actuelles, l'écran indique le maximum disponible et propose d'ajuster le choix. Il ne réduit jamais silencieusement le nombre demandé. Des références partageant une teinte générique provisoire restent sélectionnables séparément.
- Jusqu'à quatre propositions distinctes, avec cinq ongles schématiques, noms des produits et outils de l'inventaire, durée indicative et explication du choix. S'il n'y a pas assez de possibilités, le nombre réel est affiché.
- Les propositions sont composées localement avec des règles et les caractéristiques saisies. Il n'y a pas de génération d'images ou d'analyse IA distante. Les schémas ne prédisent pas le rendu photographique ni les motifs exacts des stickers.
- Semi-permanent et gel nécessitent une lampe déclarée ; cat-eye nécessite un aimant. Les dessins nécessitent les outils correspondants et un niveau suffisant. Les modes surprise ne contournent jamais les limites.
- Les effets à superposer dont la base et les accessoires ne sont pas identifiés restent signalés comme à préciser. Les bases/top coats ne sont pas utilisés comme vernis colorés. Les technologies de vernis différentes ne sont pas combinées dans une même proposition.
- Les durées portent sur la couleur et la décoration, hors préparation, dépose et séchage. La présence dans l'inventaire ne remplace pas la vérification de compatibilité dans les notices des produits et de la lampe.
- L'envie et l'idée retenue sont conservées dans `nm-creation-v1`. Modifier l'inventaire invalide les anciennes propositions et invite à relancer la création. Les données de collection et de profil sont conservées.
- Les fiches détaillées sont disponibles en phase 4 et les tutoriels guidés en phase 5.

## Phase 4 — fiches d’inspiration, variantes et favoris

- **Voir la fiche** ouvre chaque proposition : cinq ongles tactiles du pouce à l’auriculaire, détails des couleurs / French / lignes / pois / stickers, références, marque, finition, matériel, durée indicative et difficulté. La répartition s’applique aux deux mains.
- Les photos déjà ajoutées à la collection apparaissent avec les références. Les liens HTTP(S) enregistrés ouvrent la boutique ; **Voir ma fiche** retrouve directement le produit dans la collection.
- Les variantes conservent le nombre exact de vernis, le temps maximal, le niveau et les limites de l’idée initiale. Elles utilisent l’inventaire actuel, privilégient la même palette et restent distinctes. S’il n’existe aucune variante, le message l’indique.
- Les cœurs conservent des copies des compositions dans `nm-inspirations-v1`, indépendamment des futures générations. Les photos ne sont pas dupliquées. Les favoris se retrouvent dans **Créer → Mes inspirations favorites** ou depuis l’accueil, avec leur propre route `#favoris`.
- Une fiche favorite garde les références et teintes enregistrées même après une modification de la collection. Un produit supprimé, épuisé ou modifié est signalé. Il ne devient pas disponible artificiellement.
- La dernière inspiration retenue et douze fiches récentes permettent de rouvrir une fiche ou de revenir en arrière, y compris après rechargement. Les favoris ne sont pas limités aux douze fiches récentes. Les erreurs de stockage sont affichées ; un favori n’est confirmé qu’après enregistrement.
- L’accueil donne accès à **Profil, Collection, Créer et Favoris**. Le profil validé en phase 1 a été réintégré depuis son historique, avec ses sélecteurs visuels, univers, thèmes, avatars et sa clé de stockage d’origine. Le bouton Profil de l’en-tête fonctionne aussi. Les clés `nm-profile`, `nm-collection-v2` et `nm-creation-v1` restent inchangées.
- Le Journal reste accessible avec l’explication de son développement à venir. Les tutoriels sont disponibles en phase 5 ; les photos et notes du journal restent à réaliser.

## Phase 5 — réaliser une pose guidée

- Depuis **Créer → Voir la fiche → Démarrer le tutoriel**, choisir la première main puis suivre la préparation, les couleurs, les dessins ou stickers de l’inspiration et la finition. Les cinq ongles sont repérés pour chaque main ; un effet magnétique est traité ongle par ongle.
- Chaque étape reprend les références de l’inspiration enregistrée. Les couches, la préparation et les instructions de compatibilité restent celles du fabricant ; le guide ne les déduit pas de la teinte. Aucune base, couche de finition ou durée sous lampe n’est imposée automatiquement. Les systèmes varient, y compris les lampes d’une même marque ([FAQ Le Mini Macaron](https://leminimacaron.eu/pages/faqs)).
- Les listes à cocher et le bouton **Valider et continuer** suivent l’avancement réel. Il est possible de consulter toutes les étapes, revenir sur un choix ou décocher une étape. Une étape future ne peut pas être validée avant celles qui la précèdent, et une pose n’est terminée qu’après validation des deux mains et du contrôle final.
- Les minuteurs sont facultatifs et saisis par l’utilisatrice (1 seconde à 60 minutes). Ils sont associés à l’étape et peuvent être mis en pause, repris, remis à zéro ou relancés pour une nouvelle couche. La durée n’est jamais présélectionnée depuis le type de vernis. Un compte à rebours actif bloque la validation jusqu’à sa fin ou sa mise en pause ; son expiration ne valide aucune étape.
- Le décompte utilise une échéance absolue, conservée dans `nm-tutorials-v1` : navigation, rechargement et mise en arrière-plan ne repartent pas de la durée initiale. Mettre la pose en pause fige le minuteur ; reprendre la pose ne relance pas automatiquement la lampe ou le minuteur. La fin est visuelle, sans son ni notification garantie écran verrouillé ; le temps écoulé est retrouvé au retour.
- La tuile de reprise reste visible dans les autres écrans. **Accueil → Mes poses guidées** donne accès à toutes les poses préparées, en pause ou terminées. Démarrer une autre pose met la précédente en pause ; refaire une pose crée un suivi distinct, sans supprimer la précédente.
- Les sessions contiennent une copie de la composition et des étapes, sans dupliquer les photos. Les modifications de collection sont signalées, sans remplacer silencieusement les produits du tutoriel. Les échecs de sauvegarde laissent la progression précédente intacte et affichent un message.
- Profil, Collection, Créer, fiches, variantes et favoris restent accessibles, avec leurs clés de stockage d’origine. Les résultats des poses seront exploitables pour le futur Journal, mais aucun journal de photos ou de notes n’est encore annoncé comme disponible.

Tests du moteur : `npm test`. Construction : `npm run build`.
