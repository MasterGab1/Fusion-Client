import React, { useEffect, useRef, useState } from 'react';
import { Play as PlayIcon, ChevronDown, ChevronRight, Check, LoaderCircle, ImagePlus, Settings2, Cpu, Puzzle, ArrowUpRight, Newspaper, Search, RotateCcw } from 'lucide-react';
import { NewsCards } from './News.jsx';
export const profileName = mode => ({ performance: 'Minecraft', vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge' }[mode] || 'Fusion');
export default function Play({ selected, families, activeFamily, artwork, settings, profile, busy, loading, launch, launchGame, cancelLaunch, choose, selecting, navigate, changeBackground, resetBackground, customBackgrounds, importing, news, openArticle }) {
  const [picker, setPicker] = useState(false), [query, setQuery] = useState('');
  const pickerRef = useRef();
  useEffect(() => { if (!picker) return; const close = e => { if (!pickerRef.current?.contains(e.target)) setPicker(false); }; const key = e => { if (e.key === 'Escape') setPicker(false); }; document.addEventListener('mousedown', close); document.addEventListener('keydown', key); return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); }; }, [picker]);
  async function select(version) { await choose(version); setPicker(false); setQuery(''); }
  const currentArt = artwork(activeFamily);
  return <div className="play-dashboard page-enter">
    <div className="quickbar"><span className="quickbar-label">QUICK PLAY</span><div className="version-chips">{families.map(f => <button key={f.id} title={`${f.label} · ${f.preferred}`} aria-label={`Use ${f.preferred}`} aria-pressed={f.id === activeFamily?.id} disabled={busy || selecting || loading} onClick={() => select(f.preferred)}><img src={artwork(f)} alt=""/><span>{f.preferred}</span></button>)}</div></div>
    <section className="launch-hero" aria-label={`Minecraft ${selected}`}>
      {currentArt && <img key={currentArt} className="stage-image hero-art" src={currentArt} alt="Minecraft landscape" fetchPriority="high"/>}<div className="hero-vignette"/>
      <span className="hero-edition">MINECRAFT <span>JAVA EDITION</span></span>
      <div className="hero-art-actions">{customBackgrounds[activeFamily?.id] && <button aria-label="Reset background" title="Reset background" disabled={importing} onClick={() => resetBackground(activeFamily)}><RotateCcw size={17}/></button>}<button className="hero-edit" aria-label="Change background" title="Change background" disabled={importing || !activeFamily} onClick={() => changeBackground(activeFamily)}><ImagePlus size={17}/></button></div>
      <div className="hero-launch-center"><img className="hero-brand" src={`./assets/branding/${settings.accent}.png`} alt="Fusion"/>
        <div className="split-launch" ref={pickerRef}><button className="main-launch" disabled={busy || loading || selecting} onClick={launchGame}>
          {launch.busy ? <LoaderCircle className="spin" size={23}/> : launch.running ? <Check size={23}/> : <PlayIcon size={23} fill="currentColor"/>}<span><strong>{launch.busy ? 'Launching' : launch.running ? 'Game running' : `Launch ${selected}`}</strong><small>{launch.busy ? launch.label : settings.accountMode === 'local' ? `${settings.localName} · Local testing` : profile ? profile.name : 'Choose an account'}</small></span>
        </button><button className="launch-dropdown" aria-label="Choose Minecraft version" aria-expanded={picker} disabled={busy || selecting} onClick={() => setPicker(!picker)}><ChevronDown size={20}/></button>
        {picker && <div className="quick-picker"><label className="picker-search"><Search size={15}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a version" aria-label="Find a version"/></label><div className="picker-options">{families.filter(f => !query || f.id.includes(query) || f.versions?.some(v => v.id.includes(query))).map(f => <section key={f.id}><header><img src={artwork(f)} alt=""/><strong>{f.label}</strong><small>{f.id}</small></header><div>{(f.versions?.length ? f.versions : [{ id: f.preferred }]).filter(v => !query || v.id.includes(query)).map(v => <button key={v.id} disabled={selecting} aria-pressed={selected === v.id} onClick={() => select(v.id)}>{v.id}{selected === v.id && <Check size={12}/>}</button>)}</div></section>)}</div><button className="picker-library" onClick={() => navigate('versions')}>Version library<ArrowUpRight size={13}/></button></div>}
        </div>
        {launch.busy && <div className="hero-progress"><progress max="100" value={launch.progress ?? undefined}/><button onClick={cancelLaunch}>Cancel</button></div>}
      </div>
      <div className="hero-footer"><span>{activeFamily?.label}<b>{selected}</b></span>{['fabric','forge'].includes(settings.launchMode) && <span className="profile-pill"><i/>{profileName(settings.launchMode)}</span>}</div>
    </section>
    <div className="play-lower" hidden={!settings.showNews}><section className="home-news"><div className="section-title"><h2>Latest news</h2><button onClick={() => navigate('news')}>All news<ChevronRight size={13}/></button></div>{news.entries.length ? <NewsCards entries={news.entries.slice(0, 2)} open={openArticle} compact/> : <button className="news-placeholder" onClick={() => navigate('news')}><Newspaper size={25}/><span>Minecraft news<small>{news.cached ? 'Open the feed to refresh saved stories' : 'Loading official stories…'}</small></span><ArrowUpRight size={16}/></button>}</section>

    </div>
  </div>;
}
