export const severityOptions=[['blocking','Bloquant — une fonction essentielle est inutilisable'],['friction','Gênant — possible, mais difficile à comprendre'],['cosmetic','Cosmétique — visuel ou confort']];
export const betaQuestions=[
  ['firstProduct','Premier produit ajouté sans aide',['Oui','Non','Non testé']],
  ['duration','Temps estimé pour ajouter le premier produit (minutes)'],
  ['scanUnderstood','Scan compris',['Oui','Non','Non testé']],
  ['recognition','Référence reconnue',['Exacte','Partielle','Absente','Non testé']],
  ['scanRating','Utilisation du scan',['Fiable','Partiel mais utilisable','Bloquant','Non testé']],
  ['fallback','Solution proposée pour un produit inconnu comprise',['Oui','Non','Non testé']],
  ['faithful','Première inspiration fidèle aux couleurs',['Oui','Non','Non testé']],
  ['journal','Pose retrouvée dans le journal après réouverture',['Oui','Non','Non testé']],
  ['clearest','Fonction la plus claire'],['leastClear','Fonction la moins claire'],['obstacle','Obstacle principal'],['comment','Commentaire libre'],
];
export function feedbackReport(draft,screen,date=new Date().toISOString()) {
  const severity=severityOptions.find(([key])=>key===draft.severity)?.[1]||'Non renseigné';
  return ['Retour NailMoods','Version : 12B-preparation.1','Date : '+date,'Écran : '+screen,'Catégorie : '+(draft.category||'Non renseignée'),'Impact : '+severity,'Étapes et résultat observé :',draft.details||'Non renseigné','Résultat attendu :',draft.expected||'Non renseigné',...(draft.surveyEnabled?['','Bilan de première utilisation',...betaQuestions.map(([key,label])=>label+' : '+(draft.survey?.[key]?.trim()||'Non renseigné'))]:[])].join('\n');
}
