# Nail preview — single contour correction

The shared illustrated renderer had an unclipped ellipse behind the lower edge,
a white curved seam above it, and a dark-to-light rebound in the depth gradient.
Together these read as a second nail, particularly on white polish.

Removed the ellipse and seam, and made the depth gradient continuous. The existing
CSS silhouette shadow remains. Cat Eye / velvet highlights now fade at their edge
instead of outlining another inset oval. Shape paths, product HEX values, French
boundaries, decorations, and original brand assets remain unchanged.

Changed UI: `src/NailPreview.jsx`, shared by inspiration previews and pose sheets.
No database, permissions, backend or native changes. No AAB.

Validation: actual React renderer in Chromium, before/after screenshots, six shapes
across eight techniques, red/white and brown/white sets; 320/360/390/430 px in all
four moods. No horizontal overflow or overlapping nail SVG boxes. Product SVGs
are identical across moods. 522 unit tests pass; two existing optional skips.
Production build passes (existing large-chunk warning).

Reproduce with `NAILMOODS_BROWSER_EXECUTABLE=/path/to/chromium node scripts/check-nail-contour-visual.mjs`.
The optional first argument names captures (default `after`), and
`NAILMOODS_VISUAL_OUTPUT` changes the output directory.

Rollback: revert the single fix commit and let GitHub Pages rebuild.
