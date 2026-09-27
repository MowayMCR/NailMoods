const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const point = value => ({x:Math.max(0,Math.min(100,number(value?.x))),y:Math.max(0,Math.min(160,number(value?.y)))});

export const EMPTY_PRO_NAIL_DESIGN = Object.freeze({version:1,strokes:[]});

export function normaliseProNailDesign(value) {
  const strokes=Array.isArray(value?.strokes)?value.strokes:[];
  return {version:1,strokes:strokes.slice(-80).map(stroke=>({
    points:Array.isArray(stroke?.points)?stroke.points.slice(0,240).map(point):[],
    color:/^#[0-9a-f]{6}$/i.test(stroke?.color||'')?stroke.color:'#813c60',
    size:Math.max(1,Math.min(14,number(stroke?.size,4))),
    mode:stroke?.mode==='erase'?'erase':'draw',
  })).filter(stroke=>stroke.points.length>0)};
}

export function strokePath(stroke) {
  const points=stroke?.points||[];
  if(!points.length)return '';
  if(points.length===1)return `M ${points[0].x} ${points[0].y} l .01 .01`;
  return points.map((p,index)=>`${index?'L':'M'} ${p.x} ${p.y}`).join(' ');
}

export function addStroke(design, stroke) {
  const next=normaliseProNailDesign(design);
  const cleaned=normaliseProNailDesign({strokes:[stroke]}).strokes[0];
  return cleaned?{...next,strokes:[...next.strokes,cleaned].slice(-80)}:next;
}
