import { selectedTechniques } from '../creationEngine.js';
import {designStrokeCount,editableProNailDesign} from './proNailEditorModel.js';

const FINGER_INDEX = { thumb: 0, index: 1, middle: 2, ring: 3, little: 4 };
const unique = values => [...new Set(values.filter(Boolean))];
const isHex = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));

export const proCreationModes = [
  ['reuse', 'Garder mon dessin et ses couleurs', 'Le dessin est intégré à la pose avec ses teintes d’origine.'],
  ['palette', 'Adapter à ma palette', 'Le dessin est conservé et ses couleurs suivent les teintes de la pose.'],
  ['inspire', 'S’inspirer de ce design', 'Une touche de la création guide la pose.'],
  ['placement', 'L’utiliser sur certains ongles', 'La création reste concentrée sur les ongles conseillés.'],
];

export function proCreationTargets(creation = {}, mode = 'inspire') {
  const fingers = Array.isArray(creation.recommended_fingers) ? creation.recommended_fingers : [];
  const explicit = fingers.map(value => FINGER_INDEX[value]).filter(Number.isInteger);
  if (mode === 'inspire') return [3];
  if (creation.design?.version === 2 && creation.design.scope === 'set' && mode !== 'placement') return [0,1,2,3,4];
  if (explicit.length) return unique([...explicit,...(fingers.includes('accent')?[3]:[])]).sort();
  if (mode === 'placement' && !explicit.length) return [3];
  if (fingers.includes('accent')) return [3];
  if (fingers.includes('multiple')) return [1, 3];
  if (fingers.includes('free')) return [3];
  return explicit.length ? unique(explicit).slice(0, 5) : [3];
}

// A role is deliberately mapped to colours already chosen by the generator.
// In collection mode those colours already point to the client's products, so
// no commercial reference can be invented during an adaptation.
export function adaptedCreationColors(creation = {}, idea = {}, mode = 'inspire') {
  const palette = (idea.palette || []).map(item => item.color).filter(isHex);
  const original = Object.fromEntries((creation.color_roles || [])
    .filter(item => item?.role && isHex(item.color)).map(item => [item.role, item.color]));
  const fallback = palette[0] || '#b88699';
  if (mode === 'reuse' && Object.keys(original).length) return {
    base: original.base || fallback,
    principale: original.principale || original.base || fallback,
    secondaire: original.secondaire || original.principale || fallback,
    accent: original.accent || original.secondaire || original.principale || fallback,
  };
  return {
    base: palette[0] || fallback,
    principale: palette[0] || fallback,
    secondaire: palette[1] || palette[0] || fallback,
    accent: palette[palette.length - 1] || palette[1] || palette[0] || fallback,
  };
}

// Structured drawings keep their geometry while the palette can be adapted.
// Older creations without a drawing continue to use their technique tags.
export function applyProCreationConstraint(ideas = [], selection, options = {}) {
  if (!selection?.creation?.id) return ideas;
  const creation = selection.creation;
  const mode = proCreationModes.some(([id]) => id === selection.mode) ? selection.mode : 'inspire';
  const sourceTechniques = selectedTechniques({ techniques: creation.techniques || [] });
  const primary = sourceTechniques.find(value => value !== 'french') || sourceTechniques[0] || '';
  const targets = proCreationTargets(creation, mode);
  const motif = Array.isArray(creation.motifs) && creation.motifs[0] || '';
  const drawing = /french/i.test((creation.techniques || []).join(' ')) ? 'french' : null;
  const label = creation.title || 'création de ma PO';
  return ideas.map(idea => {
    if(designStrokeCount(creation.design)||creation.design?.scope==='set')return applyDrawnCreation(idea,creation,mode);
    const colors = adaptedCreationColors(creation, idea, mode);
    const nails = idea.nails.map((nail, index) => {
      const applies = targets.includes(index);
      // Inspiration keeps one accent; the other modes retain recommended placement.
      if (!applies) return nail;
      const technique = primary || nail.technique || null;
      return {
        ...nail,
        ...(mode === 'reuse' ? { color: index === targets[0] ? colors.principale : nail.color, accentColor: colors.accent } : { accentColor: colors.accent }),
        technique,
        drawing: drawing || nail.drawing || null,
        drawingTechnique: drawing && primary && primary !== 'french' ? primary : nail.drawingTechnique || null,
        techniques: unique([...(nail.techniques || []), ...sourceTechniques]),
        proCreationAccent: true,
      };
    });
    const adaptation = mode === 'palette' ? 'adaptée à ta palette' : mode === 'reuse' ? 'réinterprétée dans cette pose' : mode === 'placement' ? 'placée sur les ongles conseillés' : 'utilisée comme inspiration';
    return {
      ...idea,
      nails,
      title: `${idea.title} · ${label}`.slice(0, 96),
      description: `${idea.description} Création de ta PO ${adaptation}.`,
      reasons: unique([...(idea.reasons || []), `Inspirée par « ${label} »${motif ? ` · ${motif}` : ''}`]),
      techniques: unique([...(idea.techniques || []), ...sourceTechniques]),
      proCreation: { id: creation.id, title: label, mode, placement: targets, colors },
      options: { ...idea.options, proCreationId: creation.id, proCreationMode: mode },
    };
  });
}

