# Journal discovery — Recette, 2026-09-21

Scope: Journal entry for Plus/Pro, 22 controlled moods and nine additional tag categories, editable composition/photo-colour suggestions, journal and inspiration publication, combined filters, 20-item pages, protected favorites/details/profile portfolios/images.

Authoritative access is checked from profiles.account_tier on every RPC/media read. Direct record reads retain workspace RLS and additionally deny Free reads of other authors. Existing profile discoverability is respected. Personal journal notes and arbitrary snapshot fields are not exposed. Photo colours are heuristic suggestions (backgrounds can influence them); techniques are derived from known composition or explicitly confirmed, not inferred as facts from images.

Applied only to pueqkbwfwxgqzmkauxoz (Recette): journal_discovery_controlled_tags, discovery_profile_private_guard, discovery_safe_composition_previews, discovery_free_team_read_guard. media-read redeployed with authenticated content authorization and no-store responses. Production unchanged.

Validation:
- 54 relevant Node tests passed: tags, journal persistence, inspiration preservation, media paths, account store, social events.
- Transaction rollback integration assertions passed on Recette: Plus/Pro allowed; Free/anonymous denied; controlled tags; private notes absent; combined filters; 20+2 pagination; favorites/detail; Public→Private removes results/favorites/profile and denies media; direct table RLS.
- Browser fixture at 390/360px: discovery opens, empty filter result, next page, favorite save/reload, detail open, suggested Witchy tag. Fixture is local-only and not included in Vite publication.
- Vite build passed. Generated inspiration preview returns only whitelisted visual fields.

Remaining manual acceptance: two real phones/accounts, uploaded-photo rendering, confirmation of suggested tags on personal nail photographs. Existing password leak protection warning is unrelated to this lot. Private no-policy tables are intentionally inaccessible directly.
