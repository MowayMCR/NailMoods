import {createServer} from 'vite';import {setup,A} from '../tests/helpers/pose-db.js';import {executeReviewQuery} from '../tests/helpers/pose-sql-client.js';
export async function startPoseReview(port=4228){
 const db=await setup();let queue=Promise.resolve();
 const server=await createServer({server:{host:'127.0.0.1',port,strictPort:true},plugins:[{name:'local-pose-review',configureServer(vite){vite.middlewares.use('/__pose-foundations',(req,res,next)=>{
  if(req.method!=='POST'){res.statusCode=405;return res.end();}let text='';req.on('data',chunk=>{text+=chunk;if(text.length>300000)req.destroy();});req.on('end',()=>{
   queue=queue.then(async()=>{try{const q=JSON.parse(text);const result=await executeReviewQuery(db,q,A);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));}catch{res.statusCode=400;res.end('{}');}});
  });
 });}}]});await server.listen();
 return {server,db,url:`http://127.0.0.1:${port}/review/pose-foundations.html`,async close(){await server.close();await queue;await db.close();}};
}
if(process.argv[1]?.endsWith('serve-pose-foundations.mjs')){const running=await startPoseReview();console.log('Atelier local uniquement : '+running.url);process.on('SIGINT',async()=>{await running.close();process.exit();});}
