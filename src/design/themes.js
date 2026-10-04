// UI palettes only. Product HEX, finishes, scans and renderers never pass through this module.
const planningColors={
 'soft-glam':['#92566e','#ad754b','#6c8195','#647854','#826a99','#a96979','#77726a'],
 'dark-feminine':['#edaac4','#e4b77e','#9fb9dc','#a8c5a0','#c7a2df','#e6a399','#c1babc'],
 'cottagecore':['#8b606b','#a37839','#657f93','#597849','#866a93','#a36f55','#767568'],
 'pop-pastel':['#ab6197','#aa7d34','#578796','#63906b','#8663ae','#b36a6e','#80768c']
};
const palette = (id, name, description, colors, p) => Object.freeze({id,name,description,colors,tokens:Object.freeze({
 ...Object.fromEntries(['pose','event','follow_up','maintenance','removal','prepare','personal'].map((k,i)=>['planning_'+k,planningColors[id][i]])),
 backgroundPrimary:p[0],backgroundSecondary:p[1],backgroundTertiary:p[2],
 surfacePrimary:p[3],surfaceSecondary:p[1],surfaceElevated:p[3],
 accentPrimary:p[4],accentSecondary:p[5],accentSoft:p[2],
 textPrimary:p[6],textSecondary:p[7],textMuted:p[7],textOnAccent:p[8],
 borderDefault:p[9],borderActive:p[4],iconDefault:p[7],iconActive:p[4],
 chipBackground:p[1],chipActive:p[4],filterActive:p[4],navigationActive:p[4],
 progressActive:p[4],cardHighlight:p[2],selectionBackground:p[2],overlay:p[10],
 productSurface:'#f4f3f1',productInk:'#302b2d',error:p[11],success:p[12],
 shadow:'0 8px 28px '+p[10].slice(0,7)+'12'
})});
export const visualMoods=Object.freeze([
 palette('soft-glam','Soft Glam','Douceur & élégance',['#f4dcd9','#d4a1ae','#92566e','#693c57'],['#fbf5ef','#f5e8e7','#ead1d7','#fffaf7','#80435e','#a9627b','#35242d','#6f5662','#fff8f5','#d9bdc8','#37202abb','#a12f47','#386244']),
 palette('dark-feminine','Dark Feminine','Mystère & caractère',['#311c2b','#582c43','#a75876','#f0cbd5'],['#241823','#30212d','#553044','#3b2835','#ecc0d0','#c889a2','#fff1ed','#dbc1cd','#321c29','#785568','#120b13cc','#ffb4b9','#b5dbbd']),
 palette('cottagecore','Cottagecore','Nature & poésie',['#e9e7d5','#a9b18c','#647050','#b68879'],['#f7f5e9','#eeeddd','#dce2c9','#fdfbef','#4f6140','#8a6657','#30372a','#5e6553','#fffdf1','#bac4a6','#242d24bb','#9c3842','#42633e']),
 palette('pop-pastel','Pop Pastel','Créativité & fraîcheur',['#ebc9e4','#cbbce8','#a9d4da','#f8e4a6'],['#faf5fe','#f0e6f6','#e4d6f4','#fffaff','#704b91','#9b5175','#392c49','#6c587b','#fffaff','#cdb5dd','#30203fbb','#a33257','#37634f'])
]);
const aliases={nailmoods:'soft-glam',witchy:'dark-feminine',goth:'dark-feminine',girly:'soft-glam',coquette:'soft-glam',clean:'cottagecore',celestial:'pop-pastel',y2k:'pop-pastel'};
export const moodFor=id=>visualMoods.find(m=>m.id===(aliases[id]||id))||visualMoods[0];
export const profileMood=p=>moodFor(p?.visualMood||p?.theme);
export function themeStyle(mood){const t=mood.tokens;return {...Object.fromEntries(Object.entries(t).map(([k,v])=>['--'+k,v])), '--a':t.accentPrimary,'--b':t.accentPrimary,'--soft':t.accentSoft,'--paper':t.backgroundPrimary,'--ink':t.textPrimary,'--nm-ink':t.textPrimary,'--nm-nude':t.surfaceSecondary,'--nm-rose':t.accentSoft,'--nm-blush':t.accentSecondary,'--nm-mauve':t.accentSecondary,'--nm-sage':t.cardHighlight,'--nm-shadow':t.shadow};}
export function applyMood(mood,doc=globalThis.document){if(!doc)return;const style=themeStyle(mood);for(const el of [doc.documentElement,...doc.querySelectorAll('.nmDialogHost')]){for(const [key,value]of Object.entries(style))el.style.setProperty(key,value);el.dataset.mood=mood.id;}doc.documentElement.style.colorScheme=mood.id==='dark-feminine'?'dark':'light';doc.querySelector('meta[name="theme-color"]')?.setAttribute('content',mood.tokens.backgroundPrimary);try{localStorage.setItem('nm-boot-mood-v2',JSON.stringify({id:mood.id,background:mood.tokens.backgroundPrimary,text:mood.tokens.textPrimary,accent:mood.tokens.accentPrimary}));}catch{}return style;}
