# 0.8.0 / build 9 — Android and Apple synchronization

Shared baseline: production e90b862c564613b2f981a4307647012f59588afc,
including DA06, pose cycle lots 1–11, and the single-contour nail correction.
Both store branches were ancestors of this baseline; no native divergence is discarded.

The native Production build previously hard-coded the pose cycle off. Both native
environments now enable it by default, with an explicit false override for rollback.
This does not grant any premium or IA+ entitlement. Existing backend authorizations,
manual beta rights and closed IA+ flags are unchanged.

Embedded mobile diagnostics record the feature flag. Release CI checks the actual
built assets for approved features and the corrected nail contour. iOS marketing
version and build number follow the shared version source, including on future syncs.
VersionCode 9 supersedes the already-generated code 8 bundle; marketing version stays 0.8.0.

Android integration CI retains Java and Recette APK checks. The separate v0.8 workflow
is the authoritative release-bundle build, avoiding the obsolete beta7-named duplicate.
It exports R8 mapping and any available native symbol metadata. Stripped upstream
CameraX libraries may still lack full native debug symbols.

Apple CI builds an unsigned simulator app and device archive in Recette; it does not
publish to TestFlight. No store upload, purchase activation or paid IA call is made.

Before general distribution, physical-device validation remains required: upgrade
without data loss, native camera, calendar, auth return, notifications and timer alerts
with app open/background/closed. CI and browser checks do not attest these OS behaviors.
