// Google signs the raw query preceding &signature=. Never reserialize signed parameters.
function bytes64(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export function derSignatureToRaw(bytes){
 if(bytes[0]!==0x30||bytes[1]!==bytes.length-2)throw Error('invalid_signature');
 let pos=2;const raw=new Uint8Array(64);
 for(let n=0;n<2;n++){
  if(bytes[pos++]!==2)throw Error('invalid_signature');const len=bytes[pos++];let part=bytes.slice(pos,pos+len);pos+=len;
  if(part.length!==len||len<1||len>33)throw Error('invalid_signature');if(part.length===33){if(part[0]!==0)throw Error('invalid_signature');part=part.slice(1);}
  raw.set(part,32*n+32-part.length);
 }
 if(pos!==bytes.length)throw Error('invalid_signature');return raw;
}
export async function verifyAdmobCallback(rawQuery,keys,allowedUnits,now=Date.now()){
 if(typeof rawQuery!=='string'||rawQuery.length>8192)throw Error('invalid_callback');
 const marker=rawQuery.indexOf('&signature=');if(marker<1)throw Error('invalid_signature');
 const signed=rawQuery.slice(0,marker),params=new URLSearchParams(rawQuery);
 // Only signature and key ID may be outside the signed payload.
 const tail=new URLSearchParams(rawQuery.slice(marker+1));
 if([...tail.keys()].some(k=>!['signature','key_id'].includes(k)))throw Error('invalid_callback');
 for(const key of ['signature','key_id','ad_unit','timestamp','transaction_id','custom_data'])if(params.getAll(key).length!==1)throw Error('invalid_callback');
 if(!allowedUnits.includes(params.get('ad_unit')))throw Error('invalid_ad_unit');
 const timestamp=Number(params.get('timestamp'));if(!Number.isFinite(timestamp)||Math.abs(now-timestamp)>3600000)throw Error('expired_callback');
 const nonce=params.get('custom_data');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nonce))throw Error('invalid_ticket');
 const key=keys.find(k=>String(k.keyId)===params.get('key_id'));if(!key?.pem)throw Error('unknown_key');
 const body=key.pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'');
 const publicKey=await crypto.subtle.importKey('spki',bytes64(body),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicKey,derSignatureToRaw(bytes64(params.get('signature'))),new TextEncoder().encode(signed)))throw Error('invalid_signature');
 return {ticket:nonce,transactionId:params.get('transaction_id')};
}
