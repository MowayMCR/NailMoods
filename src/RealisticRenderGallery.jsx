import React from 'react';

const examples = [
  { src: 'realistic-core-finishes.png', label: 'Aura · Cat Eye · Chrome · Jelly', detail: 'Transparence, halo magnétique et reflet miroir' },
  { src: 'realistic-special-finishes.png', label: 'Paillettes · Aurora · Glass', detail: 'Particules intégrées, irisation et profondeur vitrée' },
  { src: 'realistic-relief-jewels.png', label: 'Glazed · Gel 3D · Strass · Charms', detail: 'Voile nacré, volume, ombres et points de contact' },
  { src: 'realistic-multitechnique.png', label: 'Composition multitechnique', detail: 'French, Cat Eye, gel 3D, strass et dessin fin sur une même main' },
];

export default function RealisticRenderGallery() {
  return <section className="realisticGallery" aria-labelledby="realistic-gallery-title">
    <div className="realisticGalleryHead"><div><small>RECETTE · BIBLIOTHÈQUE PHOTO BÊTA</small><h2 id="realistic-gallery-title">Rendus réalistes de référence</h2></div><span>Gratuit en test</span></div>
    <p>Ces rendus déjà validés servent de référence pendant la bêta. NailMoods rapproche au mieux les couleurs et répartit maintenant plusieurs techniques sur une même main, sans appel payant.</p>
    <div className="realisticGalleryRail" role="list" aria-label="Exemples de rendus réalistes">
      {examples.map(example => <article key={example.src} role="listitem">
        <img src={`${import.meta.env.BASE_URL}${example.src}`} alt={example.label} loading="lazy" />
        <div><h3>{example.label}</h3><p>{example.detail}</p></div>
      </article>)}
    </div>
    <small className="realisticGalleryNote">Mode bêta : aucune génération externe n’est facturée. Les teintes sont adaptées au plus proche à partir de la palette d’inspiration.</small>
  </section>;
}
