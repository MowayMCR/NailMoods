// Dedicated confirmed accounts only, credentials supplied through a secure environment.
// Creates data fixtures via authenticated clients; never creates artificial auth users.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const required=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','NM_TEST_FREE_EMAIL','NM_TEST_FREE_PASSWORD','NM_TEST_PLUS_EMAIL','NM_TEST_PLUS_PASSWORD','NM_TEST_PRO_EMAIL','NM_TEST_PRO_PASSWORD'];
if(required.some(k=>!process.env[k])){console.error('Tests distants non exécutés : trois comptes de test confirmés sont requis via environnement sécurisé.');process.exit(2);}
const project=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!key.startsWith('sb_publishable_'))throw new Error('Clé publique requise.');
const clients=[],cleanup=[];let successes=0;
async function ok(request){const {data,error}=await request;if(error)throw new Error('Requête de contrôle refusée ou indisponible.');return data;}
async function denied(request){const response=await request;
 // A network failure, invalid token, unknown table/column or missing fixture is NOT a passing RLS test.
 if(response.error)assert.equal(response.error.code,'42501');else assert.deepEqual(response.data,[]);
 successes++;
}
async function fixture(client,table,values){const id=crypto.randomUUID();await ok(client.from(table).insert({id,...values}).select('id').single());cleanup.push([client,table,id]);return id;}
try{
 for(const tier of ['free','plus','pro']){
  const client=createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients.push(client);
  const data=await ok(client.auth.signInWithPassword({email:process.env[`NM_TEST_${tier.toUpperCase()}_EMAIL`],password:process.env[`NM_TEST_${tier.toUpperCase()}_PASSWORD`]}));
  assert.ok((await ok(client.auth.getUser())).user.email_confirmed_at);
  const profile=await ok(client.from('profiles').select('id,account_tier').eq('id',data.user.id).single());assert.equal(profile.account_tier,tier);
  const workspaces=await ok(client.from('workspaces').select('id').eq('owner_user_id',data.user.id).eq('kind','personal'));assert.ok(workspaces.length);
  const membership=await ok(client.from('workspace_members').select('role').eq('workspace_id',workspaces[0].id).eq('user_id',data.user.id).single());assert.equal(membership.role,'owner');
  client.testContext={userId:data.user.id,workspaceId:workspaces[0].id};successes++;
 }
 const [a,b]=clients,{userId}=a.testContext;assert.notEqual(userId,b.testContext.userId);
 await denied(a.from('profiles').update({account_tier:'pro'}).eq('id',userId).select('id'));
 // Isolated disposable workspace, never alter the trigger-created personal space.
 const workspaceId=await fixture(a,'workspaces',{owner_user_id:userId,kind:'personal',name:'Fixture RLS Phase 12A'});
 await ok(a.from('workspace_members').insert({workspace_id:workspaceId,user_id:userId,role:'owner'}));
 for(const [table,values] of [
  ['user_products',{shade_name:'Fixture RLS',hex:'#553366',metadata:{test:true}}],
  ['user_stickers',{name:'Fixture RLS',tags:['floral'],metadata:{test:true}}],
  ['user_equipment',{name:'Fixture RLS',equipment_category:'tool',metadata:{test:true}}],
  ['inspirations',{title:'Fixture RLS',is_public:false,snapshot:{test:true}}],
  ['journal_entries',{performed_on:new Date().toISOString().slice(0,10),notes:'Fixture RLS',snapshot:{test:true}}],
 ]){
  const id=await fixture(a,table,{workspace_id:workspaceId,created_by:userId,...values});
  assert.equal((await ok(a.from(table).select('id').eq('id',id))).length,1);
  assert.equal((await ok(a.from(table).update(values).eq('id',id).select('id'))).length,1);
  await denied(b.from(table).select('id').eq('id',id));
  await denied(b.from(table).update(values).eq('id',id).select('id'));
  await denied(b.from(table).delete().eq('id',id).select('id'));
  assert.equal((await ok(a.from(table).select('id').eq('id',id))).length,1);
 }
 await denied(b.from('workspaces').select('id').eq('id',workspaceId));
 await denied(b.from('workspaces').update({name:'Forbidden'}).eq('id',workspaceId).select('id'));
 await denied(b.from('workspace_members').select('user_id').eq('workspace_id',workspaceId));
 await denied(b.from('workspace_members').update({role:'member'}).eq('workspace_id',workspaceId).eq('user_id',userId).select('user_id'));
 await denied(b.from('workspace_members').delete().eq('workspace_id',workspaceId).eq('user_id',userId).select('user_id'));
 await denied(b.from('workspace_members').insert({workspace_id:workspaceId,user_id:b.testContext.userId,role:'owner'}).select('user_id'));
 const conversationId=await fixture(a,'conversations',{created_by:userId});
 await ok(a.from('conversation_members').insert({conversation_id:conversationId,user_id:userId}));
 const messageId=await fixture(a,'messages',{conversation_id:conversationId,sender_id:userId,body:'Fixture RLS privée'});
 assert.equal((await ok(a.from('messages').select('id').eq('id',messageId))).length,1);
 await denied(b.from('conversations').select('id').eq('id',conversationId));
 await denied(b.from('conversations').delete().eq('id',conversationId).select('id'));
 await denied(b.from('conversation_members').insert({conversation_id:conversationId,user_id:b.testContext.userId}).select('user_id'));
 await denied(b.from('messages').select('id').eq('id',messageId));
 await denied(b.from('messages').update({body:'Forbidden'}).eq('id',messageId).select('id'));
 await denied(b.from('messages').delete().eq('id',messageId).select('id'));
 await denied(b.from('messages').insert({conversation_id:conversationId,sender_id:b.testContext.userId,body:'Forbidden'}).select('id'));
 await denied(a.from('conversation_members').update({conversation_id:crypto.randomUUID()}).eq('conversation_id',conversationId).eq('user_id',userId).select('user_id'));
 assert.equal((await ok(a.from('conversation_members').update({last_read_at:new Date().toISOString()}).eq('conversation_id',conversationId).eq('user_id',userId).select('user_id'))).length,1);
 await denied(b.from('workspaces').delete().eq('id',workspaceId).select('id'));
 console.log(`${successes} contrôles distants réussis. Les emails, sessions et tests multi-navigateur restent à vérifier séparément.`);
}catch{console.error(`Validation distante incomplète après ${successes} contrôle(s). Vérifier comptes, schéma et règles. Aucun secret affiché.`);process.exitCode=1;}
finally{
 for(const [client,table,id] of cleanup.reverse()){const {error}=await client.from(table).delete().eq('id',id);if(error){console.error('Nettoyage d’une fixture à vérifier.');process.exitCode=1;}}
 for(const client of clients)await client.auth.signOut();
}
