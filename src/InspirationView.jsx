import PhotoReferences from './PhotoReferences';
import PublicationTags from './social/PublicationTags';
import {cleanTags,suggestTags,internalTags} from './social/tags';
import {useSocial} from './social/SocialContext';
import RecipeSummary from './RecipeSummary';
import IdeaProducts from './IdeaProducts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, Check, Clock3, Palette, RotateCcw, ChevronRight, ExternalLink, Package, BookmarkCheck, Sparkles, Play, FolderHeart, Send } from 'lucide-react';
import NailPreview from './NailPreview';
import { equipmentInfo } from './equipment';
import { createVariants, difficultyLabels, fingers, finishLabel, ideaAvailability, nailDetails, productStatus, resourceRole, safeProductUrl } from './inspirations';
import './inspiration.css';

function ProductRow({ item, items, role, onCollection }) {
  const status = productStatus(item, items);
  const photo = status.state === 'available' && status.current?.photo;
  const Icon = item.type === 'Matériel' ? equipmentInfo(item).icon : Palette;
  const url = safeProductUrl(item.url);
  return <li className="detailProduct">
    <div className="detailProductVisual">{photo ? <img src={photo} alt="" loading="lazy" /> : item.type === 'Matériel' ? <Icon /> : <i style={{ background: item.color }} />}</div>
    <div className="detailProductCopy"><small>{role || item.type}</small><b>{item.name}</b>{item.brand && <span>{item.brand}</span>}{item.type !== 'Matériel' && finishLabel(item) && <span>{finishLabel(item)}</span>}<span className={'productState ' + status.state}>{status.state === 'available' && <Check />}{status.label}</span>
      <div className="productLinks"><button onClick={() => onCollection(status.current?.id)}>{status.current ? 'Voir ma fiche' : 'Ouvrir ma collection'}<ChevronRight /></button>{url && <a href={url} target="_blank" rel="noopener noreferrer">Lien du produit<ExternalLink /></a>}</div>
    </div>
  </li>;
}

