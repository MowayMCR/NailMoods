// Run ONLY with dedicated confirmed test accounts, supplied via secure environment.
// No service_role key, signup email delivery, credentials or tokens are logged.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const required=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','NM_TEST_FREE_EMAIL','NM_TEST_FREE_PASSWORD','NM_TEST_PLUS_EMAIL','NM_TEST_PLUS_PASSWORD','NM_TEST_PRO_EMAIL','NM_TEST_PRO_PASSWORD'];
if(required.some(k=>!process.env[k])){console.error('Tests distants non exécutés : trois comptes de test confirmés doivent être fournis par environnement sécurisé.');process.exit(2);}
const project=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!key.startsWith('sb_publishable_'))throw new Error('Clé publique requise.');
const clients=[],cleanup=[];let successes=0;
async function ok(request){const {data,error}=await request;if(error)throw new Error('Requête de test refusée ou indisponible.');return data;}
try{
 for(const tier of ['free','plus','pro']){
  const client=createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients.push(client);
  const data=await ok(client.auth.signInWithPassword({email:process.env[`NM_TEST_${tier.toUpperCase()}_EMAIL`],password:process.env[`NM_TEST_${tier.toUpperCase()}_PASSWORD`]}));
  const profile=await ok(client.from('profiles').select('id,account_tier').eq('id',data.user.id).single());assert.equal(profile.account_tier,tier);
  const workspaces=await ok(client.from('workspaces').select('id').eq('owner_user_id',data.user.id).eq('kind','personal'));assert.ok(workspaces.length);
  client.testContext={userId:data.user.id,workspaceId:workspaces[0].id};successes++;
 }
 const [a,b]=clients,{userId,workspaceId}=a.testContext;
 assert.notEqual(userId,b.testContext.userId);
 for(const [table,values] of [
  ['user_products',{shade_name:'Test isolation Phase 12A',hex:'#553366',metadata:{test:true}}],
  ['inspirations',{title:'Test isolation Phase 12A',is_public:false,snapshot:{test:true}}],
  ['journal_entries',{performed_on:new Date().toISOString().slice(0,10),notes:'Test isolation Phase 12A',snapshot:{test:true}}],
 ]){
  const id=crypto.randomUUID();await ok(a.from(table).insert({id,workspace_id:workspaceId,created_by:userId,...values}).select('id').single());cleanup.push([a,table,id]);
  assert.equal((await ok(a.from(table).select('id').eq('id',id))).length,1);
  const response=await b.from(table).select('id').eq('id',id);assert.ok(response.error || response.data.length===0);
  const changed=await b.from(table).update(values).eq('id',id).select('id');assert.ok(changed.error || changed.data.length===0);successes++;
 }
 const spaces=await b.from('workspaces').select('id').eq('id',workspaceId);assert.ok(spaces.error||spaces.data.length===0);successes++;
 // A separately provisioned private conversation is required; no fake passing test.
 if(!process.env.NM_TEST_MESSAGE_A_ID)throw new Error('Test messages non exécuté : fournir une fixture privée du compte Free, créée côté administration.');
 const messageId=process.env.NM_TEST_MESSAGE_A_ID;
 assert.equal((await ok(a.from('messages').select('id').eq('id',messageId))).length,1);
 const messages=await b.from('messages').select('id').eq('id',messageId);assert.ok(messages.error||messages.data.length===0);successes++;
 console.log(`${successes} contrôles distants réussis (comptes et isolation lecture/écriture).`);
}catch{console.error(`Validation distante incomplète après ${successes} contrôle(s). Vérifier comptes confirmés, plans attribués côté admin, fixtures et règles RLS. Aucun secret affiché.`);process.exitCode=1;}
finally{
 for(const [client,table,id] of cleanup){const {error}=await client.from(table).delete().eq('id',id);if(error){console.error('Nettoyage d’une fixture de test à vérifier.');process.exitCode=1;}}
 for(const client of clients)await client.auth.signOut();
}
