// Store availability must not prevent reading NailMoods account access.
export async function refreshGooglePlayAccount({reconcile, read, refresh, isActive, displayedTier}) {
  try {
    await reconcile();
  } finally {
    if (isActive()) {
      const after = await read();
      if (isActive() && displayedTier() !== after.tier) await refresh();
    }
  }
}
