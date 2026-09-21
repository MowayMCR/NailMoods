import { matchPhotoProducts } from '../photoInspiration.js';

const checked = async promise => { const { data, error } = await promise; if (error) throw error; return data; };
const clean = value => String(value || '').trim().slice(0, 120);

export function shareSnapshot(source, type = 'inspiration') {
  const idea = type === 'journal' ? source.idea : source;
  const colors = [...new Set((idea?.palette || []).map(item => item.color || item.shade || item.confirmedColor).filter(value => /^#[0-9a-f]{6}$/i.test(value)))].slice(0, 5);
  const techniques = [...new Set([idea?.rendering?.label, idea?.technique, ...(idea?.nails || []).map(nail => nail.effect || nail.technique)].map(clean).filter(Boolean))].slice(0, 8);
  const requirements = [...new Set((idea?.requirements || []).map(item => clean(item.name || item)).filter(Boolean))].slice(0, 12);
  return { level: clean(idea?.photoInspiration?.nailArtLevel || idea?.difficulty), mood: clean(idea?.options?.mood), title: clean(source.title || idea?.title || 'Inspiration NailMoods'), source_type: type, colors, techniques, requirements };
}

export function comparePoShare(snapshot, items = []) {
  const matches = {owned:[],alternatives:[],missing:[]};
  for(const color of snapshot?.colors || []) { const m=matchPhotoProducts([color],items); for(const key of Object.keys(matches)) matches[key].push(...m[key]); }
  const equipmentNames = items.filter(item => Number(item.quantity ?? 1) > 0).map(item => clean((item.name || '') + ' ' + (item.equipmentCategory || '')).toLowerCase()).filter(Boolean);
  const techniqueChecks = (snapshot?.requirements || []).map(name => ({ name, available: equipmentNames.some(value => value.includes(clean(name).toLowerCase()) || clean(name).toLowerCase().includes(value)) }));
  return { ...matches, techniqueChecks };
}

export function poShareService(client) {
  return {
    search: async query => { const connections = await checked(client.rpc('nm_social', {p_action:'list',p_data:{}})); const rows = await checked(client.rpc('search_nailmoods', { p_query: query, p_kind: null, p_city: null })); return (rows || []).filter(row => row.entity_type === 'workspace' && connections.some(c => c.status === 'accepted' && c.pro_handle === row.handle)).map(row=>({...row,user_id:connections.find(c=>c.pro_handle===row.handle).user_id})); },
    send: (workspaceId, sourceId, snapshot) => checked(client.rpc('send_nailmoods_share_to_po', { p_recipient_workspace_id: workspaceId, p_source_local_id: String(sourceId || '').slice(0, 120), p_snapshot: snapshot })),
    received: () => checked(client.rpc('received_nailmoods_po_shares')),
  };
}