export default function InspirationView({ onPublish, onSaveIdea, onRename, idea, items, profile, favorite, selected, onFavorite, onSelect, onOpen, onBack, onFavorites, onCollection, onTutorial, tutorialExists, onDone, completed, learning, onShareToPro }) {
  const social=useSocial();
  const [publishOpen,setPublishOpen]=useState(false),[publicTags,setPublicTags]=useState(()=>idea.publicTags??suggestTags(idea)),[visibility,setVisibility]=useState(idea.isPublic===true?'public':'private'),[publishNotice,setPublishNotice]=useState('');
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [finger, setFinger] = useState(0);
  const [simpleVariant, setSimpleVariant] = useState(false);
  const [variantSeed, setVariantSeed] = useState(1);
  const [showVariants, setShowVariants] = useState(false);
  const [variantLearning, setVariantLearning] = useState(null);
  const heading = useRef(null);
  const variantsAnchor = useRef(null);
  const availability = ideaAvailability(idea, items);
  const outdated = availability.filter(item => !['available', 'conceptual'].includes(item.state));
  const variants = useMemo(() => showVariants ? createVariants(simpleVariant ? { ...idea, options: { ...idea.options, constraints: ['noDrawing'], decorations: 'without' } } : idea, items, profile, variantSeed, variantLearning) : [], [idea, items, profile, variantSeed, showVariants, variantLearning, simpleVariant]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); heading.current?.focus({ preventScroll: true }); }, [idea.key]);
  function generateVariants(simple = false) {
    if(idea.intent==='photos'&&social?.tier==='free'){setPublishNotice('Les modifications de projets photo nécessitent Plus.');return;}
    setSimpleVariant(simple === true);
    setVariantLearning(learning);
    setShowVariants(true);
    if (showVariants) setVariantSeed(seed => seed + 1);
    requestAnimationFrame(() => variantsAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  return <div className="inspirationPage">
    <div className="detailToolbar"><button onClick={onBack}><ArrowLeft />Mes idées</button><button aria-pressed={favorite} aria-label={favorite ? 'Retirer cette inspiration des favoris' : 'Ajouter cette inspiration aux favoris'} onClick={onFavorite}><Heart fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'En favoris' : 'Favori'}</button></div>
    <section className="detailHero"><small>MON INSPIRATION</small><h1 ref={heading} tabIndex={-1}>{idea.title}</h1>{onRename && !(idea.intent==='photos'&&social?.tier==='free') && <div className="renameIdea">{renaming ? <><label>Nom de mon inspiration<input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} /></label><button disabled={!title.trim()} onClick={() => { if (onRename(title)) setRenaming(false); }}>Enregistrer le nom</button><button onClick={() => { setTitle(idea.title); setRenaming(false); }}>Annuler</button></> : <button onClick={() => setRenaming(true)}>Renommer</button>}</div>}<p>{idea.description}</p><div className="detailBadges"><span><Clock3 />≈ {idea.minutes} min</span><span>{difficultyLabels[idea.rank]}</span><span>{idea.palette.length} vernis</span></div></section>
    <div className="startTutorialAction">{onSaveIdea && <button className="detailSecondary" disabled={favorite} onClick={onSaveIdea}><Heart />{favorite ? 'Pose sauvegardée dans mes favoris' : 'Sauvegarder cette pose'}</button>}<button className="detailPrimary" onClick={onTutorial}><Play />{tutorialExists ? 'Reprendre le tutoriel' : 'Démarrer le tutoriel'}<ArrowRight /></button><small>Une étape à la fois, avec ta progression sauvegardée.</small><button className="detailSecondary markIdeaDone" onClick={onDone}><Check />{completed && !tutorialExists ? 'Voir ma pose réalisée' : 'Je l’ai faite 💅'}</button><small>{completed && !tutorialExists ? 'Cette inspiration est marquée comme réalisée dans tes listes.' : 'Passer le tutoriel et enregistrer la pose comme réalisée.'}</small></div>
    {social?.userId&&(['plus','pro'].includes(social.tier)||idea.isPublic)&&onPublish&&<section className="publicationPanel"><button className="detailSecondary" onClick={()=>setPublishOpen(v=>!v)}>{idea.isPublic?'Modifier ma publication':'Publier cette inspiration'}</button>{publishNotice&&<p role="status">{publishNotice}</p>}{publishOpen&&<><PublicationTags source={idea} value={publicTags} onChange={setPublicTags}/><label>Visibilité<select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Privé · moi uniquement</option><option value="public" disabled={!['plus','pro'].includes(social.tier)}>Public · Découvrir et profil visible</option></select></label><button className="detailPrimary" onClick={()=>{const tags=cleanTags(publicTags);if(onPublish({publicTags:tags,searchTags:internalTags(Object.values(tags).flat().join(' ')),isPublic:visibility==='public'})){setPublishNotice(visibility==='public'?'Publication enregistrée. Elle sera visible après synchronisation si ton profil est visible.':'Inspiration privée après synchronisation.');setPublishOpen(false);}}}>{visibility==='public'?'Confirmer et publier':'Enregistrer en privé'}</button></>}</section>}
    <PhotoReferences photos={idea.photoSources}/><section className="detailCanvas"><div className="detailSectionTitle"><h2>Ongle par ongle</h2><span>{idea.shape} · {idea.length}</span></div>
      <p className="detailMuted">Touche un ongle pour voir sa composition. La même répartition est prévue sur les deux mains.</p>
      <NailPreview idea={idea} onSelect={setFinger} selectedIndex={finger} labels={fingers} controls />
      <div className="fingerDetail" aria-live="polite"><div><small>LES DEUX MAINS</small><h3>{fingers[finger]}</h3></div><ul>{nailDetails(idea, finger).map(({ label, item }) => <li key={label}><i style={{ background: item.type === 'Matériel' ? idea.nails[finger].decoration?.color : item.color }} /><span><small>{label}</small><b>{item.name}</b></span></li>)}</ul></div>
      <p className="detailFootnote">{idea.intent === 'inspire' ? 'Couleurs de style : choisis des produits adaptés pour réaliser cette inspiration.' : 'Aperçu avec les teintes enregistrées dans ta collection.'} Utilise la bascule pour comparer l’intention illustrée au rendu de matière réaliste.</p>
    </section>
    <section className="detailSection"><IdeaProducts idea={idea} items={items} onCollection={onCollection} /></section><section className="detailTiming"><Clock3 /><div><b>≈ {idea.minutes} min pour la couleur et la décoration</b><p>Préparation, dépose et séchage en plus. Pour les temps d’application et la compatibilité de ta lampe, suis les notices de tes produits.</p></div></section>
    {outdated.length > 0 && <div className="detailNotice" role="status"><b>Ta collection a évolué</b><p>Cette fiche conserve la composition enregistrée. {outdated.length} produit{outdated.length > 1 ? 's ont' : ' a'} changé ou manque{outdated.length > 1 ? 'nt' : ''} dans ta collection. Les variantes utilisent son contenu actuel.</p></div>}
    <section className="detailSection"><div className="detailSectionTitle"><h2>Les vernis</h2><span>{idea.palette.length} référence{idea.palette.length > 1 ? 's' : ''}</span></div><ul className="detailProducts">{idea.palette.map(item => <ProductRow key={item.id} item={item} items={items} onCollection={onCollection} />)}</ul></section>
    {idea.requirements?.length > 0 && <section className="detailSection"><h2>Pour reproduire cette inspiration</h2><ul>{idea.requirements.map(r => <li key={r.name}>{r.name}{r.required ? ' · nécessaire pour la réalisation' : ''}</li>)}</ul><button className="detailSecondary" onClick={() => generateVariants(true)}>Variante sans pinceau ni dessin</button></section>}
    <section className="detailSection"><div className="detailSectionTitle"><h2>À préparer</h2><Package /></div>{idea.resources.length ? <ul className="detailProducts">{idea.resources.map(item => <ProductRow key={item.id} item={item} items={items} role={resourceRole(item)} onCollection={onCollection} />)}</ul> : <p className="detailMuted">Aucun outil de nail art supplémentaire pour cette composition.</p>}<p className="detailFootnote">Cette liste couvre la composition. Prévois aussi les produits de préparation et de finition requis par ta pose.</p></section>
    <RecipeSummary idea={idea} /><section className="detailSection detailWhy"><h2>Pourquoi cette idée ?</h2><ul>{idea.reasons.map(reason => <li key={reason}><Check />{reason}</li>)}</ul></section>
    <div className="detailActions"><button className="detailPrimary" aria-pressed={selected} aria-label={selected ? 'Ne plus retenir cette inspiration' : 'Retenir cette inspiration'} onClick={onSelect}>{selected ? <BookmarkCheck /> : <Check />}{selected ? 'C’est mon idée retenue' : 'Retenir cette inspiration'}</button><button className="detailSecondary" onClick={onFavorite}><Heart fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'Retirer des favoris' : 'Garder dans mes favoris'}</button>{onShareToPro && <button className="detailSecondary" onClick={() => onShareToPro({ source: idea, type: 'inspiration' })}><Send />Envoyer à ma PO</button>}</div>
    <section className="detailSection detailVariants" ref={variantsAnchor}><div className="detailSectionTitle"><h2>Et si on variait ?</h2><Sparkles /></div><p className="detailMuted">Même nombre de vernis, même limite de temps et de difficulté. Avec ta collection actuelle.</p><button className="detailSecondary" onClick={generateVariants}><RotateCcw />{showVariants ? 'Recomposer les variantes' : 'Voir les variantes'}</button>
      {showVariants && (variants.length ? <div className="variantList">{variants.map(variant => <article key={variant.key}><small>{variant.variantLabel}</small><NailPreview idea={variant} /><h3>{variant.title}</h3><p>{variant.palette.map(item => item.name).join(' · ')}</p><span>≈ {variant.minutes} min · {variant.palette.length} vernis</span><button onClick={() => onOpen(variant)}>Voir cette variante<ArrowRight /></button></article>)}</div> : <p className="detailNotice" role="status">Aucune autre variante avec ces choix et ta collection actuelle. Tu peux ajuster ton envie dans Créer.</p>)}
    </section>
    <button className="detailFavoritesLink" onClick={onFavorites}><Heart />Retrouver mes inspirations favorites<ArrowRight /></button>
  </div>;
}

