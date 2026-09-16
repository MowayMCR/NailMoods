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
- Jusqu'à quatre propositions distinctes, avec cinq ongles schématiques, noms des produits et outils de l'inventaire, durée indicative et explication du choix. S'il n'y a pas assez de possibilités, le nombre réel est affiché.
- Les propositions sont composées localement avec des règles et les caractéristiques saisies. Il n'y a pas de génération d'images ou d'analyse IA distante. Les schémas ne prédisent pas le rendu photographique ni les motifs exacts des stickers.
- Semi-permanent et gel nécessitent une lampe déclarée ; cat-eye nécessite un aimant. Les dessins nécessitent les outils correspondants et un niveau suffisant. Les modes surprise ne contournent jamais les limites.
- Les effets à superposer dont la base et les accessoires ne sont pas identifiés restent signalés comme à préciser. Les bases/top coats ne sont pas utilisés comme vernis colorés. Les technologies de vernis différentes ne sont pas combinées dans une même proposition.
- Les durées portent sur la couleur et la décoration, hors préparation, dépose et séchage. La présence dans l'inventaire ne remplace pas la vérification de compatibilité dans les notices des produits et de la lampe.
- L'envie et l'idée retenue sont conservées dans `nm-creation-v1`. Modifier l'inventaire invalide les anciennes propositions et invite à relancer la création. Les données de collection et de profil sont conservées.
- Les fiches détaillées et les tutoriels restent prévus pour les phases 4 et 5.

Tests du moteur : `npm test`. Construction : `npm run build`.
