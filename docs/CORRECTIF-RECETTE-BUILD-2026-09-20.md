# Correctif de publication Recette — 20 septembre 2026

La version Recette doit être construite exclusivement avec `scripts/build-recette.mjs`.
Ce script injecte la configuration publique du projet Supabase NailMoods-Recette et
interdit l'utilisation accidentelle du backend de production.

Un build Vite générique ne doit pas être publié sur le Site Recette.
