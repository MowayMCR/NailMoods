const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
const slug=value=>norm(value).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const list=(category,labels,visible=[],extra={})=>labels.map(label=>({id:slug(label),label,category,synonyms:extra[label]?.synonyms||[],related_tags:extra[label]?.related_tags||[],visible_in_filters:visible.includes(label)}));

const relation={
 'Clean girl':{synonyms:['clean','clean nails'],related_tags:['Minimal','Nude','Milky nails','Soap nails','Micro French','Classique']},
 Witchy:{synonyms:['sorciere','sorcière'],related_tags:['Celestial','Lunes','Dark feminine','Goth romantique']},
 'Cat-eye':{synonyms:['cat eye','cateye','magnetique','magnétique'],related_tags:['Velvet nails','Métallique']},
 Babyboomer:{synonyms:['baby boomer'],related_tags:['Nude','Milky nails','Classique']},
 Chrome:{synonyms:['chrome powder','poudre chrome'],related_tags:['Glazed nails','Métallique','Aurora']},
 'Micro French':{synonyms:['mini french','french fine','french discrete','french discrète'],related_tags:['French','Minimal','Clean girl','Classique']},
 'Goth romantique':{synonyms:['romantic goth','romantic gothic'],related_tags:['Goth','Romantique','Dark feminine']},
 'Cœurs':{synonyms:['coeur','coeurs','heart','hearts'],related_tags:['Saint-Valentin','Romantique']},
 'Cat-eye magnetic':{synonyms:['cat eye','cat-eye','magnetique','magnétique'],related_tags:['Cat-eye','Velvet nails']},
};
export const TAGS=[
 ...list('style',['Classique','Simple','Contemporain','Épuré','Élégant','Graphique','Sophistiqué','Naturel'],['Classique']),
 ...list('envie',['Discret','Lumineux','Audacieux','Doux','Festif','Glamour','Sombre']),
 ...list('ambiance',['Witchy','Alternative','Girly','Dark feminine','Romantique','Minimal','Old money','Clean girl','Vintage','Grunge','Punk','Rock','Emo','Goth','Goth romantique','Coquette','Cottagecore','Fairycore','Celestial','Kawaii','Y2K','90s','Pastel goth','Cyber','Balletcore','Mermaidcore','Quiet luxury','Soft girl','Dreamy','Ethereal','Moody'],['Witchy','Clean girl','Romantique','Minimal'],relation),
 ...list('technique',['French','Micro French','Reverse French','Double French','Side French','Deep French','V-French','Babyboomer','Ombré','Dégradé','Accent nail','Duo alterné','Color block','Negative space','Half moon','Ruffian','Outline nails','Skittle nails','Mix & match','Monochrome','Ton sur ton','Gradient nails','Marble','Blooming gel','Aura nails','Airbrush','Watercolor','Stamping','Freehand','Line art','Dot art','One stroke','Encapsulated','3D gel','Charms','Strass','Foil','Flakes','Chrome powder','Cat-eye magnetic','Velvet nails','Glazed nails','Jelly nails','Glass nails','Syrup nails','Milky nails','Soap nails','Tortoiseshell','Crocodile','Snake print','Leopard','Cow print','Zebra'],['French','Cat-eye magnetic','Aura nails'],relation),
 ...list('finish',['Chrome','Cat-eye','Jelly','Aura','Glazed','Métallique','Paillettes','Holographique','Velours','Marbré','Brillant','Ultra brillant','Mat','Satiné','Nacré','Perlé','Scintillant','Iridescent','Aurora','Translucide','Glass','Texturé'],['Chrome','Cat-eye','Aura','Paillettes'],relation),
 ...list('theme',['Floral','Fruité','Océan','Galaxy','Animal print','Pride','Halloween','Noël','Saint-Valentin','Printemps','Automne','Été','Hiver','Mariage','Étoiles','Lunes','Soleils','Cœurs','Nœuds','Fleurs','Feuilles','Papillons','Cerises','Fraises','Citron','Champignons','Nuages','Coquillages'],['Floral','Noël'],relation),
 ...list('color',['Rose','Rouge','Bordeaux','Violet','Bleu','Vert','Jaune','Orange','Marron','Beige','Blanc','Noir','Gris','Doré','Argenté','Nude'])
];
export const TAG_BY_LABEL=new Map(TAGS.map(tag=>[tag.label,tag]));
export const VISIBLE_TAGS=TAGS.filter(tag=>tag.visible_in_filters);
export const TAXONOMY={
 moods:TAGS.filter(tag=>['style','envie','ambiance'].includes(tag.category)).map(tag=>tag.label),
 colors:TAGS.filter(tag=>tag.category==='color').map(tag=>tag.label),
 aesthetics:TAGS.filter(tag=>['style','envie','ambiance'].includes(tag.category)).map(tag=>tag.label),
 themes:TAGS.filter(tag=>tag.category==='theme').map(tag=>tag.label),
 levels:['Débutant','Intermédiaire','Avancé'],
 techniques:TAGS.filter(tag=>tag.category==='technique').map(tag=>tag.label),
 occasions:['Tous les jours','Travail','Soirée','Mariage','Fête','Vacances','Rendez-vous'],
 shapes:['Rond','Ovale','Amande','Carré','Carré arrondi','Coffin','Stiletto'],
 lengths:['Court','Moyen','Long','Très long'],
 finishes:TAGS.filter(tag=>tag.category==='finish').map(tag=>tag.label)
};
export const VISIBLE_TAXONOMY={...TAXONOMY,moods:VISIBLE_TAGS.filter(tag=>['style','envie','ambiance'].includes(tag.category)).map(tag=>tag.label),techniques:VISIBLE_TAGS.filter(tag=>tag.category==='technique').map(tag=>tag.label),finishes:VISIBLE_TAGS.filter(tag=>tag.category==='finish').map(tag=>tag.label),themes:VISIBLE_TAGS.filter(tag=>tag.category==='theme').map(tag=>tag.label)};
export function resolveTags(value,{related=true}={}){const input=norm(value);if(!input)return[];const direct=TAGS.filter(tag=>[tag.label,...tag.synonyms].some(term=>{const needle=norm(term);return input.includes(needle)||needle.includes(input)}));const expanded=related?direct.flatMap(tag=>tag.related_tags.map(label=>TAG_BY_LABEL.get(label)).filter(Boolean)):[];return [...new Map([...direct,...expanded].map(tag=>[tag.id,tag])).values()];}
export function querySuggestions(value,limit=6){return resolveTags(value,{related:false}).slice(0,limit);}
export function internalTagIds(value){return resolveTags(value).map(tag=>tag.id);}
