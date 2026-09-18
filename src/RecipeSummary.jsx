import React from 'react';
import { fingers, nailDetails } from './inspirations';
import { buildTutorial } from './tutorial';

export default function RecipeSummary({ idea }) {
  if (!idea) return null;
  const steps = buildTutorial(idea).filter(step => !step.hand || step.hand === 'left');
  return <details className="recipeSummary"><summary>Ma recette de pose</summary>
    <p><b>{idea.title}</b>{idea.options?.mood ? ' · ' + idea.options.mood : ''}{idea.options?.style && idea.options.style !== 'Libre' ? ' · ' + idea.options.style : ''}</p>
    <h3>Placement sur chaque main</h3><ul>{fingers.map((finger,index)=><li key={finger}><b>{finger}</b> — {nailDetails(idea,index).map(({label,item})=>label + ' : ' + item.name).join(' · ')}</li>)}</ul>
    <h3>Étapes essentielles</h3><ol>{steps.map(step=><li key={step.id}><b>{step.title}</b><p>{step.body}</p>{step.hint && <small>{step.hint}</small>}</li>)}</ol><p>Répète la pose sur l’autre main. Le tutoriel conserve ta progression étape par étape.</p>
    {idea.requirements?.length > 0 && <><h3>Matériel à prévoir</h3><ul>{idea.requirements.map(item=><li key={item.name}>{item.name}</li>)}</ul></>}
  </details>;
}
