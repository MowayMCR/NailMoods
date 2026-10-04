// Reviewed primary-source records. These are data, never inferred from a product's
// personal metadata or a `verified` flag. Scope is exact brand/range/name/type/SKU.
const green='https://www.manucurist.com/products/red-cherry-1';
const flash='https://www.manucurist.com/products/vernis-green-flash-red-cherry';
export const PRODUCT_DOCUMENTS=Object.freeze([
 {id:'manucurist-green-red-cherry-fr-20261004',identity:{brand:'Manucurist',collection:'Green',name:'Red Cherry',type:'Vernis',sku:'33005'},checkedAt:'2026-10-04',market:'France · 15 ml',sourceUrl:green,opacity:'Opaque',inci:'butyl acetate, ethyl acetate, nitrocellulose, adipic acid/neopentyl glycol/trimellitic anhydride copolymer, acetyl tributyl citrate, alcohol, isopropyl alcohol, stearalkonium bentonite, acrylates copolymer, ci 15850 (red 7 lake), hea ipdi isocyanurate trimer/polycaprolactone diol copolymer, ci 73360 (red 30), tris-hea ipdi isocyanurate trimer, diacetone alcohol, sorbic acid, ci 15850 (red 7 lake), phosphoric acid, n-butyl alcohol, ci 77499 (iron oxides)'},
 {id:'manucurist-flash-red-cherry-fr-20261004',identity:{brand:'Manucurist',collection:'Green Flash',name:'Red Cherry',type:'Semi-permanent',sku:'51006'},checkedAt:'2026-10-04',market:'France · 15 ml',sourceUrl:flash,opacity:'Opaque',inci:'ethyl acetate, butyl acetate, nitrocellulose, hydroxyethyl acrylate/IPDI/PPG-15 glyceryl ether copolymer, acetyl tributyl citrate, isopropyl alcohol, bis-HEMA poly(1,4-butanediol)-9/IPDI copolymer, stearalkonium bentonite, ethyl trimethylbenzoyl phenylphosphinate, phosphoric acid, diacetone alcohol, BHT, silica, CI 12085 (red 36), CI 15850 (red 7 lake), CI 73360 (red 30), CI 19140 (yellow 5 lake)'}
]);
// Compatibility concerns the stated manicure system, not a health guarantee.
export const SYSTEM_DOCUMENTS=Object.freeze([
 {id:'green-flash-system',brand:'Manucurist',range:'Green Flash',type:'Semi-permanent',kinds:['Couleur','Base Coat','Top Coat brillant'],sourceUrl:flash,checkedAt:'2026-10-04',sameSystem:true,exclusive:true,summary:'Le fabricant prévoit une base, une couleur et un top Green Flash. Il exclut leur mélange avec les bases, couleurs et tops d’autres systèmes.'}
]);
