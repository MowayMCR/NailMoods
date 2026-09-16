import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, Palette, Library, BookHeart, UserRound, ChevronRight, X, Check, Search, Plus, Camera, Trash2, Heart, Link, ScanLine, Image, PenLine, WandSparkles, Package } from 'lucide-react';
import { equipmentInfo, EquipmentVisual, EquipmentCategory, EquipmentFields } from './equipment';
import ProductPhoto from './ProductPhoto';
import CreateView from './CreateView';
import './style.css';
const colors=[['Prune','#703650'],['Cassis','#622947'],['Bordeaux','#852d40'],['Rouge','#c73e46'],['Rose','#db7897'],['Nude','#ddb9aa'],['Beige','#cbb89d'],['Brun','#805b4c'],['Orange','#d47c4b'],['Jaune','#dfc65e'],['Vert','#67865f'],['Bleu','#5479a6'],['Violet','#735b91'],['Noir','#29262a'],['Blanc','#f1efeb'],['Argent','#aeb1b5'],['Or','#c4a45e'],['Multi','#8c5b8f']];const defaults={name:'',brand:'',url:'',type:'Semi-permanent',finish:'Brillant',family:'Rose',color:'#db7897',depth:'Moyen',undertone:'Neutre',effect:'Aucun',usage:'Couleur seule',fav:false};const starter=[{...defaults,id:1,name:'Prune foncée',brand:'Le Mini Macaron',family:'Prune',color:'#703650',depth:'Foncé',undertone:'Froid',finish:'Brillant',fav:true},{...defaults,id:2,name:'Latte',brand:'Le Mini Macaron',family:'Brun',color:'#805b4c',depth:'Moyen',undertone:'Chaud',finish:'Brillant'},{...defaults,id:3,name:'Galactic Sparkle',brand:'Le Mini Macaron',type:'Effet',family:'Multi',color:'#665083',finish:'Chrome',effect:'Multichrome',usage:'Sur une couleur de base'}];const themes={nailmoods:['#b44d76','#733451','#f8e9ee','#fdfaf7'],witchy:['#8d5576','#241625','#eee4ed','#faf6f9'],girly:['#e05f8c','#b84970','#fde8ef','#fff9fb'],goth:['#a52d4e','#211a1e','#eee5e8','#faf8f8'],celestial:['#6674b5','#293567','#e9ecf8','#fafbff'],coquette:['#c84768','#8e2944','#fae7eb','#fffafb'],clean:['#7d8067','#555947','#eeeee7','#fbfbf8'],y2k:['#d850b6','#8753d1','#f2e7ff','#fdf9ff']};

function Brand() {
  return <div className="brandFinal"><img src="/NailMoods/nailmoods-logo.svg" alt="" /><div><b>Nail<span>Moods</span></b><small>CRÉE TON STYLE, À TON RYTHME</small></div></div>;
}

function readStored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

const materialDefaults = { equipmentCategory: 'Autre matériel', quantity: 1, reference: '', materialStyle: '', notes: '', photo: '' };
const tabRoutes = { home: 'accueil', create: 'creer', collection: 'collection', journal: 'journal', profile: 'profil' };
const tabFromHash = () => Object.keys(tabRoutes).find(tab => '#' + tabRoutes[tab] === window.location.hash) || 'collection';

