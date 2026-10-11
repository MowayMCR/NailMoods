# Correction DA et accès IA — 11 octobre 2026

## Constats documentés
- Les six nouvelles vignettes étaient universelles ; les autres utilisaient les quatre moods. Les captures montrent donc deux palettes différentes dans la même grille.
- La tuile AssistantEntry transmettait directement le SyntheticEvent du clic à openAssistant(idea). Cet événement devenait initialIdea ; NailPreview attendait une pose structurée. Correction du callback et validation de la pose aux deux entrées.
- La demande de 08:15:14 UTC a échoué sur `invalid_response`, diagnostic serveur `unrelated_motif`, avant toute génération d'image. Modèle texte gpt-4.1-mini ; coût fournisseur enregistré 0,004714 USD. Cela ne correspond pas à `content_not_allowed`. Le plan rejeté n'était pas conservé : impossible de déterminer le motif exact, ou d'exclure une mention négative déclenchant le contrôle.
- Le schéma envoyé au modèle proposait encore la liste historique `motif`, avec `winged-orb`. Le nouveau schéma impose une valeur vide dans ce champ historique et utilise les descriptions artistiques du plan maître. Les anciennes poses restent lisibles. Les contrôles de pertinence ne sont pas supprimés ; aucun nouvel essai payant automatique.

## Mise à jour visuelle
Les six sujets sont conservés. Cottagecore conserve les originaux ; les trois autres moods disposent de déclinaisons Soft Glam, Dark Feminine et Pop Pastel. Le composant commun sélectionne la vignette par sujet et par mood. Génération via le skill imagegen à partir des références existantes, fond transparent ; exports WebP adaptés aux tuiles. Fichiers `public/atelier/tiles-v4/`.

Prompts : conserver objets et compositions (carnet/loupe IA, doigt d'entraînement, tenue, chevalet de dessin, appareil photo et éventail de capsules) ; modifier uniquement matières, couleurs et botanique. Soft Glam : rose cassis, blush et or champagne, pivoines. Dark Feminine : prune, cerise sombre, charbon et or ancien, roses sombres. Pop Pastel : lavande, rose, jaune beurre et turquoise, marguerites. Sans texte, décor ni cadre. Les illustrations de navigation n'imposent aucune palette aux créations IA.

Tuiles compactes, hauteur de vignette contrôlée, titres centrés avec espace réservé à deux lignes, légendes courtes, rayons et marges réguliers. Page IA : un seul titre illustré, marges latérales, formulaire encadré ; fonctions existantes, administration et consentement conservés.

## Validation et limites
Tests ajoutés : clic de tuile sans transmission d'événement, schéma sans proposition culturelle historique, échec conservant le texte avec un seul appel, quatre DA et changement de vignettes, petits écrans et tablette.
Le correctif ne vaut pas validation artistique d'un nouveau rendu Beetlejuice. Une nouvelle recette réelle reste à comparer avant de déclarer l'ensemble du moteur artistique validé. Accès administratrice, budgets, clés et comptes inchangés. Aucun build mobile demandé.
