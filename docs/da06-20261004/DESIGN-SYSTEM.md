# Design System NailMoods — DA 06

Une structure commune ; quatre palettes globales. Les illustrations et le symbole NailMoods sont conservés.

## Tokens

| Token | Soft Glam | Dark Feminine | Cottagecore | Pop Pastel |
|---|---|---|---|---|
| backgroundPrimary | #fbf5ef | #241823 | #f7f5e9 | #faf5fe |
| backgroundSecondary | #f5e8e7 | #30212d | #eeeddd | #f0e6f6 |
| backgroundTertiary | #ead1d7 | #553044 | #dce2c9 | #e4d6f4 |
| surfacePrimary | #fffaf7 | #3b2835 | #fdfbef | #fffaff |
| surfaceSecondary | #f5e8e7 | #30212d | #eeeddd | #f0e6f6 |
| surfaceElevated | #fffaf7 | #3b2835 | #fdfbef | #fffaff |
| accentPrimary | #80435e | #ecc0d0 | #4f6140 | #704b91 |
| accentSecondary | #a9627b | #c889a2 | #8a6657 | #9b5175 |
| accentSoft | #ead1d7 | #553044 | #dce2c9 | #e4d6f4 |
| textPrimary | #35242d | #fff1ed | #30372a | #392c49 |
| textSecondary | #6f5662 | #dbc1cd | #5e6553 | #6c587b |
| textMuted | #6f5662 | #dbc1cd | #5e6553 | #6c587b |
| textOnAccent | #fff8f5 | #321c29 | #fffdf1 | #fffaff |
| borderDefault | #d9bdc8 | #785568 | #bac4a6 | #cdb5dd |
| borderActive | #80435e | #ecc0d0 | #4f6140 | #704b91 |
| iconDefault | #6f5662 | #dbc1cd | #5e6553 | #6c587b |
| iconActive | #80435e | #ecc0d0 | #4f6140 | #704b91 |
| chipBackground | #f5e8e7 | #30212d | #eeeddd | #f0e6f6 |
| chipActive | #80435e | #ecc0d0 | #4f6140 | #704b91 |
| filterActive | #80435e | #ecc0d0 | #4f6140 | #704b91 |
| navigationActive | #80435e | #ecc0d0 | #4f6140 | #704b91 |
| progressActive | #80435e | #ecc0d0 | #4f6140 | #704b91 |
| cardHighlight | #ead1d7 | #553044 | #dce2c9 | #e4d6f4 |
| selectionBackground | #ead1d7 | #553044 | #dce2c9 | #e4d6f4 |
| overlay | #37202abb | #120b13cc | #242d24bb | #30203fbb |
| productSurface | #f4f3f1 | #f4f3f1 | #f4f3f1 | #f4f3f1 |
| productInk | #302b2d | #302b2d | #302b2d | #302b2d |
| error | #a12f47 | #ffb4b9 | #9c3842 | #a33257 |
| success | #386244 | #b5dbbd | #42633e | #37634f |
| shadow | 0 8px 28px #37202a12 | 0 8px 28px #120b1312 | 0 8px 28px #242d2412 | 0 8px 28px #30203f12 |

## Typographie et rythme

Georgia (Serif éditoriale déjà présente) + Inter/system-ui pour l’interface ; aucune police distante obligatoire. Display 44, H1 32–40, H2 25, H3 20, Subtitle 16, Body 14–16, Body Small 13, Label 13, Caption 11–12, Button 14, Chip 12 px. Interlignage texte 1,5–1,6. Espacements 4/8/12/16/24/32 px ; rayons 12/20/28 px, chips arrondis. Ombres discrètes dérivées du token overlay. Cibles nouvelles ≥44 px.

## Composants et états

| Famille | Implémentation / réemploi | États et règles |
|---|---|---|
| Boutons Primary / Secondary / Outline / Ghost | design/UI.jsx + boutons métier existants | pressed, disabled natif, loading aria-busy, focus visible |
| Icon Button | round, header, fenêtres | cible 44 px, nom accessible |
| Chip / Mood Chip / Filter / Removable | MoodGlyph, taxonomyTag, chips, favoriteStyles, filterRow | aria-pressed, coche ou bordure/épaisseur, suppression nommée |
| Bento / Profile / Preference | nmBento, nmProfileBento, settingTile | surfaces globales, CTA métier conservés |
| Feed / Product / Journal cards | Discovery, productCard, JournalView | états vide/erreur/chargement, favoris existants |
| Swatch / Finish Swatch | composants couleur et finish.css conservés | HEX réel inchangé ; fond produit neutre |
| Avatar / Badge | ProfileAvatar, AccountAvatar, nmBadge | média existant authentifié, initiales/illustration existante |
| Tabs / Header / Bottom navigation | main.jsx, socialTabs, poseTabs | aria-current / aria-pressed ; Profil en haut |
| Search / Input / Toggle | formulaires existants, nmField, checkbox native stylisée | labels, focus, disabled, erreurs textuelles |
| Modal / Bottom Sheet | Sheet conservé | historique retour, focus, Échap, thème mis à jour en direct |
| Toast / Empty / Error / Loader | feedback métier existant, Splash, nmLoader | messages textuels, role status/alert ; aucune couleur seule |
| Skeleton | design/UI.jsx, Fil et Profil public | role status, formes décoratives ; mouvement réduit respecté |
| Coach Mark | CoachTour | vrai écran, navigation, retour, skip persistant, rejeu depuis Aide |

## Ajouter un mood

Ajouter une entrée complète dans visualMoods. Les écrans consomment les tokens et les anciens alias sont centralisés. npm run build régénère boot.css depuis la même source. Exécuter les tests de contraste et les quatre contrôles UI (ou les étendre à la nouvelle palette). Ne jamais appliquer un filtre colorimétrique global aux photos, rendus d’ongles ou atlas d’icônes.
