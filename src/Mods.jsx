import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import { Search, Download, Package, ChevronRight, Trash2, LoaderCircle, Check, X, Puzzle, ArrowUpRight } from 'lucide-react';
import Modpacks from './Modpacks.jsx';
import BuiltInMods from './BuiltInMods.jsx';
import { profileName } from './Play.jsx';
import './mods.css';
const api = window.fusion;
async function call(promise) { const result = await promise; if (!result.ok) throw new Error(result.error); return result.value; }
export default function Mods(props) {
  const { version, settings, busy, onSettings, chooseVersion } = props;
  const legacy = /^(1\.8|1\.12)(\.|$)/.test(version);
  const [tab, setTab] = useState('browse'), [loader, setLoader] = useState(legacy ? 'forge' : ['fabric','forge'].includes(settings.launchMode) ? settings.launchMode : 'fabric');
  const [query, setQuery] = useState(''), [offset, setOffset] = useState(0), [results, setResults] = useState({ hits: [], total: 0 });
  const [installed, setInstalled] = useState([]), [loading, setLoading] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('');
  const [plan, setPlan] = useState(null), [progress, setProgress] = useState(null);
  const [selectedMods, setSelectedMods] = useState([]);
  useEffect(() => { setSelectedMods([]); setPlan(null); setOffset(0); }, [version, loader]);
  const sequence = useRef(0);
  const modalRef = useRef();
  useEffect(() => {
    if (!plan) return;
    const previous = document.activeElement;
    const key = event => {
      if (event.key === 'Escape' && !pending) setPlan(null);
      if (event.key !== 'Tab') return;
      const buttons = [...(modalRef.current?.querySelectorAll('button:not(:disabled)') || [])];
      if (!buttons.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [plan, pending]);
  useEffect(() => api.onEvent(({ type, data }) => { if (type === 'mod-progress') setProgress(data); }), []);
  useEffect(() => { let active = true; setInstalled([]); setError(''); call(api.installedMods(version, loader)).then(data => { if (active) setInstalled(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [version, loader]);
  useEffect(() => {
    if (tab !== 'browse') return;
    const request = ++sequence.current;
    setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try { const data = await call(api.searchMods({ version, loader, query, offset })); if (request === sequence.current) setResults(data); }
      catch (e) { if (request === sequence.current) { setError(e.message); setResults({ hits: [], total: 0 }); } }
      finally { if (request === sequence.current) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); sequence.current++; };
  }, [version, loader, query, offset, tab]);
  async function perform(fn) { setPending(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setPending(false); setProgress(null); } }
  const preview = () => perform(async () => setPlan(await call(api.planMods({ version, loader, projectIds: selectedMods }))));
  const selectMod = id => setSelectedMods(old => old.includes(id) ? old.filter(value => value !== id) : old.length < 40 ? [...old, id] : old);
  const install = () => perform(async () => {
    try { setInstalled(await call(api.installMods(plan.token))); setSelectedMods([]); } finally { setPlan(null); }
    onSettings(await call(api.saveSettings({ launchMode: loader })));
  });
  const remove = projectId => perform(async () => setInstalled(await call(api.removeMod(version, loader, projectId))));
  const activate = () => perform(async () => onSettings(await call(api.saveSettings({ launchMode: loader }))));
  function switchTab(value) { setTab(value); setError(''); setPlan(null); }
  return <div className="mod-browser page-enter"><header className="page-heading"><div><span className="eyebrow">YOUR LIBRARY</span><h1>Mods</h1></div><button className="secondary" disabled={pending} onClick={chooseVersion}>Minecraft {version}<ChevronRight size={14}/></button></header>
    <div className="mod-tabs" role="tablist" aria-label="Mod sections">{[['browse', 'Discover'], ['installed', 'Installed'], ['packs','Modpacks']].map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} disabled={pending} onClick={() => switchTab(value)}>{label}{value === 'installed' && <span>{installed.length}</span>}</button>)}</div>
    {tab === 'packs' ? <Modpacks version={version} busy={busy} accountMode={settings.accountMode} openAccount={props.openAccount}/> : <>
      <div className="browser-toolbar"><label className="mod-search"><Search size={17}/><input aria-label="Search mods" placeholder="Search mods…" value={query} disabled={pending} onChange={e => { setQuery(e.target.value); setOffset(0); if (tab !== 'browse') setTab('browse'); }}/>{query && <button aria-label="Clear search" onClick={() => { setQuery(''); setOffset(0); }}><X size={14}/></button>}</label><div className="loader-segments" role="group" aria-label="Mod loader">{['fabric', 'forge'].map(value => <button key={value} aria-pressed={loader === value} disabled={pending || busy || (legacy && value === 'fabric')} onClick={() => { setLoader(value); setOffset(0); setPlan(null); }}>{profileName(value)}</button>)}</div></div>
      <div className="profile-notice"><span><i className={settings.launchMode === loader ? 'active-dot' : ''}/>{profileName(loader)} · {version}<small>Fusion features stay enabled with your mods. Each loader keeps its own worlds.</small></span><button className="quiet-button" disabled={pending || busy || settings.launchMode === loader} onClick={activate}>{settings.launchMode === loader ? <><Check size={14}/>Active</> : <>Use {profileName(loader)}<ArrowUpRight size={13}/></>}</button></div>
      {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss mod error"><X size={14}/></button></div>}
      {pending && <div className="download-status" role="status"><LoaderCircle size={16} className="spin"/>{progress ? `Downloading ${progress.name || 'mods'} · ${progress.complete}/${progress.total}` : 'Preparing…'}</div>}
      {selectedMods.length > 0 && <div className="mod-selection-bar"><span><Check size={16}/>{selectedMods.length} selected</span><button className="quiet-button" disabled={pending} onClick={() => setSelectedMods([])}>Clear</button><button className="primary" disabled={pending || busy} onClick={preview}><Download size={15}/>Download selected</button></div>}
      {tab === 'browse' ? <>
        <div className="section-title"><h2>{query ? 'Search results' : 'Popular mods'}</h2><span>{loading ? 'Searching…' : `${results.total.toLocaleString()} results · ${version}`}</span></div>
        {loading ? <div className="mod-results skeleton-results">{[0,1,2,3,4,5].map(i => <div className="mod-result skeleton" key={i}/>)}</div> : <div className="mod-results">{results.hits.map(mod => <article className="mod-result" key={mod.id}><div className="project-icon">{mod.icon ? <img src={mod.icon} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }}/> : <Puzzle size={27}/>}</div><div className="project-info"><h3>{mod.name}</h3><span>by {mod.author}</span><p>{mod.description}</p><small><Download size={12}/>{new Intl.NumberFormat('en', { notation: 'compact' }).format(mod.downloads)} downloads</small></div><label className="mod-select" title={installed.some(m => m.projectId === mod.id) ? "Installed" : "Select for download"}>{installed.some(m => m.projectId === mod.id) ? <Check size={18}/> : <input type="checkbox" aria-label={`Select ${mod.name}`} checked={selectedMods.includes(mod.id)} disabled={pending || busy || (!selectedMods.includes(mod.id) && selectedMods.length >= 40)} onChange={() => selectMod(mod.id)}/>}</label></article>)}</div>}
        {!loading && !results.hits.length && <div className="empty-state"><Search size={26}/><h3>No matching mods</h3><p>Try another search or loader. Results match Minecraft {version}.</p></div>}
        <div className="pagination"><button className="secondary" disabled={offset === 0 || loading || pending} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</button><span>Page {Math.floor(offset / 20) + 1}</span><button className="secondary" disabled={offset + 20 >= results.total || loading || pending} onClick={() => setOffset(offset + 20)}>Next</button></div>
      </> : <><div className="section-title"><h2>{profileName(loader)} mods</h2><span>{installed.length} installed</span></div><div className="installed-list">{installed.map(mod => <article key={mod.projectId}><span className="setup-icon">{mod.icon ? <img className="installed-icon" src={mod.icon} alt="" onError={e => { e.currentTarget.style.display = "none"; }}/> : <Package size={20}/>}</span><div><h3>{mod.name}</h3><p>{mod.versionName} · {mod.root ? 'Mod' : 'Dependency'}</p></div><button className="icon-button" aria-label={`Remove ${mod.name}`} title="Remove mod" disabled={pending || busy} onClick={() => remove(mod.projectId)}><Trash2 size={16}/></button></article>)}</div>{!installed.length && <div className="empty-state"><Package size={32}/><h3>No mods installed</h3><p>Discover mods for {version}. Required dependencies are included automatically.</p><button className="primary" onClick={() => setTab('browse')}>Browse mods</button></div>}</>}
      {tab === 'installed' && <BuiltInMods {...props}/>}
    </>}
    {plan && createPortal(<div className="modal-backdrop"><section ref={modalRef} className="modal install-plan" role="dialog" aria-modal="true" aria-label="Install mods"><header><h2>Install {plan.mods.length} {plan.mods.length === 1 ? 'mod' : 'mods'}</h2><button autoFocus className="icon-button" disabled={pending} aria-label="Cancel install" onClick={() => setPlan(null)}><X size={18}/></button></header><p className="dialog-copy">{profileName(loader)} · Minecraft {version} · {(plan.totalBytes / 1024 / 1024).toFixed(1)} MB<br/>Required dependencies are included. Optional mods are skipped.</p><div className="dependency-list">{plan.mods.map(mod => <div key={mod.projectId}><Package size={16}/><span>{mod.name}<small>{mod.versionName}</small></span><em>{mod.root ? 'Selected' : 'Required'}</em></div>)}</div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary full" disabled={pending || busy} onClick={install}>{pending ? <LoaderCircle size={16} className="spin"/> : <Download size={16}/>} {pending ? progress ? `Downloading ${progress.complete}/${progress.total}` : 'Installing…' : `Install & use ${profileName(loader)}`}</button></section></div>, document.querySelector('.app-shell'))}
  </div>;
}
