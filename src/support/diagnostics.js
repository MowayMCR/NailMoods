export const APP_VERSION='12-p3.1';
let activeStorage=null;
export const setDiagnosticsStorage=storage=>{activeStorage=storage;};
export const recordRuntimeEvent=(category,outcome='error',code)=>recordDiagnostic(activeStorage,category,outcome,code);
export async function diagnosticFetch(input,init){
 const storage=activeStorage;
 let category='supabase';try{const path=new URL(typeof input==='string'?input:input.url).pathname;category=path.startsWith('/auth/')?'auth':path.startsWith('/storage/')||path.includes('/media-read')?'storage':/nm_social|nm_safety|share|proposal/.test(path)?'social':'supabase';}catch{}
 try{const response=await fetch(input,init);recordDiagnostic(storage,category,response.ok?'ok':'error');return response;}catch(e){recordDiagnostic(storage,'network','error');throw e;}
}
export const CATEGORIES=['auth','network','supabase','storage','generation','import','social','ui'];
const KEY='nm-safe-diagnostics-v1';
export function safeDiagnostics(rows){return (Array.isArray(rows)?rows:[]).filter(r=>CATEGORIES.includes(r?.category)&&['operation_ok','operation_failed','offline','unhandled'].includes(r.code)&&['ok','error'].includes(r.outcome)&&/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(r.at)).slice(-30).map(({category,code,outcome,at})=>({category,code,outcome,at}));}
export function recordDiagnostic(storage,category,outcome='error',code=outcome==='ok'?'operation_ok':'operation_failed'){
 try{const entries=safeDiagnostics(JSON.parse(storage.getItem(KEY)||'[]'));storage.setItem(KEY,JSON.stringify(safeDiagnostics([...entries,{category,code,outcome,at:new Date().toISOString()}])));}catch{/* Diagnostics never interrupt the application. */}
}
export function readDiagnostics(storage){try{return safeDiagnostics(JSON.parse(storage.getItem(KEY)||'[]'));}catch{return [];}}
export function platformLabel(ua=''){return /android/i.test(ua)?'Android':/iphone|ipad|ipod/i.test(ua)?'iOS':/windows|macintosh|linux/i.test(ua)?'Desktop':'Other';}
