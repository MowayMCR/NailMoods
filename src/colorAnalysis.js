export const colorFamilies = [['Prune','#703650'],['Cassis','#622947'],['Bordeaux','#852d40'],['Rouge','#c73e46'],['Rose','#db7897'],['Nude','#ddb9aa'],['Beige','#cbb89d'],['Brun','#805b4c'],['Orange','#d47c4b'],['Jaune','#dfc65e'],['Vert','#67865f'],['Bleu','#5479a6'],['Violet','#735b91'],['Noir','#29262a'],['Blanc','#f1efeb'],['Argent','#aeb1b5'],['Or','#c4a45e'],['Multi','#8c5b8f']];
export const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export function preciseShade(item = {}) {
  if (item.catalogColorValidated === true && validHex(item.catalogColor)) return item.catalogColor.toLowerCase();
  if (validHex(item.confirmedColor)) return item.confirmedColor.toLowerCase();
  if (validHex(item.shade)) return item.shade.toLowerCase();
  // Older collections stored a sampled/custom shade directly in color.
  if (!Object.hasOwn(item, 'shade') && ['photo', 'manual'].includes(item.colorSource) && validHex(item.color)) return item.color.toLowerCase();
  return '';
}
export function productColor(item = {}) {
  return preciseShade(item) || (validHex(item.color) ? item.color.toLowerCase() : '') || colorFamilies.find(([name]) => name === item.family)?.[1] || '#b88699';
}
export function colorFamilyChange(item, family) {
  const shade = preciseShade(item), color = colorFamilies.find(([name]) => name === family)?.[1];
  return { family, ...(color ? { color } : {}), shade, colorSource: shade ? item.colorSource === 'photo' ? 'photo' : 'manual' : 'palette' };
}
// An explicit choice (including the photo pipette) overrides older catalogue data.
// This only changes the user's copy, never the shared catalogue.
export function chosenShadeChange(color, source = 'manual') {
  const {color:shade,family,depth}=describeColor(color);
  return {shade,confirmedColor:shade,catalogColorValidated:false,family,depth,color:colorFamilies.find(([name])=>name===family)[1],colorSource:source,colorUpdatedAt:new Date().toISOString()};
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hex = values => '#' + values.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('');
// Perceptual distance in OKLab; family is a suggestion, the sampled hex is kept.
function lab(color) {
  const [r, g, b] = rgb(color).map(x => (x /= 255) <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s];
}
export function describeColor(color) {
  if (!validHex(color)) throw new Error('Choisis une couleur valide.');
  const measured = lab(color);
  const family = colorFamilies.filter(([name]) => !['Multi', 'Argent', 'Or'].includes(name)).map(([name, value]) => ({ name, distance: lab(value).reduce((sum, component, i) => sum + (component - measured[i]) ** 2, 0) })).sort((a, b) => a.distance - b.distance)[0].name;
  return { color: color.toLowerCase(), family, depth: measured[0] < .48 ? 'Foncé' : measured[0] > .78 ? 'Clair' : 'Moyen' };
}
export function sampleColor({ data, width, height }, x, y, radius = 2) {
  if (!width || !height || data.length < width * height * 4) throw new Error('Image illisible.');
  const cx = Math.max(0, Math.min(width - 1, Math.round(x))), cy = Math.max(0, Math.min(height - 1, Math.round(y)));
  const channels = [[], [], []];
  for (let row = Math.max(0, cy - radius); row <= Math.min(height - 1, cy + radius); row++) for (let col = Math.max(0, cx - radius); col <= Math.min(width - 1, cx + radius); col++) {
    const at = (row * width + col) * 4;
    if (data[at + 3] < 128) continue;
    channels.forEach((channel, index) => channel.push(data[at + index]));
  }
  if (!channels[0].length) throw new Error('Choisis une zone colorée de la photo.');
  return hex(channels.map(channel => channel.sort((a, b) => a - b)[Math.floor(channel.length / 2)]));
}

export function photoPalette({ data, width, height }, count = 6) {
  const groups = new Map(), stride = Math.max(1, Math.floor(width * height / 18000));
  for (let pixel = 0; pixel < width * height; pixel += stride) {
    const index = pixel * 4, values = [data[index], data[index+1], data[index+2]];
    if (data[index+3] < 128 || Math.min(...values) > 240) continue;
    const key = values.map(value => Math.floor(value / 24)).join(',');
    const group = groups.get(key) || { count: 0, sum: [0, 0, 0] };
    group.count++; values.forEach((value, i) => group.sum[i] += value); groups.set(key, group);
  }
  const result = [];
  for (const group of [...groups.values()].sort((a, b) => b.count - a.count)) {
    const color = hex(group.sum.map(value => value / group.count)), value = lab(color);
    if (result.every(other => lab(other).reduce((sum, component, i) => sum + (component - value[i]) ** 2, 0) > .006)) result.push(color);
    if (result.length === count) break;
  }
  return result;
}

// Ranking uses the measured shade, without rewriting the user's classification.
export function generationFamily(item) {
  const exact=preciseShade(item) || (validHex(item.color) ? item.color : '');
  if(!exact) return item.family || describeColor(productColor(item)).family;
  // Gold and silver describe a finish; retain them only when explicitly metallic.
  if(['Or','Argent'].includes(item.family) && /métall|metall|chrome/i.test(item.finish || '')) return item.family;
  const channels=rgb(exact).map(v=>v/255), high=Math.max(...channels), low=Math.min(...channels), delta=high-low;
  if(delta > .06) {
    const [r,g,b]=channels;
    const hue=((high===r?(g-b)/delta:high===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
    // Hue protects dark greens/blues from the nearest, similarly dark brown swatch.
    if(hue>=65 && hue<170) return 'Vert';
    if(hue>=170 && hue<255) return 'Bleu';
    if(hue>=255 && hue<295) return 'Violet';
  }
  return describeColor(exact).family;
}
