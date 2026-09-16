import React from 'react';
import { UserRound, Library, Palette, Heart, ArrowRight, ChevronRight, BookHeart } from 'lucide-react';
import './inspiration.css';

export default function HomeView({ profile, items, library, onNavigate, onOpen }) {
  return <div className="homePage"><section className="homeHero"><small>BIENVENUE DANS TON UNIVERS</small><h1>Une envie de couleur{profile.name ? ', ' + profile.name : ''} ?</h1><p>Ton profil, ta collection et tes inspirations se retrouvent ici.</p><button onClick={() => onNavigate('create')}><Palette />Créer ma prochaine pose<ArrowRight /></button></section>
    <section className="homeLinks" aria-label="Explorer NailMoods">{[
      ['profile', UserRound, 'Mon profil', 'Mes habitudes, mon univers et mon apparence'],
      ['collection', Library, 'Ma collection', items.length + ' produits et accessoires'],
      ['create', Palette, 'Créer une inspiration', 'Mon envie du jour et mes idées'],
      ['favorites', Heart, 'Mes inspirations favorites', library.favorites.length + ' idée' + (library.favorites.length > 1 ? 's' : '') + ' conservée' + (library.favorites.length > 1 ? 's' : '')],
    ].map(([route, Icon, title, subtitle]) => <button key={route} onClick={() => onNavigate(route)}><Icon /><span><b>{title}</b><small>{subtitle}</small></span><ChevronRight /></button>)}</section>
    {library.selected && <section className="homeRetained"><small>MON IDÉE RETENUE</small><h2>{library.selected.title}</h2><button className="detailSecondary" onClick={() => onOpen(library.selected)}>Retrouver sa fiche<ArrowRight /></button></section>}
  </div>;
}

export function JournalView({ onFavorites }) {
  return <div className="inspirationPage"><section className="detailHero"><small>MON CARNET</small><h1>Mon journal</h1><p>Le journal de tes poses réalisées sera ajouté dans une prochaine étape.</p></section><section className="creationEmpty"><BookHeart /><h2>Garde déjà tes envies</h2><p>En attendant, tes inspirations favorites restent accessibles avec leurs couleurs et leur répartition par ongle.</p><button onClick={onFavorites}>Mes inspirations favorites<ArrowRight /></button></section></div>;
}
