// Coalesce writes per key, serialize them, and retain failed writes for retry.
export function createDurableQueue(write, onError=()=>{}) {
  const pending=new Map();let running=null;
  async function flush() {
    if(running)return running;
    running=(async()=>{while(pending.size){const [key,value]=pending.entries().next().value;try{await write(key,value);}catch(error){onError(error);return false;}if(pending.get(key)===value)pending.delete(key);}return true;})().finally(()=>{running=null;});
    return running;
  }
  return { put(key,value){pending.set(key,value);void flush();},flush,get pending(){return pending.size;} };
}
