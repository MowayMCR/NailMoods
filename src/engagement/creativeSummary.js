import {canonicalTechnique,techniqueReference} from '../techniqueRules.js';
import {techniqueLabel} from '../techniqueGroups.js';
import {productColor,validHex} from '../colorAnalysis.js';
const array=v=>Array.isArray(v)?v:[];
export function creativeSummary({favorites=[],entries=[]}={}) {
  const ideas = new Map();
  for(const idea of [...array(favorites),...array(entries).map(e=>e?.idea)]) if(idea?.key) ideas.set(idea.key,idea);
  const techniques=new Map(),modes=new Map(),colors=new Map();
  for(const idea of ideas.values()) {
    for(const name of new Set([...array(idea.techniques),...array(idea.options?.techniques)].map(canonicalTechnique).filter(Boolean))) techniques.set(name,(techniques.get(name)||0)+1);
    const mode=idea.options?.mode==='surprise'&&['Safe','Creative','Chaos'].includes(idea.options?.surprise)?idea.options.surprise:null;
    if(mode)modes.set(mode,(modes.get(mode)||0)+1);
    for(const hex of new Set(array(idea.palette).map(productColor).filter(validHex)))colors.set(hex,(colors.get(hex)||0)+1);
  }
  const top=(map,limit)=>[...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([v])=>v);
  return {sample:ideas.size,techniques:top(techniques,3).map(id=>techniqueLabel(techniqueReference.find(t=>t.id===id)?.label||id)),modes:top(modes,1),colors:top(colors,5)};
}
