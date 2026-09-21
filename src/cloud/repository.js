import { TABLES, same } from './mapping.js';
import { readBatch } from './queryBatch.js';
export class CloudError extends Error { constructor(code,message){super(message);this.code=code;} }
export async function checked(request) {
  const {data,error}=await request;
  if(error) throw new CloudError(error.code || 'network','La sauvegarde distante n’a pas abouti. Tes modifications restent sur cet appareil.');
  return data;
}
export function repository(client,userId,workspaceId) {
  const allowed=new Set(TABLES);
  function scoped(table) { if(!allowed.has(table)) throw new Error('Table non autorisée'); return client.from(table); }
  async function verifyUser() {
    const {user}=await checked(client.auth.getUser());
    if(user?.id!==userId) throw new CloudError('session','La session a changé. Reconnecte-toi au compte de ces données.');
  }
  async function all(table, field, value) {
    const result=[];
    for(let offset=0;;offset+=500){
      const order=table==='favorites'?'entity_id':'id';
      const page=await checked(client.from(table).select('*').eq(field,value).order(order).range(offset,offset+499));
      result.push(...page); if(page.length<500)return result;
    }
  }
  return {
    verifyUser,
    async load() {
      await verifyUser();
      const [profile,...sets]=await readBatch([()=>checked(client.from('profiles').select('id,account_tier,display_name,avatar_url,preferences,username,discovery_visibility,updated_at').eq('id',userId).single()),...TABLES.map(t=>()=>all(t,'workspace_id',workspaceId)),()=>all('favorites','user_id',userId)]);
      const capabilities=await checked(client.rpc('nm_capabilities'));
      profile.account_tier=capabilities.tier;
      return {profile,rows:Object.fromEntries(TABLES.map((t,i)=>[t,sets[i]])),favorites:sets.at(-1).filter(f=>f.entity_type==='inspiration')};
    },
    async write(op,base) {
      await verifyUser();
      if(op.table==='profiles') {
        const current=await checked(client.from('profiles').select('id,display_name,preferences,updated_at').eq('id',userId).single());
        // Patch only this preference entry, preserving unrelated server preferences.
        let values;
        if(op.preferenceKey) values={preferences:{...current.preferences,nailmoodsExtras:{...current.preferences?.nailmoodsExtras,[op.preferenceKey]:op.value}}};
        else values={display_name:op.value.name || '',preferences:{...current.preferences,nailmoodsProfile:op.value}};
        // Compare the relevant field, not unrelated preferences updated by other devices.
        const prior=op.preferenceKey?(current.preferences?.nailmoodsExtras?.[op.preferenceKey] ?? (op.preferenceKey==='hiddenSessions'?[]:null)):current.preferences?.nailmoodsProfile;
        if(!same(prior ?? null,op.before ?? null) && !same(prior,op.value)) throw new CloudError('conflict','Ces préférences ont changé sur un autre appareil. Recharge le compte avant de les modifier.');
        let q=client.from('profiles').update(values).eq('id',userId);
        if(!current.updated_at)throw new CloudError('version','La version distante de cette fiche est indisponible. Recharge le compte avant de réessayer.');
        q=q.eq('updated_at',current.updated_at);
        const saved=await checked(q.select('id').single());return saved;
      }
      if(op.table==='favorites') {
        let q=client.from('favorites');
        if(op.action==='delete') return checked(q.delete().eq('user_id',userId).eq('entity_type','inspiration').eq('entity_id',op.rowId));
        const existing=await checked(q.select('entity_id').eq('user_id',userId).eq('entity_type','inspiration').eq('entity_id',op.rowId));
        if(existing.length)return existing[0];
        return checked(client.from('favorites').insert({user_id:userId,entity_type:'inspiration',entity_id:op.rowId}).select('entity_id').single());
      }
      const current=await checked(scoped(op.table).select('*').eq('workspace_id',workspaceId).eq('id',op.rowId).maybeSingle());
      const fields=Object.keys(op.values || base || {}).filter(k=>!['id','created_at','updated_at','workspace_id','created_by'].includes(k));
      const equal=(a,b)=>a&&b&&fields.every(k=>same(a[k],b[k]));
      if(op.action==='put' && equal(current,op.values))return current; // retry after lost response
      if(op.action==='delete' && !current)return null;
      if(current && !equal(current,base))throw new CloudError('conflict','Cette fiche a changé sur un autre appareil. La copie locale est conservée ; recharge les données avant de réessayer.');
      if(!current && base)throw new CloudError('conflict','Cette fiche a été supprimée sur un autre appareil. Ta copie locale est conservée.');
      if(!current)return checked(scoped(op.table).insert({...op.values,id:op.rowId,workspace_id:workspaceId,created_by:userId}).select('*').single());
      let q=op.action==='delete'?scoped(op.table).delete():scoped(op.table).update(op.values);
      q=q.eq('workspace_id',workspaceId).eq('id',op.rowId);
      // Existing server triggers update this timestamp. Never put photos/snapshots in a URL.
      if(!current.updated_at)throw new CloudError('version','La version distante de cette fiche est indisponible. Recharge le compte avant de réessayer.');
      q=q.eq('updated_at',current.updated_at);
      return checked(q.select('*').single());
    },
  };
}
export async function personalWorkspace(client,userId) {
  const memberships=await checked(client.from('workspace_members').select('workspace_id,role').eq('user_id',userId));
  if(!memberships.length)throw new CloudError('provisioning','Ton espace personnel n’est pas encore disponible. Réessaie dans un instant.');
  const spaces=await checked(client.from('workspaces').select('id,owner_user_id,kind,name').in('id',memberships.map(m=>m.workspace_id)).eq('kind','personal').eq('owner_user_id',userId).order('id'));
  if(!spaces.length)throw new CloudError('provisioning','Ton espace personnel n’a pas pu être chargé. Réessaie.');
  return spaces[0];
}
