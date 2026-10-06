export function restoreFavorite(library, idea) {
  if(library.favorites.some(row=>row.key===idea.key)) return library;
  return {...library,favorites:[idea,...library.favorites]};
}
export function restoreProduct(items, product) {
  const existing=items.find(row=>String(row.id)===String(product.id));
  if(existing && JSON.stringify(existing)!==JSON.stringify(product))throw Error('Cette référence a été modifiée. Ouvre sa fiche pour vérifier avant de la rétablir.');
  return existing?items:[...items,product];
}
