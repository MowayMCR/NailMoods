import {canonicalBarcode,canonicalBrand,identityText} from './productIdentity.js';
// Evidence of identity is separate from a similar colour. A shade number is scoped to its range.
export function compareProductIdentity(a={},b={}) {
 const brandA=canonicalBrand(a.brand),brandB=canonicalBrand(b.brand);
 const rangeA=identityText(a.collection),rangeB=identityText(b.collection);
 const refA=identityText(a.reference),refB=identityText(b.reference);
 const codeA=canonicalBarcode(a.barcode||a.rawBarcode||a.ean13||a.gtin),codeB=canonicalBarcode(b.barcode||b.rawBarcode||b.ean13||b.gtin);
 const catA=a.catalogId||a.provenance?.catalogId,catB=b.catalogId||b.provenance?.catalogId;
 const conflict=Boolean(brandA&&brandB&&brandA!==brandB||rangeA&&rangeB&&rangeA!==rangeB||refA&&refB&&refA!==refB||codeA&&codeB&&codeA!==codeB||catA&&catB&&catA!==catB);
 if(conflict)return {exact:false,reason:'Informations contradictoires · à vérifier'};
 if(codeA&&codeA===codeB)return {exact:true,reason:'Code-barres valide identique'};
 if(catA&&catA===catB)return {exact:true,reason:'Même référence catalogue'};
 if(brandA&&brandA===brandB&&rangeA&&rangeA===rangeB&&refA&&refA===refB)return {exact:true,reason:'Marque, gamme et référence identiques'};
 return {exact:false,reason:brandA&&brandA===brandB&&refA&&refA===refB?'Même numéro, gamme à préciser':'Référence à confirmer'};
}
export const productReferenceLabel=p=>[p.brand,p.collection,p.reference&&'Réf. '+p.reference].filter(Boolean).join(' · ');
