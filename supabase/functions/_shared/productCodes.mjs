// GS1 normalization shared by the offline reader and the online resolver.
// Keep codes as strings: a leading zero is part of the identity.
export function canonicalBarcode(value, format = '') {
  let code=String(value || '').replace(/[\s-]/g,'');
  if (['UPC_E','UPC-E'].includes(format)) {
    if (!/^[01]\d{7}$/.test(code)) return '';
    const [n,a,b,c,d,e,f,check] = code;
    code = Number(f) <= 2 ? n+a+b+f+'0000'+c+d+e+check :
      f === '3' ? n+a+b+c+'00000'+d+e+check :
      f === '4' ? n+a+b+c+d+'00000'+e+check : n+a+b+c+d+e+'0000'+f+check;
  }
  if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))return '';
  const body=code.slice(0,-1);let sum=0;
  for(let i=body.length-1,weight=3;i>=0;i--,weight=weight===3?1:3)sum+=Number(body[i])*weight;
  return (10-sum%10)%10===Number(code.at(-1))?code.padStart(14,'0'):'';
}
