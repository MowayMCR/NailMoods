import fs from 'node:fs';
const config=JSON.parse(fs.readFileSync(new URL('../public/legal/editor.json',import.meta.url)));
const required=['publicLegalName','privacyContactEmail','supportContactEmail','publishedProfessionalAddress','retentionPolicy'];
if(config.editorType==='company')required.push('companyLegalForm','companyRegistrationNumber');
const missing=required.filter(k=>typeof config[k]!=='string'||!config[k].trim()||/à renseigner|example\.|exemple\./i.test(config[k]));
for(const k of ['privacyContactEmail','supportContactEmail'])if(config[k]&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config[k])&&!missing.includes(k))missing.push(k);
console.log(JSON.stringify({ready:!missing.length,missing,notice:'Configuration éditoriale uniquement ; ne vaut pas validation juridique ni GO fonctionnel.'},null,2));
if(missing.length)process.exitCode=1;
