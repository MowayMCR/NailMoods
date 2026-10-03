import {canonicalBarcode} from '../supabase/functions/_shared/productCodes.mjs';
export {canonicalBarcode} from '../supabase/functions/_shared/productCodes.mjs';
// Identity evidence only. A photograph's color never participates in reference matching.
export const identityText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const identityContains = (text, value) => Boolean(value && (' '+text+' ').includes(' '+value+' '));
export const canonicalBrand = value => /^(kiko|kiko milano|kik0|kik0 milano)$/.test(identityText(value)) ? 'kiko milano' : identityText(value);
export const shortCode = value => /^\d{1,4}$/.test(String(value || '').trim()) ? String(Number(value)) : identityText(value);
export function barcodeObservation(rawBarcode, barcodeFormat = 'UNKNOWN', source = 'manual', confidence = null) {
  return {rawBarcode:String(rawBarcode ?? ''),barcodeFormat,barcodeSource:source,barcodeConfidence:Number.isFinite(confidence)?confidence:null};
}
export function productBarcodes(product) {
  return [product.ean13,product.gtin,product.barcode,...(Array.isArray(product.barcodeAliases)?product.barcodeAliases:[])].map(value=>canonicalBarcode(value)).filter(Boolean);
}
export const observationBarcode = value => typeof value === 'string' ? canonicalBarcode(value) : canonicalBarcode(value?.rawBarcode, value?.barcodeFormat);
export function parseProductText(text, products = [], {brand='',collection='',ocr=false} = {}) {
  const raw=String(text || '').slice(0,12000), q=identityText(raw);
  const known=[...new Set(products.map(p=>p.brand).filter(Boolean))];
  const detectedBrand=/\bkik[o0]\b/.test(q)?known.find(b=>canonicalBrand(b)==='kiko milano') || 'KIKO Milano':known.filter(b=>identityContains(q,identityText(b))).sort((a,b)=>b.length-a.length)[0] || '';
  const useBrand=brand || detectedBrand;
  const ranges=[...new Set(products.filter(p=>!useBrand || canonicalBrand(p.brand)===canonicalBrand(useBrand)).map(p=>p.collection).filter(Boolean))];
  // Recognize a visible range even when this catalogue has no shades from it.
  const visibleRange=canonicalBrand(useBrand)==='kiko milano' && /\bsmart(?: fast dry)?(?: nail lacquer)?\b/.test(q)?'Smart Fast Dry Nail Lacquer':'';
  const aliasCollection=products.filter(p=>!useBrand || canonicalBrand(p.brand)===canonicalBrand(useBrand)).find(p=>(p.collectionAliases||[]).some(a=>identityContains(q,identityText(a))))?.collection;
  const detectedCollection=visibleRange || aliasCollection || ranges.find(c=>identityContains(q,identityText(c))) || ranges.find(c=>{
    const distinctive=identityText(c).split(' ').filter(w=>!['nail','lacquer','polish','vernis','gel','colour','color'].includes(w));
    return distinctive.length>=2 && identityContains(q,distinctive.join(' '));
  }) || '';
  const barcodes=[];
  for(const line of raw.split(/\r?\n/)) {
    for(const m of line.matchAll(/(?<!\d)(?:\d[ -]?){7,13}\d(?!\d)/g))if(canonicalBarcode(m[0]))barcodes.push(barcodeObservation(m[0].trim(),'OCR_DIGITS','ocr'));
  }
  const shadeCodes=[], references=[], ignoredNumbers=[];
  for(const line of raw.split(/\r?\n/)) {
    const normalized=identityText(line);
    // Do not join separate OCR lines or erase a dash before interpreting a number.
    const inline=line.match(/\bkik[o0](?:\s+milano)?[ \t]+(\d{1,4})\b(?!\s*(?:ml|oz|g|m)\b)/i);
    if(inline)shadeCodes.push(inline[1]);
    for(const m of normalized.matchAll(/\b(?:sku|ref|reference|art|article)\s+([a-z0-9]+(?:[-/][a-z0-9]+)?)\b/g)){references.push(m[1]);if(/^\d{1,4}$/.test(m[1]))shadeCodes.push(m[1]);}
    for(const m of normalized.matchAll(/\b(?:shade|teinte|colou?r|col|numero|num|no|n)\s+(\d{1,4})\b/g))shadeCodes.push(m[1]);
    // Strip packaging quantities/batch information, not arbitrary numeric substrings.
    let clean=line.replace(/\b(?:lot|batch|exp|mfg|made|pa[o0])\b[^\n]*/gi,'').replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|fl\.?\s*oz|oz|g|kg|%|months?|mois|m)\b/gi,'').replace(/\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g,'');
    clean=identityText(clean);
    const rangeAliases=products.filter(p=>p.collection && [collection,detectedCollection].includes(p.collection)).flatMap(p=>[...(p.collectionAliases||[]),identityText(p.collection).split(' ').filter(w=>!['nail','lacquer','polish','vernis','gel','colour','color'].includes(w)).join(' ')]).filter(value=>identityContains(q,identityText(value)));
    for(const value of [useBrand,detectedBrand,collection,detectedCollection,...rangeAliases,'KIKO','MILANO','NAIL LACQUER','NAIL POLISH'])if(value)clean=clean.replace(new RegExp('\\b'+identityText(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g'),' ').trim();
    if(/^\d{1,4}$/.test(clean)){
      const punctuated=/^[\s|]*[-–—•.,'’]+\s*\d{1,4}\s*$/.test(line);
      const weakSingle=ocr && clean.length===1 && !collection && !detectedCollection && !inline;
      if(punctuated || weakSingle)ignoredNumbers.push({value:clean,line,reason:punctuated?'fragment_ocr_ponctue':'chiffre_isole_sans_contexte'});
      else shadeCodes.push(clean);
    }
  }
  return {rawText:raw,brand:useBrand,detectedBrand,collection:collection || detectedCollection,shadeCodes:[...new Set(shadeCodes)],ignoredNumbers,references:[...new Set(references)],barcodes:[...new Map(barcodes.map(b=>[canonicalBarcode(b.rawBarcode),b])).values()]};
}
export function mergeRecognitionEvidence(previous = {}, next = {}) {
  const observations=[...(previous.barcodes || []),...(next.barcodes || [])];
  return {...previous,...next,ocrViews:[...(previous.ocrViews || []),...(next.ocrViews || [])].slice(-2),rawText:[previous.rawText,next.rawText].filter(Boolean).join('\n').slice(-12000),barcodes:[...new Map(observations.map(b=>[b.rawBarcode+'|'+b.barcodeSource,b])).values()].slice(-6)};
}
export function recognitionPresentation({matches=[],barcodes=[],barcodeAttempted=false,catalogAvailable=true,hasColor=false,parsed={},ocrError=''}={}) {
  const decoded=barcodes.some(b=>b.rawBarcode && b.barcodeSource==='scanner');
  const hasCode=barcodes.some(b=>b.rawBarcode);
  const matched=matches.some(m=>m.evidence?.barcode!=null);
  const title=matches.length?matched?'Produit trouvé':'Référence proposée':decoded&&!catalogAvailable?'Code détecté · catalogue indisponible':decoded?'Ce produit n’est pas encore dans NailMoods':hasCode?'Code-barres relevé':parsed.brand?'Référence à préciser':barcodeAttempted?'Code-barres non lu':'Référence à préciser';
  let message=matches.length ? matched?'Correspondance par code-barres : confirme le produit.':'Référence proposée grâce au texte ou au numéro de teinte, à confirmer.' : !catalogAvailable?'Le catalogue est indisponible. Les informations lues sont conservées.' : hasCode?'Je n’ai pas encore cette référence dans mon catalogue.':barcodeAttempted?'Aucun code-barres lisible dans cette vue. Essaie l’étiquette dessous ou au dos.':'Je n’ai pas identifié la référence exacte.';
  if(catalogAvailable && !matches.length && !hasCode && parsed.brand && !parsed.shadeCodes?.length)message='La marque'+(parsed.collection?' et la gamme sont lues':' est lue')+', mais il manque le numéro de teinte ou le code-barres pour retrouver la bonne fiche. Photographie l’étiquette dessous / au dos, ou saisis la référence.';
  if(hasColor && !matches.length)message+=' La couleur estimée reste utilisable après confirmation.';
  return {title,message,needsSecondView:!matches.length || matches[0].score<85 || !(matches[0].evidence?.barcode || matches[0].evidence?.brand && (matches[0].evidence?.reference || matches[0].evidence?.shadeCode)),barcodeState:matched?'matched':decoded?'read_unknown':hasCode?'entered_unknown':barcodeAttempted?'unread':'not_attempted',failure:matches.length?'':!catalogAvailable?'catalogue_unavailable':hasCode?'barcode_not_in_catalogue':parsed.shadeCodes?.length?'shade_not_in_catalogue':ocrError?'ocr_unavailable':parsed.rawText?'insufficient_identity':'no_identity'};
}
