import {login} from './pose-db.js';
const columns={pose_projects:['id','user_id','workspace_id','title','status','source_inspiration_id','journal_entry_id','legacy_key','details','revision','created_at','updated_at'],pose_plan_items:['id','user_id','workspace_id','project_id','title','kind','scheduled_on','timezone','starts_at','ends_at','location','notes','status','revision','created_at','updated_at'],pose_reminders:['id','user_id','workspace_id','plan_item_id','category','scheduled_at','enabled','revision','created_at','updated_at']};
export async function executeReviewQuery(db,q,userId){
 try{
  const allowed=columns[q.table];if(!allowed)throw new Error('Unknown review table');
  const col=k=>{if(!allowed.includes(k))throw new Error('Unknown review column');return '"'+k+'"';};
  const fields=q.fields==='*'?'*':q.fields.split(',').map(col).join(',');let args=[];const param=v=>{args.push(v);return '$'+args.length;};
  const filter=()=>q.filters.length?' where '+q.filters.map(([k,v])=>col(k)+'='+param(v)).join(' and '):'';
  let sql;
  if(q.action==='insert'){const pairs=Object.entries(q.values);sql=`insert into public.${q.table}(${pairs.map(([k])=>col(k)).join(',')}) values(${pairs.map(([,v])=>param(v)).join(',')}) returning ${fields}`;}
  else if(q.action==='update'){sql=`update public.${q.table} set ${Object.entries(q.values).map(([k,v])=>col(k)+'='+param(v)).join(',')}${filter()} returning ${fields}`;}
  else if(q.action==='delete')sql=`delete from public.${q.table}${filter()} returning ${fields}`;
  else if(q.action==='select')sql=`select ${fields} from public.${q.table}${filter()} order by ${col(q.order||'id')} limit ${param(Math.min(100,Math.max(1,Number(q.limit))))} offset ${param(Math.max(0,Number(q.offset)))}`;
  else throw new Error('Unknown review operation');
  await login(db,userId);const result=await db.query(sql,args);const rows=JSON.parse(JSON.stringify(result.rows)).map(row=>({...row,...(row.scheduled_on?{scheduled_on:row.scheduled_on.slice(0,10)}:{})}));return {data:q.single?(rows[0]||null):rows,error:null};
 }catch(error){return {data:null,error:{code:error.code||'review',message:error.message}};}
}
