// Public product facts only. Remote markup is parsed as data, never executed.
export const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const plainText = value => String(value || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g, match => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' }[match])).replace(/\s+/g, ' ').trim().slice(0, 500);

export function productURL(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('Colle le lien complet de la fiche produit, avec https://.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname) || url.hostname.startsWith('[') || /^[\d.:\[\]]+$/.test(url.hostname)) {
    throw new Error('Utilise le lien HTTPS public d’une boutique.');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  return url;
}

export function imageURL(value, base) {
  const source = typeof value === 'string' ? value : value?.src || value?.url;
  if (!source) return '';
  try { return productURL(new URL(source, base).href).href; } catch { return ''; }
}

export function shopifyURL(value) {
  const url = productURL(value);
  const match = url.pathname.match(/^(.*?)(?:\/collections\/[^/]+)?\/products\/([^/]+?)\/?$/);
  if (!match) return null;
  url.pathname = `${match[1]}/products/${match[2].replace(/\.(?:js|json)$/, '')}.js`;
  url.search = '';
  return url.href;
}

export function validBarcode(value) {
  const code = String(value || '').replace(/[\s-]/g, '');
  if (!/^(?:\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === check;
}

export function inferTraits(title, category = '', tags = []) {
  const name = normalizeText(title), kind = normalizeText(category);
  const explicit = Array.isArray(tags) ? tags.map(normalizeText) : [];
  const has = (...values) => values.some(value => explicit.includes(value));
  const text = `${name} ${kind}`;
  const result = {};
  // Only a product's name, category and explicit tags are used. Descriptions often
  // mention other products, finishes and top coats that do not describe this item.
  const equipment = [
    [/\b(?:stickers?|decalcomanies?|nail wraps?)\b/, 'Stickers / décalcomanies'],
    [/\b(?:lamp|lampe)\b/, 'Lampe UV / LED'],
    [/\b(?:magnet|aimant)\b/, 'Aimant cat-eye'],
    [/\b(?:dotting|outil a pois)\b/, 'Dotting tool'],
    [/\b(?:brush|pinceau)\b/, 'Pinceau'],
    [/\b(?:file|buffer|lime|polissoir)\b/, 'Lime / polissoir'],
    [/\b(?:stamping|tampon)\b/, 'Stamping'],
    [/\b(?:rhinestones?|strass)\b/, 'Strass / décorations'],
    [/\b(?:cuticle pusher|repousse cuticules)\b/, 'Outil de préparation'],
    [/\b(?:nail tips|capsules|chablons)\b/, 'Capsules / chablons'],
  ].find(([pattern]) => pattern.test(name));
  if (/\b(?:kit|bundle|coffret|set)\b/.test(name)) return result; // a mixed kit needs a human choice
  if (/\b(?:chrome powder|poudre chrome|powder pen)\b/.test(text)) Object.assign(result, { type: 'Effet', finish: 'Chrome', usage: 'Sur une couleur de base' });
  else if (equipment) Object.assign(result, { type: 'Matériel', equipmentCategory: equipment[1] });
  else if (/\b(?:semi permanent|gel polish|gel nail polish)\b/.test(text)) result.type = 'Semi-permanent';
  else if (/\b(?:builder gel|gel de construction|gel uv)\b/.test(text)) result.type = 'Gel';
  else if (/\b(?:nail polish|vernis classique|nail lacquer)\b/.test(text)) result.type = 'Vernis';
  if (result.type === 'Matériel') return result;
  if (/\b(?:cat eye|magnetique|magnetic)\b/.test(text) || has('cat eye', 'magnetic')) Object.assign(result, { finish: 'Cat-eye', effect: 'Magnétique', usage: 'Avec aimant' });
  else if (/\b(?:multichrome|duochrome)\b/.test(text) || has('multichrome', 'duochrome')) Object.assign(result, { finish: 'Chrome', effect: 'Multichrome' });
  else if (/\b(?:holographic|holographique)\b/.test(text) || has('holographic')) result.effect = 'Holographique';
  else if (has('glitter', 'glittery', 'paillete') || /\b(?:glitter|paillete)\b/.test(name)) Object.assign(result, { finish: 'Pailleté', effect: 'Pailleté' });
  else if (has('shimmery', 'shimmer', 'nacre', 'pearl')) Object.assign(result, { finish: 'Nacré', effect: 'Irisé' });
  if (has('jelly') || /\bjelly\b/.test(name)) result.finish = 'Jelly';
  if (has('matte', 'mat') || /\b(?:matte|mat)\b/.test(name)) result.finish = 'Mat';
  if (has('creme', 'cream')) result.finish = 'Crème';
  const families = { purple: 'Violet', pink: 'Rose', red: 'Rouge', blue: 'Bleu', green: 'Vert', orange: 'Orange', yellow: 'Jaune', brown: 'Brun', nude: 'Nude', beige: 'Beige', black: 'Noir', white: 'Blanc', silver: 'Argent', gold: 'Or' };
  for (const [tag, family] of Object.entries(families)) if (has(`color ${tag}`)) { result.family = family; break; }
  return result;
}

export function shopifyCandidate(raw, source, variantId) {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) throw new Error('Cette page ne contient pas de fiche produit lisible.');
  const url = productURL(source);
  const variants = (Array.isArray(raw.variants) ? raw.variants : []).slice(0, 250).map(v => ({
    id: String(v.id), title: plainText(v.title), sku: plainText(v.sku), barcode: validBarcode(v.barcode) ? String(v.barcode).replace(/[\s-]/g, '') : '', image: imageURL(v.featured_image, url),
  }));
  const requested = variantId ?? url.searchParams.get('variant');
  const variant = requested ? variants.find(v => v.id === requested) : variants.length === 1 ? variants[0] : null;
  const images = [...new Set([variant?.image, imageURL(raw.featured_image, url), ...(Array.isArray(raw.images) ? raw.images : []).map(img => imageURL(img, url))].filter(Boolean))].slice(0, 12);
  const title = plainText(raw.title);
  const suffix = variant && variant.title !== 'Default Title' ? ` · ${variant.title}` : '';
  const fields = { name: (title + suffix).slice(0, 200), brand: plainText(raw.vendor), ...inferTraits(title + suffix, raw.type || raw.product_type, typeof raw.tags === 'string' ? raw.tags.split(',').map(x => x.trim()) : raw.tags) };
  if (variant?.sku) fields.reference = variant.sku;
  if (variant?.barcode) fields.barcode = variant.barcode;
  if (images[0]) fields.photo = images[0];
  if (variant) url.searchParams.set('variant', variant.id);
  return { fields, images, variants, variantId: variant?.id || '', needsVariant: variants.length > 1 || Boolean(requested && !variant), source: url.href, raw, method: 'url' };
}

export function structuredCandidate(doc, source) {
  const products = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if ([node['@type']].flat().includes('Product')) products.push(node);
    if (node['@graph']) visit(node['@graph']);
    if (node.mainEntity) visit(node.mainEntity);
  };
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { visit(JSON.parse(script.textContent)); } catch { /* malformed unrelated metadata */ }
  }
  if (products.length !== 1) throw new Error('Impossible d’isoler un seul produit sur cette page. Ajoute sa photo ou renseigne la fiche.');
  const product = products[0];
  const name = plainText(product.name);
  if (!name) throw new Error('Le nom du produit n’est pas disponible sur cette page.');
  const images = [product.image].flat().map(value => imageURL(value, source)).filter(Boolean).slice(0, 12);
  const fields = { name, brand: plainText(typeof product.brand === 'string' ? product.brand : product.brand?.name), ...inferTraits(name, product.category) };
  if (images[0]) fields.photo = images[0];
  if (product.sku) fields.reference = plainText(product.sku);
  const barcode = product.gtin13 || product.gtin12 || product.gtin14 || product.gtin8 || product.gtin;
  if (validBarcode(barcode)) fields.barcode = String(barcode);
  return { fields, images, variants: [], variantId: '', needsVariant: false, source, method: 'url' };
}

export async function readResponse(response, maxBytes = 2_500_000) {
  if (!response.ok) throw new Error('La boutique ne répond pas pour ce produit. Vérifie le lien puis réessaie.');
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Cette page est trop volumineuse. Essaie une photo du produit.');
  const reader = response.body?.getReader();
  if (!reader) { const body = await response.text(); if (body.length > maxBytes) throw new Error('Page trop volumineuse.'); return body; }
  const chunks = []; let size = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw new Error('Page trop volumineuse.'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

export async function fetchProduct(value, signal, fetcher = fetch) {
  const url = productURL(value).href, endpoint = shopifyURL(url);
  const response = await fetcher(endpoint || url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
  const body = await readResponse(response);
  if (endpoint) { let raw; try { raw = JSON.parse(body); } catch { throw new Error('Cette boutique ne fournit pas de fiche lisible avec ce lien. Utilise une photo ou la saisie manuelle.'); } return shopifyCandidate(raw, url); }
  return structuredCandidate(new DOMParser().parseFromString(body, 'text/html'), url);
}

let catalogCache;
// This public catalog provides SKUs (not all barcodes). A SKU match is only a
// search hint: fetch the actual variant and verify its barcode before returning.
export async function miniMacaronCatalog(signal, fetcher = fetch) {
  if (catalogCache) return catalogCache;
  const result = [], seen = new Set();
  for (let page = 1; page <= 8; page++) {
    const response = await fetcher(`https://leminimacaron.eu/products.json?limit=250&page=${page}`, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    const { products } = JSON.parse(await readResponse(response, 6_000_000));
    if (!Array.isArray(products)) throw new Error('Le catalogue est momentanément indisponible.');
    const next = products.filter(p => typeof p.handle === 'string' && !seen.has(p.id));
    for (const item of next) { seen.add(item.id); result.push(item); }
    if (products.length < 250 || !next.length) { catalogCache = result; return result; }
  }
  return result;
}

export function barcodeMatches(products, code) {
  if (!validBarcode(code)) return [];
  const normalized = code.replace(/[\s-]/g, '').padStart(14, '0');
  return products.flatMap(product => (product.variants || []).filter(variant => [variant.barcode, variant.sku].some(value => validBarcode(value) && String(value).replace(/[\s-]/g, '').padStart(14, '0') === normalized)).map(variant => ({ product, variant })));
}

export async function lookupBarcode(code, signal, fetcher = fetch) {
  if (!validBarcode(code)) throw new Error('Vérifie les chiffres : ce code-barres est incomplet ou incorrect.');
  const products = await miniMacaronCatalog(signal, fetcher);
  const matches = barcodeMatches(products, code);
  for (const { product, variant } of matches.slice(0, 6)) {
    const candidate = await fetchProduct(`https://leminimacaron.eu/products/${encodeURIComponent(product.handle)}?variant=${variant.id}`, signal, fetcher);
    if (candidate.fields.barcode?.padStart(14, '0') === code.replace(/[\s-]/g, '').padStart(14, '0')) return { ...candidate, method: 'barcode' };
  }
  throw new Error('Aucune référence trouvée dans le catalogue Le Mini Macaron Europe consulté. Tu peux ajouter ce produit avec son lien, sa photo ou son nom.');
}

export function textMatches(products, text) {
  const normalized = ` ${normalizeText(text)} `;
  // Require the complete distinctive shade name. No fuzzy substitution between
  // similar products and no automatic choice from a photo alone.
  return products.filter(product => {
    const name = normalizeText(String(product.title).split(/\s[-–|]\s/)[0]);
    return name.length >= 4 && normalized.includes(` ${name} `) && product.variants?.some(v => v.requires_shipping !== false);
  }).slice(0, 8);
}
