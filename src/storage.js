// Defer access: some browsers throw on the localStorage getter itself.
// Writes still throw so existing UI never claims an unsuccessful save.
export const browserStorage = {
  getItem(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  setItem(key, value) { window.localStorage.setItem(key, value); },
};