export function FavoritesView({ favorites, items, onOpen, onFavorite, onBack, completedKeys = new Set() }) {
  return <div className="inspirationPage favoritesPage"><div className="detailToolbar"><button onClick={onBack}><ArrowLeft />Créer</button></div><section className="detailHero"><small>MES ENVIES À GARDER</small><h1>Mes inspirations<br /><em>favorites</em></h1><p>{favorites.length} inspiration{favorites.length > 1 ? 's' : ''} conservée{favorites.length > 1 ? 's' : ''} sur cet appareil.</p></section>
    {!favorites.length ? <section className="creationEmpty"><Heart /><h2>Les idées qui te ressemblent</h2><p>Touche le cœur d’une inspiration pour la garder ici, même après avoir créé de nouvelles idées.</p><button onClick={onBack}>Trouver mes idées<ArrowRight /></button></section> : <div className="favoriteIdeaList">{favorites.map(idea => {
      const changed = ideaAvailability(idea, items).some(item => !['available', 'conceptual'].includes(item.state));
      return <article className="ideaCard" key={idea.key}><div className="ideaTopline"><span>{idea.palette.length} VERNIS · ≈ {idea.minutes} MIN</span><button className="ideaHeart" aria-label={'Retirer ' + idea.title + ' des favoris'} onClick={() => onFavorite(idea)}><Heart fill="currentColor" /></button></div><NailPreview idea={idea} /><div className="ideaBody">{completedKeys.has(idea.key) && <span className="ideaDoneBadge"><Check />Déjà réalisée</span>}<h3>{idea.title}</h3><p>{idea.palette.map(item => item.name).join(' · ')}</p>{changed && <p className="favoriteChanged">Collection modifiée · détails dans la fiche</p>}<button className="detailPrimary" onClick={() => onOpen(idea)}>Ouvrir la fiche<ArrowRight /></button></div></article>;
    })}</div>}
  </div>;
}

