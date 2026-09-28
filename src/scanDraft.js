export const SCAN_DRAFT_KEY='nm-scan-draft-v1';
export function readScanDraft(storage) {
 try {const value=JSON.parse(storage.getItem(SCAN_DRAFT_KEY));if(!value||!Array.isArray(value.products)||value.products.length>2||value.products.some(p=>!/^#[0-9a-f]{6}$/i.test(p.color)))return null;
 const stage=['capture','confirm','second','effects','results'].includes(value.stage)?value.stage:'capture';
 return {...value,stage:stage==='results'&&!(value.ideas?.length)?'effects':stage,effects:Array.isArray(value.effects)?value.effects:[],ideas:Array.isArray(value.ideas)?value.ideas:[]};
 }catch{return null;}
}
