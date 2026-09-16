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
