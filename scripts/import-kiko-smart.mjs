// Offline, reproducible ingestion of official KIKO product pages. No photo-based identity or color.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseHTML} from 'linkedom';
import {canonicalBarcode} from '../src/productIdentity.js';
const directory=process.argv[2];
if(!directory)throw new Error('Usage: node scripts/import-kiko-smart.mjs OFFICIAL_HTML_DIRECTORY');
const checkedAt='2026-10-03', rows=[],sources=[];
for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.html')).sort()){
 const html=fs.readFileSync(path.join(directory,file),'utf8');
 const {document}=parseHTML(html), selected=JSON.parse(document.querySelector('#__NEXT_DATA__').textContent).props.pageProps.selected;
 const url=document.querySelector('link[rel=canonical]')?.href;
 if(!/^https:\/\/www\.kikocosmetics\.com\/fr-fr\/p\/smart-nail-lacquer-/.test(url)||!selected.slug?.startsWith('smart-nail-lacquer-'))throw new Error('Wrong official product page: '+file);
 const label=String(selected.color||'').match(/^(\d{1,4})\s+(.+)$/);
 const reference=String(selected.shade_number||label?.[1]||''), name=selected.shade_name||label?.[2];
 if(Number(selected.slug.match(/-(\d+)$/)?.[1])!==Number(reference))throw new Error('Conflicting shade identity: '+file);
 if(!reference||!name)throw new Error('Missing shade identity: '+file);
 const barcodes=[...new Set((selected.barcodes||[]).filter(value=>canonicalBarcode(value)))];
 const catalogColor=/^[a-f0-9]{6}$/i.test(selected.hex_color||'')?'#'+selected.hex_color.toLowerCase():'';
 const id='nm-kiko-smart-'+reference;
 const sourceSha256=crypto.createHash('sha256').update(html).digest('hex');
 sources.push({url,sourceSha256,reference,name,sku:selected.backend_id||'',barcodes,catalogColor});
 rows.push({catalogId:id,catalogVersion:'KIKO-Smart-2026-10-03',brand:'KIKO Milano',collection:'Smart Fast Dry Nail Lacquer',collectionAliases:['Smart Nail Lacquer','Smart Fast Dry','Smart'],name,reference,shadeCode:reference,sku:selected.backend_id||'',skuUnique:true,type:'Vernis',sourceType:'vernis classique',url,sourceCheckedAt:checkedAt,identityStatus:'Officiel vérifié',lamp:'Non',usage:'Couleur seule',...(selected.finish_effect==='GLOSSY'?{finish:'Brillant'}:{}),barcodeAliases:barcodes,scanVariants:barcodes.map(rawBarcode=>({gtin:canonicalBarcode(rawBarcode),rawBarcode,symbology:rawBarcode.length===13?'EAN-13':'UNKNOWN',source:url})),...(barcodes[0]?{gtin:canonicalBarcode(barcodes[0])}:{}),...(catalogColor?{catalogColor,colorValidated:true,colorSource:'official_hex',colorEvidence:{source:url,field:'selected.hex_color',sourceSha256}}:{})});
}
if(new Set(rows.map(p=>p.catalogId)).size!==rows.length)throw new Error('Duplicate official shade');
const result={version:'KIKO-Smart-2026-10-03',checkedAt,source:'Official KIKO France, selected product only',count:rows.length,products:rows};
fs.writeFileSync('public/catalog-kiko-smart.json',JSON.stringify(result,null,2)+'\n');
fs.mkdirSync('docs/scan-correctif-20261003/evidence',{recursive:true});
fs.writeFileSync('docs/scan-correctif-20261003/evidence/kiko-official-sources.json',JSON.stringify({checkedAt,sources},null,2)+'\n');
console.log(JSON.stringify({products:rows.length,barcodes:rows.reduce((n,p)=>n+p.barcodeAliases.length,0),officialColors:rows.filter(p=>p.colorValidated).length}));
