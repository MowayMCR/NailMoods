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
