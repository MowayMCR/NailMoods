// Primary manufacturer page, reviewed 2026-10-04. Exact named lamps only.
// No generic 48 W record: that page does not identify a sufficiently exact model.
const identity={brand:'Manucurist',collection:'Green Flash',name:'Red Cherry',type:'Semi-permanent',sku:'51006'};
export const MANUFACTURER_PROTOCOLS=Object.freeze([
 ...[['premium',60,'Manucurist · Lampe Premium 36W'],['slim',120,'Manucurist · Lampe Slim 24W']].map(([id,seconds,lamp])=>({version:1,id:'manucurist-red-cherry-'+id,kind:'curing',brand:'Manucurist',range:'Green Flash',productType:'Semi-permanent',reference:'51006',identity,title:'Chaque couche fine de couleur Red Cherry',verifiedOn:'2026-10-04',sourceUrl:'https://www.manucurist.com/products/vernis-green-flash-red-cherry',seconds,lampModels:[lamp],layer:'color',instructions:'Durée du fabricant pour chaque couche fine de cette couleur, avec ce modèle Manucurist uniquement. Respecte le système Green Flash et la notice de ton flacon.'}))
]);
