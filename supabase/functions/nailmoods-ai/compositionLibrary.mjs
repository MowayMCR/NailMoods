// Original, technique-neutral layout grammar for NailMoods AI.
// No Pinterest extraction, imported artwork, artist names, or proprietary images.
// 24 abstract design structures x 5 role distributions = 120 optional combinations.
// The requesting user's explicit choices always take precedence.
export const STRUCTURES = [
  {
    "name": "diagonale décalée",
    "description": "Varier les zones occupées selon une diagonale discrète, sans copier les mêmes proportions."
  },
  {
    "name": "courbe de contour",
    "description": "Faire circuler le geste choisi près d'un contour puis le laisser respirer."
  },
  {
    "name": "cuticule ponctuée",
    "description": "Concentrer les éléments déjà demandés près de la cuticule sur un seul ongle principal."
  },
  {
    "name": "bord libre accentué",
    "description": "Déplacer l'intérêt vers le bord libre sur une pièce forte, alléger les autres."
  },
  {
    "name": "asymétrie latérale",
    "description": "Décaler les accents de la gauche vers la droite selon le doigt."
  },
  {
    "name": "centre décentré",
    "description": "Placer le dessin demandé légèrement hors axe, avec plusieurs échelles."
  },
  {
    "name": "espace respirant",
    "description": "Préserver de larges surfaces non décorées entre les éléments demandés."
  },
  {
    "name": "cadre incomplet",
    "description": "Utiliser une bordure partielle et discontinue seulement si le motif s'y prête."
  },
  {
    "name": "double rythme",
    "description": "Alterner une zone dominante et un petit rappel sans répétition exacte."
  },
  {
    "name": "verticalité fine",
    "description": "Étager les tracés existants de la base au bord sans uniformiser les doigts."
  },
  {
    "name": "découpe douce",
    "description": "Faire cohabiter deux zones de dessin aux contours fluides uniquement si demandé."
  },
  {
    "name": "densité progressive",
    "description": "Passer d'une composition riche à un simple rappel sur les autres ongles."
  },
  {
    "name": "axe oblique",
    "description": "Aligner les détails demandés selon une oblique différente de l'autre main."
  },
  {
    "name": "micro-signature",
    "description": "Concentrer un détail graphique lisible sur un ongle plutôt que le dupliquer partout."
  },
  {
    "name": "contrepoint géométrique",
    "description": "Définir des espacements contrastés entre motifs demandés, sans inventer de motifs."
  },
  {
    "name": "ouverture latérale",
    "description": "Laisser un côté visuellement libre pour équilibrer le sujet principal."
  },
  {
    "name": "haut et bas",
    "description": "Séparer l'attention entre cuticule et bord libre sans remplir toute la surface."
  },
  {
    "name": "rythme en écho",
    "description": "Répéter une idée de façon transformée par l'échelle ou la position, pas à l'identique."
  },
  {
    "name": "focalisation unique",
    "description": "Mettre en valeur un seul grand dessin et réserver les rappels aux ongles secondaires."
  },
  {
    "name": "composition en arc",
    "description": "Créer une trajectoire courbe du motif demandé, avec une rupture intentionnelle."
  },
  {
    "name": "petites zones distribuées",
    "description": "Répartir les détails en quelques zones espacées de taille variable."
  },
  {
    "name": "changement d'échelle",
    "description": "Faire dialoguer une grande version et une micro-version du motif explicitement souhaité."
  },
  {
    "name": "décalage des mains",
    "description": "Donner à la seconde main une autre architecture, jamais un miroir de la première."
  },
  {
    "name": "équilibre de vides",
    "description": "Alterner ongles plus travaillés et ongles reposants, sans surcharge gratuite."
  }
];
export const DISTRIBUTIONS = [
  {
    "label": "cadence A",
    "a": [
      0,
      3
    ],
    "e": [
      1
    ],
    "b": [
      5,
      9
    ],
    "f": [
      7
    ]
  },
  {
    "label": "cadence B",
    "a": [
      1,
      4
    ],
    "e": [
      3
    ],
    "b": [
      5,
      8
    ],
    "f": [
      6
    ]
  },
  {
    "label": "cadence C",
    "a": [
      0,
      2
    ],
    "e": [
      4
    ],
    "b": [
      6,
      9
    ],
    "f": [
      8
    ]
  },
  {
    "label": "cadence D",
    "a": [
      1,
      3
    ],
    "e": [
      0
    ],
    "b": [
      7,
      9
    ],
    "f": [
      5
    ]
  },
  {
    "label": "cadence E",
    "a": [
      2,
      4
    ],
    "e": [
      1
    ],
    "b": [
      5,
      7
    ],
    "f": [
      9
    ]
  }
];
export const COMPOSITION_VARIANTS = STRUCTURES.length * DISTRIBUTIONS.length;
const normalize = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const hash = text => {let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
export function compositionGuidance(body={}) {
  if(!['conversation','vision'].includes(body.operation)||body.targetFinger!==undefined||body.composition?.master)return '';
  const prompt=normalize(body.prompt);
  if(!prompt||/(sans motif|aucun motif|un seul vernis|tous les ongles identiques|toutes les couleurs identiques|couleur unie|pose unie|no design|all nails identical|solid color|sans decoration|sans dessin)/.test(prompt))return '';
  if(/\b(modifi|changer|change|replace|remplace|corrige|garde la|conserve la|ajuste le|tutoriel|partager|share)\b/.test(prompt))return '';
  const level=Number.isInteger(body.level)?body.level:1;
  const count=body.designCount===10?10:5;
  const seed=hash([body.requestId||'',prompt,body.shape||'',body.length||'',level,count].join('|'));
  const layout=DISTRIBUTIONS[seed%DISTRIBUTIONS.length];
  const structure=STRUCTURES[Math.floor(seed/DISTRIBUTIONS.length)%STRUCTURES.length];
  const primary=count===10?[...layout.a,...layout.b]:layout.a;
  const accent=count===10?[...layout.e,...layout.f]:layout.e;
  const remaining=Array.from({length:count},(_,i)=>i).filter(i=>!primary.includes(i)&&!accent.includes(i));
  return ' GUIDE DE COMPOSITION ORIGINALE (facultatif, jamais un thème) : '+structure.description+
    ' Pour '+count+' ongles, répartis éventuellement les rôles principaux sur ['+primary.join(',')+
    '], les accents sur ['+accent.join(',')+'] et les accompagnements sur ['+remaining.join(',')+
    ']. Ce gabarit est une aide au placement, pas un ordre de décorer. Réutilise seulement les motifs, effets et techniques compatibles avec la demande actuelle, sa photo et le niveau '+level+
    '. Si la personne souhaite une pose uniforme, minimaliste, symétrique ou un placement précis, ignore entièrement ce gabarit. '+
    (body.operation==='vision'?'La photo fournie prime sur la proposition de placement. ':'')+
    'Ne prétends jamais que le gabarit vient de Pinterest ou d’une artiste.';
}


const themeNorm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function minionsRequested(request){
 const s=themeNorm(request);
 return /\bminions?\b/.test(s)&&!/(?:sans|aucun|pas de|evite|without|no)\s+(?:de\s+|des\s+)?minions?\b|ne\s+veux\s+pas\s+de\s+minions?\b/.test(s);
}
export function iconicThemeGuidance(request){
 if(!minionsRequested(request))return '';
 return ' PRIORITÉ THÉMATIQUE MINIONS (si et seulement si demandés) : la lecture du motif prime sur la variété abstraite. Au moins deux ongles principaux sur dix (ou un sur cinq) doivent évoquer clairement un visage jaune avec lunettes noires reconnaissables : un ou deux verres complets avec bord noir épais, pont et sangle horizontale, sur fond jaune. Au moins deux autres sur dix (ou un sur cinq) doivent montrer des salopettes bleues reconnaissables : bavette centrale bleue et bretelles visibles, éventuellement couture/poche, sur fond jaune. Les autres ongles peuvent être des accompagnements bleu denim ou jaune, avec rappels de ces détails. Pas de simple cercle flottant, de carré isolé, de croix ou de bande sans rapport identifiable ; ne fais pas dix pictogrammes vagues pour respecter artificiellement "dix différents". Privilégie le contraste et des détails assez gros pour tenir dans un ongle. Respecte toute interdiction explicite de l’utilisatrice.';
}
export function missingIconicFeatures(plan,request){
 if(!minionsRequested(request)||plan?.action!=='compose'||!Array.isArray(plan?.nails))return [];
 const normNail=n=>themeNorm([n.designBrief,n.art?.signature,...(n.art?.motifs||[]).flatMap(m=>[m.name,m.description])].join(' '));
 const nails=plan.nails.map(normNail);
 const goggles=nails.filter(s=>/lunett|goggle|verres?\b|bandeau.*oeil/.test(s)).length;
 const overalls=nails.filter(s=>/salopette|overall|bavette|bretelle|denim.*poche/.test(s)).length;
 const min=plan.nails.length===10?2:1;
 return goggles<min||overalls<min?['missing_essential_motif']:[];
}
