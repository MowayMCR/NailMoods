// Reproducible transfer of the existing read-only public catalogue. No invented
// source, technical assertion or verified claim. Idempotent: never overwrite a review.
import fs from 'node:fs';
const files=['catalog-v2.json','catalog-kiko-smart.json','catalog-official-brands.json'];
const products=[...new Map(files.flatMap(f=>JSON.parse(fs.readFileSync('public/'+f)).products).map(p=>[p.catalogId,p])).values()].sort((a,b)=>a.catalogId.localeCompare(b.catalogId));
const start=Number(process.argv[2]||0),size=Number(process.argv[3]||100),rows=products.slice(start,start+size);
if(process.argv.includes('--count')){console.log(products.length);process.exit();}
const json=JSON.stringify(rows).replace(/'/g,"''");
console.log(`with added as (insert into private.catalog_products(catalog_id,data) select p->>'catalogId',p from jsonb_array_elements('${json}'::jsonb) p on conflict(catalog_id) do nothing returning *) insert into private.catalog_history(catalog_id,revision,current_value,reason) select catalog_id,revision,to_jsonb(added),'Catalogue embarqué initial conservé · aucune nouvelle certification' from added; select count(*) as catalogue_count from private.catalog_products;`);
