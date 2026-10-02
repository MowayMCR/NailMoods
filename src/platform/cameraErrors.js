export function cameraErrorMessage(error){
  const s=String(error?.message||'')+' '+String(error?.code||'');
  if(/cancel|annul|No images? picked/i.test(s))return '';
  if(/denied|permission|autorisation|0007|0010/i.test(s))return 'Accès à la caméra refusé. Autorise NailMoods dans les réglages du téléphone, ou importe une photo de l’étiquette depuis la galerie.';
  return 'Impossible d’ouvrir la caméra ou cette photo. Tu peux choisir une image dans la galerie ou ajouter le produit manuellement.';
}
