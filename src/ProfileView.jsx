import React, { useState } from 'react';
import { ChevronRight, X, Check, Palette, UserRound, Camera, Sparkles, Search, ArrowRight } from 'lucide-react';
import { profileThemes, avatars, universeGroups, choices } from './profileOptions';
import Sheet from './Sheet';
import { productColor } from './colorAnalysis';
import { PersonalizationSummary } from './PersonalizationView';
import './profile.css';

export default function ProfileView({ onCreate, onEquipment, onFavorites, profile, items, onChange, onCollection, personalModel, personalSettings, onPersonalization }) {
  const [picker, setPicker] = useState(null);
  const [panel, setPanel] = useState(null);
  const [universes, setUniverses] = useState(false);
  const [query, setQuery] = useState('');
  const av = avatars.find(avatar => avatar[0] === profile.avatar);
  const choose = (key, value) => { if (onChange({ ...profile, [key]: value })) setPicker(null); };
  const toggleStyle = style => onChange({ ...profile, styles: profile.styles.includes(style) ? profile.styles.filter(value => value !== style) : [...profile.styles, style] });
  const avatar = big => <div className={'avatar ' + (big ? 'big ' : '') + (profile.avatarMode === 'avatar' ? 'avatarArt' : '')}>{profile.avatarMode === 'avatar' ? av?.[2] : (profile.name || 'M')[0]}</div>;
  const tile = (key, label) => <button key={key} className="settingTile" onClick={() => setPicker(key)}><small>{label}</small><b>{profile[key]}</b><ChevronRight /></button>;
  return <div className="profilePage">
    <section className="profileHero">{avatar(true)}<div><small>MON UNIVERS</small><h1>{profile.name || 'Mon profil'}</h1><p>Ton profil guide tes inspirations.</p></div></section>
    <section className="profileShortcuts" aria-label="Mon NailMoods"><button onClick={onCollection}><Palette /><span>Ma collection<small>Mes couleurs et produits</small></span><ChevronRight /></button><button onClick={onEquipment}><Sparkles /><span>Mon matériel<small>Mes outils et stickers</small></span><ChevronRight /></button><button onClick={onFavorites}><Palette /><span>Mes inspirations<small>Mes idées sauvegardées</small></span><ChevronRight /></button><button onClick={onCreate}><Sparkles /><span>Créer une idée<small>Avec mon profil et mes couleurs</small></span><ArrowRight /></button></section>
    <PersonalizationSummary model={personalModel} settings={personalSettings} onOpen={onPersonalization} />
    <section className="card"><h2>À propos de moi</h2><label className="nameField">Prénom<input value={profile.name} onChange={event => onChange({ ...profile, name: event.target.value })} /></label>
      <div className="profileGrid">{tile('shape', 'FORME')}{tile('length', 'LONGUEUR')}{tile('level', 'NIVEAU')}{tile('duration', 'TEMPS')}<div className="wide">{tile('technique', 'TYPE DE POSE')}</div></div>
    </section>
    <section className="card appearance"><h2>Apparence de mon NailMoods</h2><p>Ton style, toujours avec toi.</p>
      <button onClick={() => setPanel('theme')}><Palette /><span><b>Thème de l’application</b><small>{profileThemes.find(theme => theme[0] === profile.theme)?.[1]}</small></span><ChevronRight /></button>
      <button onClick={() => setPanel('avatar')}><UserRound /><span><b>Photo / Avatar</b><small>{profile.avatarMode === 'avatar' ? av?.[1] : 'Initiales'}</small></span><ChevronRight /></button>
    </section>
    <section className="card"><div className="titleRow"><div><h2>Mes univers</h2><p>Ce que tu aimes aujourd’hui.</p></div><button className="explore" onClick={() => setUniverses(true)}>Explorer</button></div>
      <div className="favoriteStyles">{profile.styles.map(style => <button key={style} aria-label={'Retirer ' + style} onClick={() => toggleStyle(style)}>{style}<X /></button>)}</div><button className="outline" onClick={() => setUniverses(true)}>+ Ajouter des univers</button>
    </section>
    <section className="card"><h2>Mes techniques</h2><div className="techList">{[['stickers', 'Stickers & décos'], ['french', 'French & lignes'], ['freehand', 'Dessin à main levée'], ['effects', 'Effets / poudres / chrome']].map(([key, label]) => <button key={key} onClick={() => setPicker(key)}><span>{label}</span><b>{profile[key]}</b><ChevronRight /></button>)}</div></section>
    <section className="card"><h2>Ma collection</h2><div className="signature">{items.filter(item => item.type !== 'Matériel').slice(0, 5).map(item => <div key={item.id}><i style={{ background: productColor(item) }} /><span>{item.name}</span></div>)}</div><button className="outline" onClick={onCollection}>Voir mes {items.length} produits et accessoires <ArrowRight size={13} /></button></section>

    {picker && <Sheet title={choices[picker].title} onClose={() => setPicker(null)} className="profileSheet">
      {choices[picker].visual ? <div className="visualOptions">{choices[picker].values.map(([value, description, shape]) => <button key={value} className={profile[picker] === value ? 'selected' : ''} aria-pressed={profile[picker] === value} onClick={() => choose(picker, value)}><div className="finger"><div className="nailDemo"><i className={shape} /></div></div><b>{value}</b><span>{description}</span>{profile[picker] === value && <em><Check /></em>}</button>)}</div> : <div className="optionList">{choices[picker].values.map(value => <button key={value} className={profile[picker] === value ? 'selected' : ''} aria-pressed={profile[picker] === value} onClick={() => choose(picker, value)}><span>{value}</span>{profile[picker] === value && <Check />}</button>)}</div>}
    </Sheet>}
    {panel === 'theme' && <Sheet title="Choisis ton thème" onClose={() => setPanel(null)} className="profileSheet"><div className="themeGrid">{profileThemes.map(theme => <button key={theme[0]} className={profile.theme === theme[0] ? 'selected' : ''} aria-pressed={profile.theme === theme[0]} onClick={() => onChange({ ...profile, theme: theme[0] })}><div className="themePreview" style={{ background: `linear-gradient(145deg,${theme[3][0]},${theme[3][2]})` }}><Sparkles /></div><b>{theme[1]}</b><span>{theme[2]}</span><div className="swatches">{theme[3].map(color => <i key={color} style={{ background: color }} />)}</div>{profile.theme === theme[0] && <em><Check /></em>}</button>)}</div><button className="primarySticky inSheet" onClick={() => setPanel(null)}>Garder ce thème</button></Sheet>}
    {panel === 'avatar' && <Sheet title="Photo ou avatar" onClose={() => setPanel(null)} className="profileSheet"><div className="avatarModes"><button className={profile.avatarMode === 'initials' ? 'selected' : ''} aria-pressed={profile.avatarMode === 'initials'} onClick={() => onChange({ ...profile, avatarMode: 'initials' })}>{avatar(false)}<b>Initiales</b></button><button disabled><div className="avatar"><Camera /></div><b>Ma photo</b><small>Bientôt disponible</small></button></div><h3 className="subhead">Avatars NailMoods</h3><div className="avatarGrid">{avatars.map(avatar => <button key={avatar[0]} className={profile.avatarMode === 'avatar' && profile.avatar === avatar[0] ? 'selected' : ''} aria-pressed={profile.avatarMode === 'avatar' && profile.avatar === avatar[0]} onClick={() => onChange({ ...profile, avatarMode: 'avatar', avatar: avatar[0] })}><div className={'avatar avatarArt av-' + avatar[0]}>{avatar[2]}</div><span>{avatar[1]}</span></button>)}</div><button className="primarySticky inSheet" onClick={() => setPanel(null)}>Garder mon avatar</button></Sheet>}
    {universes && <Sheet title="Explorer les univers" onClose={() => setUniverses(false)} className="profileSheet"><div className="search"><Search /><input aria-label="Rechercher un univers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un univers…" /></div>{Object.entries(universeGroups).map(([group, values]) => <div className="universeGroup" key={group}><h3>{group}</h3><div className="chips">{values.filter(style => style.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).map(style => <button key={style} className={profile.styles.includes(style) ? 'on' : ''} aria-pressed={profile.styles.includes(style)} onClick={() => toggleStyle(style)}>{style}</button>)}</div></div>)}</Sheet>}
  </div>;
}
