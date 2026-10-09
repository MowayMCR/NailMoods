const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function poseTags(entry){return [...new Set(Object.values(entry.tags||entry.publicTags||entry.preview?.publicTags||{}).flat().filter(v=>typeof v==='string'))];}
export function filterBook(entries,query='',tag=''){const q=normalize(query.trim());return entries.filter(e=>(!tag||poseTags(e).includes(tag))&&(!q||normalize([e.title,e.mood,...poseTags(e)].join(' ')).includes(q))).sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured))||String(b.date||b.performedOn||'').localeCompare(String(a.date||a.performedOn||''))||String(a.id).localeCompare(String(b.id)));}
export function swipeDirection(dx,dy,width){return Math.abs(dx)>=Math.max(35,Math.min(80,width*.14))&&Math.abs(dx)>Math.abs(dy)*1.3?(dx<0?1:-1):0;}
export function bookPage(index,total,pageSize){return Math.min(Math.max(0,index),Math.max(0,Math.ceil(total/pageSize)-1));}
