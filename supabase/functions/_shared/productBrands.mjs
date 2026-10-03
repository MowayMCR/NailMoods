// Recognizable product labels, independent of catalogue coverage. No shade facts.
export const productBrandLabels=Object.freeze([
 ['KIKO Milano',['kiko','kik0','kiko milano','kik0 milano']],
 ['Manucurist',['manucurist']],['OPI',['opi']],['CANNI',['canni']],
 ['Le Mini Macaron',['le mini macaron','le mini macaron europe','camelia beauty']],
 ['Maybelline',['maybelline','maybelline new york','gemey maybelline','gemey']],
 ['Monoprix',['monoprix','monoprix make up','monop make up','monop makeup']],
 ['Fashion Make Up',['fashion make up','fashion makeup']],
 ['H&M',['h m','hm']],['Yves Rocher',['yves rocher']],['Essie',['essie']],
 ['Biguine',['biguine','biguine makeup','biguine make up','jean claude biguine']],
]);
export const brandLabelText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function knownProductBrand(value){const s=brandLabelText(value);return productBrandLabels.find(([,aliases])=>aliases.includes(s))?.[0]||'';}
export function detectProductBrand(text){const q=' '+brandLabelText(text)+' ';return productBrandLabels.flatMap(([name,aliases])=>aliases.filter(a=>q.includes(' '+a+' ')).map(a=>({name,length:a.length}))).sort((a,b)=>b.length-a.length)[0]?.name||'';}