export function ProjectsView({ projects = [], items, onOpen, onBack }) {
  return <div className="inspirationPage favoritesPage projectsPage"><div className="detailToolbar"><button onClick={onBack}><ArrowLeft />Créer</button></div><section className="detailHero"><small>MES COMPOSITIONS</small><h1>Mes projets</h1><p>{projects.length} composition{projects.length > 1 ? 's' : ''} préparée{projects.length > 1 ? 's' : ''} à partir de tes inspirations.</p></section>
    {!projects.length ? <section className="creationEmpty"><FolderHeart /><h2>Ton prochain projet commence par une image</h2><p>Importe une à quatre références dans Créer, puis enregistre la composition qui te plaît.</p><button onClick={onBack}>Créer à partir de photos<ArrowRight /></button></section> : <div className="favoriteIdeaList">{projects.map(idea => {
      const changed = ideaAvailability(idea, items).some(item => !['available', 'conceptual'].includes(item.state));
      return <article className="ideaCard" key={idea.key}><div className="ideaTopline"><span>{idea.rendering?.label || idea.technique || 'COMPOSITION'} · ≈ {idea.minutes} MIN</span></div><NailPreview idea={idea} controls /><div className="ideaBody"><h3>{idea.title}</h3><p>{idea.description}</p>{changed && <p className="favoriteChanged">Collection modifiée · vérifie les produits dans la fiche</p>}<button className="detailPrimary" onClick={() => onOpen(idea)}>Ouvrir le projet<ArrowRight /></button></div></article>;
    })}</div>}
  </div>;
}
