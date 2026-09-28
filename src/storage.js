import { nativeServices } from './platform/state.js';
// Defer access: some browsers throw on the localStorage getter itself.
// Writes still throw so existing UI never claims an unsuccessful save.
export const browserStorage = {
  getItem(key) { try { return (nativeServices()?.storage || window.localStorage).getItem(key); } catch { return null; } },
  removeItem(key) { (nativeServices()?.storage || window.localStorage).removeItem(key); },
  setItem(key, value) { (nativeServices()?.storage || window.localStorage).setItem(key, value); },
};
