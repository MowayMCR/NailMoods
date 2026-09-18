import React from 'react';
import { ownedIdeaProducts, finishLabel } from './inspirations';
import { productColor } from './colorAnalysis';

export default function IdeaProducts({ idea, items, onCollection }) {
  const products = ownedIdeaProducts(idea, items);
  return <>{idea.options && <p className="creationHint">{[idea.options.mood, idea.options.style !== 'Libre' && idea.options.style, ...new Set(idea.palette.map(finishLabel))].filter(Boolean).join(' · ')}</p>}
    {products.length > 0 && <div className="poseProducts"><b>Produits de ta collection</b><ul>{products.map(product => <li key={product.id}><button onClick={() => onCollection(product.id)}>{product.type !== 'Matériel' && <i style={{ background: productColor(product) }} />}<span>{[product.brand, product.name].filter(Boolean).join(' — ')}</span></button></li>)}</ul></div>}
  </>;
}