function App() {
  const [tab, setTab] = useState(tabFromHash);
  const [profile] = useState(() => readStored('nm-profile', {}));
  const [items, setItems] = useState(() => {
    const stored = readStored('nm-collection-v2', starter);
    return Array.isArray(stored) ? stored : starter;
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tous');
  const [edit, setEdit] = useState(null);
  const [importer, setImporter] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const th = themes[profile.theme] || themes.nailmoods;
  const material = edit?.type === 'Matériel';

  function navigate(next) {
    setTab(next);
    window.location.hash = tabRoutes[next];
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  useEffect(() => {
    const followRoute = () => setTab(tabFromHash());
    window.addEventListener('hashchange', followRoute);
    return () => window.removeEventListener('hashchange', followRoute);
  }, []);

  useEffect(() => {
    if (!edit && !importer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = event => {
      if (event.key === 'Escape') { setEdit(null); setImporter(false); }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', escape);
    };
  }, [Boolean(edit), importer]);

  function start(source, type = filter === 'Matériel' ? 'Matériel' : defaults.type) {
    setImporter(false);
    setSaveError('');
    setEdit({ ...defaults, ...materialDefaults, type, source });
  }

  function change(values) {
    setSaveError('');
    setEdit(current => current ? { ...current, ...values } : null);
  }

  function persist(next) {
    try {
      localStorage.setItem('nm-collection-v2', JSON.stringify(next));
      setItems(next);
      setEdit(null);
      return true;
    } catch {
      setSaveError('La collection n’a pas pu être enregistrée sur cet appareil. Si le stockage est plein, retire la photo de cette fiche puis réessaie. Tes produits déjà enregistrés sont conservés.');
      return false;
    }
  }

  function save() {
    if (!edit.name.trim() || photoBusy) return;
    const quantity = Number(edit.quantity ?? 1);
    if (material && (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999)) {
      setSaveError('Indique une quantité entière entre 1 et 9999.');
      return;
    }
    const product = { ...edit, id: edit.id ?? crypto.randomUUID(), name: edit.name.trim(), brand: edit.brand.trim(), url: edit.url.trim() };
    if (material) product.quantity = quantity;
    const saved = persist(edit.id ? items.map(item => item.id === edit.id ? product : item) : [...items, product]);
    if (saved && !edit.id) { setSearch(''); setFilter(material ? 'Matériel' : 'Tous'); }
  }

  const query = search.toLocaleLowerCase('fr').trim();
  const filtered = items.filter(item =>
    (filter === 'Tous' || item.type === filter) &&
    [item.name, item.brand, item.type, item.equipmentCategory, item.reference, item.materialStyle, item.notes, item.family, item.finish, item.depth]
      .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query)
  );
  const colorCount = new Set(items.filter(item => item.type !== 'Matériel' && item.family).map(item => item.family)).size;

  return <div className="app phase2" style={{ '--a': th[0], '--b': th[1], '--soft': th[2], '--paper': th[3] }}>
    <header><Brand /><button className="round" aria-label="Profil"><UserRound /></button></header>
    <main>
      {tab === 'create' ? <CreateView items={items} profile={profile} onCollection={() => navigate('collection')} /> : tab === 'collection' ? <>
        <section className="collectionHero">
          <small>PHASE 2 · COLLECTION</small><h1>Ma collection</h1>
          <p>Tes couleurs, tes effets et tout ton matériel de manucure.</p>
          <div className="collectionStats">
            <div><b>{items.length}</b><span>Produits</span></div>
            <div><b>{colorCount}</b><span>Couleurs</span></div>
            <div><b>{items.filter(item => item.fav).length}</b><span>Favoris</span></div>
          </div>
        </section>
        <section className="collectionTools">
          <div className="collectionSearch"><Search /><input aria-label="Rechercher dans la collection" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher…" /></div>
          <button className="addProduct" onClick={() => filter === 'Matériel' ? start('manual', 'Matériel') : setImporter(true)}><Plus /> Ajouter</button>
        </section>
        <div className="filterRow">
          {['Tous', 'Semi-permanent', 'Vernis', 'Gel', 'Effet', 'Matériel'].map(value =>
            <button key={value} className={filter === value ? 'on' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>
          )}
        </div>
        <section className="collectionGrid">
          {filtered.map(item => <button key={item.id} className="productCard" onClick={() => {
            setSaveError('');
            setEdit({ ...defaults, ...materialDefaults, ...item });
          }}>
            {item.photo ? <div className="productPhoto"><img src={item.photo} alt={item.name} loading="lazy" /></div> :
              item.type === 'Matériel' ? <EquipmentVisual item={item} /> :
                <div className="bottle" aria-hidden="true"><i style={{ background: item.color }} /><span style={{ background: item.color }} /></div>}
            <div className="productInfo">
              <small>{item.type === 'Matériel' ? equipmentInfo(item).name : item.family + ' · ' + item.depth}</small>
              <b>{item.name}</b>
              <span>{item.type === 'Matériel'
                ? [item.materialStyle, 'Qté : ' + (item.quantity ?? 1)].filter(Boolean).join(' · ')
                : [item.finish, item.effect !== 'Aucun' && item.effect].filter(Boolean).join(' · ')}</span>
            </div>
            {item.fav && <Heart className="fav" fill="currentColor" aria-label="Favori" />}
          </button>)}
        </section>
        {filtered.length === 0 && <section className="emptyCollection">
          <Package aria-hidden="true" />
          <h2>{search ? 'Aucun résultat' : filter === 'Matériel' ? 'Ta boîte à matériel' : 'Aucun produit pour le moment'}</h2>
          <p>{search ? 'Essaie un autre nom, une marque ou un type de matériel.' : filter === 'Matériel' ? 'Lampes, stickers, pinceaux, limes… Rassemble ici ce que tu possèdes.' : 'Ajoute ton premier produit dans cette catégorie.'}</p>
          {!search && <button onClick={() => filter === 'Matériel' ? start('manual', 'Matériel') : setImporter(true)}><Plus />{filter === 'Matériel' ? 'Ajouter du matériel' : 'Ajouter un produit'}</button>}
        </section>}
        <section className="phase3Preview">
          <small>MES ENVIES</small><h2>Et si on créait avec tout ça ?</h2>
          <p>Choisis une humeur, un univers et ton temps. Retrouve des idées composées avec tes couleurs et ton matériel.</p>
          <button className="moreIdeas" onClick={() => navigate('create')}><Palette />Créer ma manucure</button>
        </section>
      </> : <section className="coming"><h1>Phase suivante</h1><p>Cette partie n’est pas encore ouverte dans la version de test.</p><button onClick={() => navigate('create')}>Retour à Créer</button></section>}
    </main>
    <nav>{[['home', Home, 'Accueil'], ['create', Palette, 'Créer'], ['collection', Library, 'Collection'], ['journal', BookHeart, 'Journal'], ['profile', UserRound, 'Profil']].map(([id, Icon, label]) =>
      <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>
    )}</nav>

    {importer && <div className="overlay" onClick={() => setImporter(false)}>
      <section className="productSheet importSheet" role="dialog" aria-modal="true" aria-labelledby="import-title" onClick={event => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheetTitle"><div><small>NOUVEAU PRODUIT</small><h2 id="import-title">Comment veux-tu l’ajouter ?</h2></div><button aria-label="Fermer" onClick={() => setImporter(false)}><X /></button></div>
        <div className="importChoices">
          <button onClick={() => start('manual', 'Matériel')}>
            <span className="importIcon"><Package /></span><span className="importCopy"><b>Matériel & accessoires</b><small>Lampe, stickers, pinceaux, limes…</small></span><ChevronRight className="importArrow" />
          </button>
          {[
            [Camera, 'Prendre une photo', 'Photographie le produit', 'camera'],
            [Image, 'Importer une photo', 'Capture ou image de ta galerie', 'image'],
            [Link, 'Coller une URL', 'Garde le lien de la fiche produit', 'url'],
            [PenLine, 'Saisie manuelle', 'Ajoute seulement ce que tu connais', 'manual'],
          ].map(([Icon, title, subtitle, source]) => <button key={source} onClick={() => start(source)}>
            <span className="importIcon"><Icon /></span><span className="importCopy"><b>{title}</b><small>{subtitle}</small></span><ChevronRight className="importArrow" />
          </button>)}
          <button disabled><span className="importIcon"><ScanLine /></span><span className="importCopy"><b>Scanner le produit</b><small>Lecture du code-barres à venir</small></span></button>
        </div>
        <div className="smartHint"><WandSparkles /><span><b>Ta collection, à ton rythme</b><small>Ajoute une photo et renseigne ce que tu connais. L’analyse automatique des images et des liens reste à venir.</small></span></div>
      </section>
    </div>}

    {edit && <div className="overlay" onClick={() => setEdit(null)}>
      <section className="productSheet" role="dialog" aria-modal="true" aria-labelledby="product-title" onClick={event => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheetTitle"><div><small>{edit.id ? 'MODIFIER' : 'AJOUTER'}</small><h2 id="product-title">{material ? 'Fiche matériel' : 'Fiche produit'}</h2></div><button aria-label="Fermer" onClick={() => setEdit(null)}><X /></button></div>
        <label>Nature<select value={edit.type} onChange={event => change({ type: event.target.value })}>
          {['Semi-permanent', 'Vernis', 'Gel', 'Effet', 'Matériel'].map(value => <option key={value}>{value}</option>)}
        </select></label>
        {material && <EquipmentCategory item={edit} onChange={change} />}
        <label>{material ? 'Nom du matériel' : 'Nom'}<input value={edit.name} onChange={event => change({ name: event.target.value })} placeholder={material ? equipmentInfo(edit).example : 'Nom du produit'} required /></label>
        <label>Marque (facultatif)<input value={edit.brand} onChange={event => change({ brand: event.target.value })} /></label>
        {material && <EquipmentFields item={edit} onChange={change} />}
        <label>Lien du produit (facultatif)<input type="url" value={edit.url} onChange={event => change({ url: event.target.value })} placeholder="https://…" /></label>
        {(edit.source === 'url' || edit.url) && <p className="fieldHelp">Le lien est enregistré avec ta fiche. La photo et les informations du site ne sont pas encore récupérées automatiquement.</p>}
        <ProductPhoto value={edit.photo} onChange={photo => change({ photo })} onBusy={setPhotoBusy} />
        {!material && <>
          <label>Finition<select value={edit.finish} onChange={event => change({ finish: event.target.value })}>
            {['Brillant', 'Crème', 'Jelly', 'Pailleté', 'Nacré', 'Métallique', 'Chrome', 'Cat-eye', 'Mat', 'Autre'].map(value => <option key={value}>{value}</option>)}
          </select></label>
          <div className="fieldHead"><b>Couleur principale</b><small>modifiable</small></div>
          <div className="colorChips">{colors.map(([name, color]) =>
            <button key={name} className={edit.family === name ? 'on' : ''} aria-pressed={edit.family === name} onClick={() => change({ family: name, color })}><i style={{ background: color }} /><span>{name}</span>{edit.family === name && <Check />}</button>
          )}</div>
          <div className="form2">
            <label>Profondeur<select value={edit.depth} onChange={event => change({ depth: event.target.value })}>{['Clair', 'Moyen', 'Foncé'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Sous-ton<select value={edit.undertone} onChange={event => change({ undertone: event.target.value })}>{['Chaud', 'Neutre', 'Froid'].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
          <div className="form2">
            <label>Effet<select value={edit.effect} onChange={event => change({ effect: event.target.value })}>{['Aucun', 'Pailleté', 'Irisé', 'Holographique', 'Multichrome', 'Magnétique', 'Autre'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Utilisation<select value={edit.usage} onChange={event => change({ usage: event.target.value })}>{['Couleur seule', 'Sur une couleur de base', 'Avec aimant', 'Avec top coat', 'Autre'].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
        </>}
        <button className={'favoriteToggle ' + (edit.fav ? 'on' : '')} onClick={() => change({ fav: !edit.fav })}><Heart fill={edit.fav ? 'currentColor' : 'none'} /> {edit.fav ? 'Dans mes favoris' : 'Ajouter aux favoris'}</button>
        <div className="sheetActions">
          {saveError && <p className="formError" role="alert">{saveError}</p>}
          <button className="saveProduct" disabled={!edit.name.trim() || photoBusy} onClick={save}><Check />{photoBusy ? 'Préparation de la photo…' : 'Enregistrer'}</button>
          {!edit.name.trim() && <p className="fieldHelp">Renseigne un nom pour enregistrer.</p>}
        </div>
        {edit.id && <button className="deleteProduct" onClick={() => persist(items.filter(item => item.id !== edit.id))}><Trash2 /> Supprimer</button>}
      </section>
    </div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
