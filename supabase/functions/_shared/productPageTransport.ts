// Resolve then pin the TCP connection. TLS verifies the original hostname and
// uses it for SNI, without resolving it a second time (DNS rebinding protection).
import {MAX_PAGE_BYTES} from './productPageCore.mjs';
export async function pinnedRequest(url:URL,ip:string,{signal,maxBytes=MAX_PAGE_BYTES}:{signal:AbortSignal,maxBytes?:number}) {
  signal.throwIfAborted();
  let conn: Deno.TcpConn | Deno.TlsConn | undefined;
  const abort=()=>{try{conn?.close();}catch{}};
  signal.addEventListener('abort',abort,{once:true});
  try {
    conn=await Deno.connect({hostname:ip,port:url.protocol==='https:'?443:80});
    if(signal.aborted){conn.close();signal.throwIfAborted();}
    if(url.protocol==='https:')conn=await Deno.startTls(conn as Deno.TcpConn,{hostname:url.hostname});
    signal.throwIfAborted();
    const bytes=new TextEncoder().encode(`GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.hostname}\r\nAccept: text/html, application/json\r\nAccept-Encoding: identity\r\nUser-Agent: NailMoods-ProductImport/1.0\r\nConnection: close\r\n\r\n`);
    let offset=0;while(offset<bytes.length)offset+=await conn.write(bytes.subarray(offset));
    const chunks:Uint8Array[]=[];let size=0;
    while(true){signal.throwIfAborted();const buf=new Uint8Array(65536),n=await conn.read(buf);if(n===null)break;size+=n;if(size>maxBytes+65536)throw Error('PAGE_TOO_LARGE');chunks.push(buf.slice(0,n));}
    const raw=new Uint8Array(size);offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length;}
    const text=new TextDecoder('latin1').decode(raw),end=text.indexOf('\r\n\r\n');
    if(end<0||end>32768)throw Error('INVALID_HTTP');
    const [statusLine,...lines]=text.slice(0,end).split('\r\n'),match=statusLine.match(/^HTTP\/1\.[01] (\d{3})/);
    if(!match)throw Error('INVALID_HTTP');
    const headers=new Headers();for(const line of lines){const i=line.indexOf(':');if(i<1)throw Error('INVALID_HTTP');headers.append(line.slice(0,i),line.slice(i+1).trim());}
    if(headers.get('content-encoding')&&!/^identity$/i.test(headers.get('content-encoding')!))throw Error('CONTENT_ENCODING_BLOCKED');
    let body=raw.slice(end+4);
    if(headers.get('transfer-encoding')) {
      if(headers.get('transfer-encoding')!.toLowerCase()!=='chunked')throw Error('INVALID_HTTP');
      const chunks:Uint8Array[]=[];let pos=0,total=0;
      while(true){let e=pos;while(e<body.length-1&&!(body[e]===13&&body[e+1]===10))e++;const hex=new TextDecoder().decode(body.slice(pos,e)).split(';')[0];if(!/^[a-f\d]{1,8}$/i.test(hex))throw Error('INVALID_HTTP');const n=parseInt(hex,16);pos=e+2;if(n===0)break;if(pos+n+2>body.length||body[pos+n]!==13||body[pos+n+1]!==10)throw Error('INVALID_HTTP');total+=n;if(total>maxBytes)throw Error('PAGE_TOO_LARGE');chunks.push(body.slice(pos,pos+n));pos+=n+2;}
      body=new Uint8Array(total);offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length;}headers.delete('transfer-encoding');headers.delete('content-length');
    } else if(headers.has('content-length')&&Number(headers.get('content-length'))!==body.length)throw Error('INVALID_HTTP');
    if(body.length>maxBytes)throw Error('PAGE_TOO_LARGE');
    const status=Number(match[1]);return new Response([204,205,304].includes(status)?null:body,{status,headers});
  } finally {signal.removeEventListener('abort',abort);try{conn?.close();}catch{}}
}
