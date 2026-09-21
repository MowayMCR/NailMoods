// Only documented shade-specific destinations are presented as shopping links.
export function preciseProductUrl(item = {}) {
  const value = item.shadeUrl || (item.urlScope === 'shade' ? item.url : '');
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}
