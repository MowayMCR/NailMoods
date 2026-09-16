import React from 'react';
import { Sparkles, ChevronRight, Heart, BookHeart } from 'lucide-react';
import Sheet from './Sheet';
import { productColor } from './colorAnalysis';
import { isDecoration } from './decorations';
import './personalization.css';

export function PersonalizationSummary({ model, settings, onOpen }) {
  return <button className="personalSummary" onClick={onOpen}><Sparkles /><span><b>Des idées qui me ressemblent</b><small>{!settings.enabled ? 'Personnalisation en pause' : model.counts.feedback ? model.counts.feedback + ' retour' + (model.counts.feedback > 1 ? 's' : '') + ' pour affiner tes envies' : model.ranking ? 'Tes favoris et tes poses donnent le ton' : 'Tes goûts se dessinent au fil des poses'}</small></span><ChevronRight /></button>;
}

export default function PersonalizationPanel({ model, settings, onChange, onClose, onJournal, onFavorites, error }) {
  const { counts } = model;
  const chips = items => <div className="personalChips">{items.map(item => <span key={item.id}>{isDecoration(item) ? <Sparkles /> : <i style={{ background: productColor(item) }} />}{item.name}</span>)}</div>;
  return <Sheet title="Ce qui guide mes idées" eyebrow="MON NAILMOODS" className="personalSheet" onClose={onClose}>
    <p className="personalIntro">Tes envies évoluent. NailMoods s’appuie sur ce que tu gardes en favori et sur les retours que tu choisis de partager dans ton journal.</p>
    <label className="personalToggle"><input type="checkbox" checked={settings.enabled} onChange={event => onChange({ enabled: event.target.checked })} /><span><b>Adapter mes prochaines idées à mes retours</b><small>{settings.enabled ? 'Activé · tes choix du jour restent prioritaires.' : 'En pause · ton profil et tes choix du jour continuent de guider les idées.'}</small></span></label>
    {error && <p className="formError" role="alert">{error}</p>}
    <div className="personalStats"><div><b>{counts.favorites}</b><span>Inspiration{counts.favorites > 1 ? 's' : ''} favorite{counts.favorites > 1 ? 's' : ''}</span></div><div><b>{counts.poses}</b><span>Pose{counts.poses > 1 ? 's' : ''} réalisée{counts.poses > 1 ? 's' : ''}</span></div><div><b>{counts.feedback}</b><span>Retour{counts.feedback > 1 ? 's' : ''} dans le journal</span></div></div>
    {!model.ranking && <p className="personalEmpty">Pas besoin de tout remplir : un cœur sur une inspiration ou un « J’adore » dans le journal suffit pour commencer.</p>}
    {model.liked.length > 0 && <section><h3>Dans tes envies et tes coups de cœur</h3>{chips(model.liked)}<p>Ces références apparaissent dans tes inspirations favorites ou tes poses appréciées.</p></section>}
    {model.unexplored.length > 0 && <section><h3>À explorer avec « Envie de changement »</h3>{chips(model.unexplored)}<p>Ces vernis ne figurent pas encore dans tes poses enregistrées.</p></section>}
    {model.practice.length > 0 && <section><h3>À ton rythme</h3><p>{model.practice.join(', ')} : tes retours indiquent une réalisation parfois difficile. Les compositions simples prennent un peu plus de place, et tu gardes accès à tous les niveaux.</p></section>}
    <section className="personalModes"><h3>Selon ton envie du jour</h3><p><b>Comme d’habitude</b> rapproche les idées de tes coups de cœur.</p><p><b>Envie de changement</b> laisse plus de place aux vernis peu utilisés et aux nouvelles associations.</p><p><b>Surprends-moi</b> varie les propositions tout en respectant tes limites.</p></section>
    <details className="personalDetails"><summary>Quels retours sont utilisés ?</summary><p>Les inspirations favorites, les références des poses réalisées, « J’adore », « J’aime bien », « À refaire » et la facilité ressentie. Une pose dans le journal et son tutoriel ne comptent qu’une fois.</p><p>« À ajuster » concerne la composition essayée : ses vernis ne sont pas écartés. Les notes libres, photos et durées de tenue ne sont pas interprétées pour ce classement.</p><p>Modifie un retour ou retire un favori pour corriger ces repères. Tout reste sur cet appareil. Mettre en pause conserve ton journal et tes favoris.</p></details>
    <div className="personalActions"><button onClick={onJournal}><BookHeart />Ouvrir mon journal</button><button onClick={onFavorites}><Heart />Mes inspirations favorites</button></div>
  </Sheet>;
}
