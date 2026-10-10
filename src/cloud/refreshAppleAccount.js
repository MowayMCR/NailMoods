// NailMoods access must refresh even when StoreKit is unavailable.
export async function refreshAppleAccount({reconcile, refresh, isActive}) {
  try {
    await reconcile();
  } finally {
    if (isActive()) await refresh();
  }
}
