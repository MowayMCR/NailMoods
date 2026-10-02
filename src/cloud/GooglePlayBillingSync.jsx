import { useEffect, useRef } from 'react';
import { isGooglePlayAndroid, prepareGooglePlayPurchase, restoreGooglePlayPurchases, readGooglePlayEntitlement, NailMoodsBilling } from './googlePlayBilling';
export default function GooglePlayBillingSync({ client, userId, tier, onChanged }) {
  const callback = useRef(onChanged); callback.current = onChanged;
  const displayedTier = useRef(tier); displayedTier.current = tier;
  useEffect(() => {
    if (!client || !userId || !isGooglePlayAndroid()) return;
    let alive = true, running = false, subscription, last = 0;
    async function sync(force = false) {
      if (!alive || running || (!force && Date.now() - last < 30000)) return;
      running = true; last = Date.now();
      try {
        const context = await prepareGooglePlayPurchase(client);
        if (context.enabled) await restoreGooglePlayPurchases(client);
        const after = await readGooglePlayEntitlement(client);
        if (alive && displayedTier.current !== after.tier) await callback.current?.();
      } catch { /* Keep server-granted capabilities; retry on next foreground. */ }
      finally { running = false; }
    }
    const resume = event => { if (event.detail?.isActive) void sync(); };
    window.addEventListener('nm-native-state', resume);
    NailMoodsBilling.addListener('purchasesUpdated', () => { void sync(true); }).then(handle => { if (alive) subscription = handle; else handle.remove(); }).catch(() => {});
    void sync();
    return () => { alive = false; window.removeEventListener('nm-native-state', resume); subscription?.remove(); };
  }, [client, userId]);
  return null;
}
