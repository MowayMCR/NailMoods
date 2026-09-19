export const RESERVED = new Set(['admin','support','nailmoods','official','system']);
export function normalizeHandle(value='') { return String(value).trim().replace(/^@/,'').toLowerCase(); }
export function handleError(value) {
 const handle=normalizeHandle(value);
 if(!/^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/.test(handle))return 'Choisis 3 à 30 lettres, chiffres, points ou underscores, sans espace, avec une lettre ou un chiffre aux extrémités.';
 if(RESERVED.has(handle))return 'Cet identifiant est réservé à NailMoods.';
 return '';
}
export function suggestHandle(displayName='') {
 const handle=displayName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,'.').replace(/[^a-z0-9._]/g,'').replace(/^[._]+|[._]+$/g,'').slice(0,30).replace(/[._]+$/g,'');
 return !handleError(handle)?handle:'mon.nailmoods';
}
// UUIDs remain routing/messaging keys. Renaming a handle never changes a relationship.
export function rankProfiles(rows, query) {
 const q=normalizeHandle(query);
 const rank=r=>r.handle===q?0:r.handle?.startsWith(q)?1:r.display_name?.toLowerCase()===q?2:3;
 return [...rows].sort((a,b)=>rank(a)-rank(b)||(a.display_name||'').localeCompare(b.display_name||'','fr'));
}
