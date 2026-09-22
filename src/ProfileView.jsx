import { ProfileIdentity } from './identity/IdentityPanel';
import MoodGlyph from './MoodGlyph';
import ProfileNail from './ProfileNail';
import React, { useState } from 'react';
import { ChevronRight, X, Check, Palette, UserRound, Camera, Sparkles, Search, ArrowRight, Pencil } from 'lucide-react';
import { profileThemes, avatars, choices } from './profileOptions';
import { TAGS, querySuggestions } from './social/tagTaxonomy';
import Sheet from './Sheet';
import { productColor } from './colorAnalysis';
import { PersonalizationSummary } from './PersonalizationView';
import './profile.css';

const universeGroups = [
  ['Styles', 'style'], ['Envies', 'envie'], ['Ambiances', 'ambiance'], ['Techniques', 'technique'], ['Effets', 'finish'], ['Thèmes', 'theme'],
].map(([label, category]) => [label, TAGS.filter(tag => tag.category === category).map(tag => tag.label)]);

export default function ProfileView({ accountAccess, identityExtras, extras, appearanceExtras, onCreate, onEquipment, onFavorites, profile, items, onChange, onCollection, personalModel, personalSettings, onPersonalization }) {
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
    <section className="profileHero"><button className="profileAvatarButton" aria-label="Modifier mon avatar et le thème" aria-haspopup="dialog" onClick={() => setPanel('appearance')}>{avatar(true)}<span className="avatarEditHint" aria-hidden="true"><Pencil size={12} /></span></button><div><small>MON UNIVERS</small><h1>{profile.name || 'Mon profil'}</h1><ProfileIdentity /><p>Ton profil guide tes inspirations.</p></div></section>
    <section className="card"><h2>À propos de moi</h2><p>Quelques informations pour des idées qui te ressemblent. Tu peux aussi créer une idée sans compléter ton profil.</p><label className="nameField">Prénom<input value={profile.name} onChange={event => onChange({ ...profile, name: event.target.value })} /></label>
      <div className="profileGrid">{tile('shape', 'FORME')}{tile('length', 'LONGUEUR')}{tile('level', 'NIVEAU')}{tile('duration', 'TEMPS')}<div className="wide">{tile('technique', 'TYPE DE POSE')}</div></div>
    </section>
    {identityExtras}
    <section className="card"><div className="titleRow"><div><h2>Mes univers</h2><p>Ce que tu aimes aujourd’hui.</p></div><button className="explore" onClick={() => setUniverses(true)}>Explorer</button></div>
      {!profile.styles.length && <p>Choisis les univers qui te ressemblent, ou explore librement.</p>}<div className="favoriteStyles">{profile.styles.map(style => <button key={style} aria-label={'Retirer ' + style} onClick={() => toggleStyle(style)}><MoodGlyph value={style} />{style}<X /></button>)}</div><button className="outline" onClick={() => setUniverses(true)}>+ Ajouter des univers</button>
    </section>
    <section className="card"><h2>Mes techniques</h2><div className="techList">{[['stickers', 'Stickers & décos'], ['french', 'French & lignes'], ['freehand', 'Dessin à main levée'], ['effects', 'Effets / poudres / chrome']].map(([key, label]) => <button key={key} onClick={() => setPicker(key)}><span>{label}</span><b>{profile[key]}</b><ChevronRight /></button>)}</div></section>
    <section className="profileShortcuts" aria-label="Mon NailMoods"><button onClick={onCollection}><Palette /><span>Ma collection<small>Mes couleurs et produits</small></span><ChevronRight /></button><button onClick={onEquipment}><Sparkles /><span>Mon matériel<small>Mes outils et stickers</small></span><ChevronRight /></button><button onClick={onFavorites}><Palette /><span>Mes inspirations<small>Mes idées sauvegardées</small></span><ChevronRight /></button><button onClick={onCreate}><Sparkles /><span>Créer une idée avec mes préférences<small>À adapter selon mon envie</small></span><ArrowRight /></button></section>
    <PersonalizationSummary model={personalModel} settings={personalSettings} onOpen={onPersonalization} />
    {accountAccess}
    {extras}
    {picker && <Sheet title={choices[picker].title} eyebrow="MON NAILMOODS" onClose={() => setPicker(null)} className="profileSheet">
      {choices[picker].visual ? <div className="visualOptions">{choices[picker].values.map(([value, description, shape]) => <button key={value} className={profile[picker] === value ? 'selected' : ''} aria-pressed={profile[picker] === value} onClick={() => choose(picker, value)}><ProfileNail variant={shape} /><b>{value}</b><span>{description}</span>{profile[picker] === value && <em><Check /></em>}</button>)}</div> : <div className="optionList">{choices[picker].values.map(value => <button key={value} className={profile[picker] === value ? 'selected' : ''} aria-pressed={profile[picker] === value} onClick={() => choose(picker, value)}><span>{value}</span>{profile[picker] === value && <Check />}</button>)}</div>}
    </Sheet>}
    {panel === 'appearance' && <Sheet title="Apparence de mon NailMoods" onClose={() => setPanel(null)} className="profileSheet"><div className="appearance">
      <button onClick={() => setPanel('theme')}><Palette /><span><b>Thème de l’application</b><small>{profileThemes.find(theme => theme[0] === profile.theme)?.[1]}</small></span><ChevronRight /></button>
      <button onClick={() => setPanel('avatar')}><UserRound /><span><b>Photo / Avatar</b><small>{profile.avatarMode === 'avatar' ? av?.[1] : 'Initiales'}</small></span><ChevronRight /></button>
    </div></Sheet>}
    {panel === 'theme' && <Sheet title="Choisis ton thème" onClose={() => setPanel(null)} className="profileSheet"><div className="themeGrid">{profileThemes.map(theme => <button key={theme[0]} className={profile.theme === theme[0] ? 'selected' : ''} aria-pressed={profile.theme === theme[0]} onClick={() => onChange({ ...profile, theme: theme[0] })}><div className="themePreview" style={{ background: `linear-gradient(145deg,${theme[3][0]},${theme[3][2]})` }}><Sparkles /></div><b>{theme[1]}</b><span>{theme[2]}</span><div className="swatches">{theme[3].map(color => <i key={color} style={{ background: color }} />)}</div>{profile.theme === theme[0] && <em><Check /></em>}</button>)}</div><button className="primarySticky inSheet" onClick={() => setPanel(null)}>Garder ce thème</button></Sheet>}
    {panel === 'avatar' && <Sheet title="Photo ou avatar" onClose={() => setPanel(null)} className="profileSheet">{appearanceExtras}<div className="avatarModes"><button className={profile.avatarMode === 'initials' ? 'selected' : ''} aria-pressed={profile.avatarMode === 'initials'} onClick={() => onChange({ ...profile, avatarMode: 'initials' })}>{avatar(false)}<b>Initiales</b></button><button disabled><div className="avatar"><Camera /></div><b>Ma photo</b><small>Bientôt disponible</small></button></div><h3 className="subhead">Avatars NailMoods</h3><div className="avatarGrid">{avatars.map(avatar => <button key={avatar[0]} className={profile.avatarMode === 'avatar' && profile.avatar === avatar[0] ? 'selected' : ''} aria-pressed={profile.avatarMode === 'avatar' && profile.avatar === avatar[0]} onClick={() => onChange({ ...profile, avatarMode: 'avatar', avatar: avatar[0] })}><div className={'avatar avatarArt av-' + avatar[0]}>{avatar[2]}</div><span>{avatar[1]}</span></button>)}</div><button className="primarySticky inSheet" onClick={() => setPanel(null)}>Garder mon avatar</button></Sheet>}
    {universes && <Sheet title="Explorer les univers" onClose={() => setUniverses(false)} className="profileSheet universePicker"><div className="search"><Search /><input aria-label="Rechercher un univers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un univers, une technique…" /></div>{universeGroups.map(([group, values]) => { const suggestions = new Set(querySuggestions(query, 100).map(tag => tag.label)); const filtered = values.filter(style => !query || style.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')) || suggestions.has(style)); return filtered.length ? <div className="universeGroup" key={group}><h3>{group}</h3><div className="chips">{filtered.map(style => <button key={style} className={profile.styles.includes(style) ? 'on' : ''} aria-pressed={profile.styles.includes(style)} onClick={() => toggleStyle(style)}><MoodGlyph value={style} />{style}</button>)}</div></div> : null; })}{query && !universeGroups.some(([, values]) => values.some(style => style.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')) || querySuggestions(query, 100).some(tag => tag.label === style))) && <p className="universeEmpty">Aucun tag correspondant.</p>}</Sheet>}
  </div>;
}
