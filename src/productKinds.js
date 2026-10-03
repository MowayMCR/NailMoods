export const productKinds=['Couleur','Base coat','Top Coat','Top Coat brillant','Top Coat mat','Gel de construction','Cleaner','Primer','Dépose / soin','Autre produit'];
export function productKind(item={}) {
  if(productKinds.includes(item.productKind))return item.productKind;
  const s=[item.name,item.collection,item.sourceType].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/\btop[ -]*coat\b/.test(s))return /\bmat(te)?\b/.test(s)?'Top Coat mat':/brillant|gloss|shine/.test(s)?'Top Coat brillant':'Top Coat';
  if(/\b(biab|builder(?:[ -]+(?:gel|in[ -]+a[ -]+bottle))?|gel[ -]+de[ -]+construction|gel[ -]+de[ -]+modelage)\b/.test(s))return 'Gel de construction';
  if(/\b(base[ -]*coat|rubber[ -]+base|base[ -]+gel)\b/.test(s))return 'Base coat';
  if(/\b(primer|bond(?:er)?|dehydrator|deshydratant)\b/.test(s))return 'Primer';
  if(/\b(cleaner|cleanser|degraissant)\b/.test(s))return 'Cleaner';
  if(/\b(remover|dissolvant|cuticle oil|huile cuticules)\b/.test(s))return 'Dépose / soin';
  return 'Couleur';
}
export const productNeedsColor = item => productKind(item)==='Couleur';
export const productCanGenerate = item => ['Couleur','Gel de construction'].includes(productKind(item));