export async function listVisibleProCreations(client, ownerIds = []) {
  const ids = unique(ownerIds.map(String));
  if (!client || !ids.length) return [];
  const { data, error } = await client.from('pro_creations')
    .select(PRO_CREATION_FIELDS)
    .in('owner_id', ids).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}


export const PRO_CREATION_FIELDS='id,owner_id,title,description,visibility,design,color_roles,techniques,effects,motifs,styles,moods,tags,level,recommended_fingers,recommended_nail_count,updated_at';
export async function getVisibleProCreation(client,id){
 const {data,error}=await client.from('pro_creations').select(PRO_CREATION_FIELDS).eq('id',id).single();
 if(error)throw error;return data;
}
const colorDistance=(a,b)=>[1,3,5].reduce((sum,index)=>sum+(parseInt(a.slice(index,index+2),16)-parseInt(b.slice(index,index+2),16))**2,0);
function applyDrawnCreation(idea,creation,mode){
 const originalBase=creation.color_roles?.find(role=>role.role==='base')?.color||'#f4d8d0';
 const design=editableProNailDesign(creation.design,{base:originalBase}),targets=proCreationTargets(creation,mode);
 const palette=(idea.palette||[]).map(item=>({...item}));
 const selectedColors=unique(palette.map(item=>item.color?.toLowerCase()).filter(isHex));
 function productFor(color){
  const hex=color.toLowerCase();let product=palette.find(item=>item.color?.toLowerCase()===hex);
  if(!product){product={id:`drawing-color-${hex.slice(1)}`,name:'Couleur du dessin',color:hex,conceptual:true};palette.push(product);}return product;
 }
 const nails=idea.nails.map((nail,index)=>{
  if(!targets.includes(index))return nail;
  const representative=design.nails[design.focalFinger].strokes.length?design.focalFinger:Math.max(0,design.nails.findIndex(nail=>nail.strokes.length));
  const source=design.nails[design.scope==='set'&&mode!=='inspire'?index:representative];
  const base=mode==='reuse'?source.base:([...selectedColors].sort((a,b)=>colorDistance(source.base,a)-colorDistance(source.base,b))[0]||source.base).toLowerCase();
  const mapping=new Map([[source.base.toLowerCase(),base]]),alternatives=selectedColors.filter(color=>color!==base);
  function mapped(color){
   const hex=color.toLowerCase();if(mode==='reuse')return hex;if(mapping.has(hex))return mapping.get(hex);
   const candidates=alternatives.length?alternatives:selectedColors.length?selectedColors:[base];
   const used=[...mapping.values()],available=candidates.filter(value=>!used.includes(value));
   const chosen=[...(available.length?available:candidates)].sort((a,b)=>colorDistance(hex,a)-colorDistance(hex,b))[0];mapping.set(hex,chosen);return chosen;
  }
  const strokes=source.strokes.map(stroke=>({...stroke,points:stroke.points.map(point=>({...point})),color:stroke.mode==='erase'?base:mapped(stroke.color)}));
  const baseProduct=productFor(base);strokes.filter(stroke=>stroke.mode!=='erase').forEach(stroke=>productFor(stroke.color));
  const accent=strokes.find(stroke=>stroke.mode!=='erase'&&stroke.color!==base)?.color||base;
  return {...nail,color:base,productId:baseProduct.id,accentColor:accent,accentProductId:accent!==base?productFor(accent).id:null,drawing:null,drawingTechnique:null,technique:null,techniques:[],decoration:null,visualStyle:null,proCreationAccent:true,proDesign:{base,strokes}};
 });
 const usedColors=new Set(nails.flatMap(nail=>[nail.color,nail.accentColor,...(nail.proDesign?.strokes||[]).filter(stroke=>stroke.mode!=='erase').map(stroke=>stroke.color)]).filter(Boolean).map(value=>value.toLowerCase()));
 const usedPalette=palette.filter(product=>usedColors.has(product.color?.toLowerCase()));
 const {proCreation:selection,...savedOptions}=idea.options||{};
 const name=creation.title||'Mon dessin',adaptation=mode==='reuse'?'avec ses couleurs d’origine':'avec les couleurs de cette pose';
 return {...idea,nails,palette:usedPalette,polishCount:usedPalette.length,...(creation.design?.version===2&&mode!=='inspire'?{shape:design.shape,length:design.length}:{}),title:`${idea.title} · ${name}`.slice(0,96),description:`${idea.description} Dessin « ${name} » intégré ${adaptation}.`,reasons:unique([...(idea.reasons||[]),`Dessin « ${name} » · ${adaptation}`]),proCreation:{id:creation.id,title:name,mode,placement:targets},options:{...savedOptions,proCreationId:creation.id,proCreationMode:mode,proDrawing:true}};
}
