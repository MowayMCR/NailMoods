// Local review/test transport only. Production uses the existing Supabase client.
export function createReviewClient(send,getUser) {
 return {auth:{getUser:async()=>({data:{user:{id:getUser()}},error:null})},from(table){
  const q={table,action:'select',fields:'*',filters:[],offset:0,limit:100};
  const chain={select(fields='*'){q.fields=fields;return chain;},insert(values){q.action='insert';q.values=values;return chain;},update(values){q.action='update';q.values=values;return chain;},delete(){q.action='delete';return chain;},eq(key,value){q.filters.push([key,value]);return chain;},order(key){q.order=key;return chain;},range(start,end){q.offset=start;q.limit=end-start+1;return chain;},single(){q.single=true;return chain;},maybeSingle(){q.single=true;return chain;},then(resolve,reject){return send(q).then(resolve,reject);}};return chain;
 }};
}
