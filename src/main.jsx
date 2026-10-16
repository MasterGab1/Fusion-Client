import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Minus, Square, X, ChevronDown, ChevronRight, ArrowLeft, FolderOpen, Terminal, Check, LoaderCircle, RefreshCw, LogOut, ExternalLink, Copy, ImagePlus, UserRound, AlertCircle, Layers, Settings2, Cpu, Coffee, Box, ArrowUpRight, Shirt, Puzzle, Newspaper } from 'lucide-react';
import './styles.css';
import './dashboard.css';
import './sidebar.css';
const Skins = lazy(() => import('./Skins.jsx'));
const Settings = lazy(() => import('./Settings.jsx'));
const Mods = lazy(() => import('./Mods.jsx'));
import './settings.css';
import './compact.css';
import Versions from './Versions.jsx';
import Updates from './Updates.jsx';
import PlayPage from './Play.jsx';
import News, { useNews } from './News.jsx';
import './refresh.css';
import './polish.css';
import Output from './Output.jsx';

const api = window.fusion;
async function call(promise) {
  const result = await promise;
  if (!result?.ok) throw new Error(result?.error || 'Open Fusion as a desktop application.');
  return result.value;
}
const startupAppearance = api?.appearance || { accent: 'pink', reducedMotion: false };
function Logo({ accent = startupAppearance.accent }) { return <img key={accent} src={`./assets/branding/${accent}.png`} className="logo" alt="Fusion"/>; }
function Microsoft() { return <span className="ms-logo" aria-hidden="true"><i/><i/><i/><i/></span>; }
function Modal({ title, close, children, className = '' }) {
  const ref = useRef();
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.querySelector('button,input')?.focus();
    const keydown = e => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const items = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
        if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className={`modal ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={18}/></button></header>{children}</section></div>;
}
function App() {
  const [state, setState] = useState(null), [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState('1.8.9'), [page, setPage] = useState('play');
  const [folder, setFolder] = useState(null), [candidate, setCandidate] = useState('');
  const [draft, setDraft] = useState(null), [saving, setSaving] = useState(false), [saved, setSaved] = useState(true);
  const [dialog, setDialog] = useState(null), [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [localName,setLocalName] = useState('FusionTester'), [accountPane,setAccountPane] = useState('microsoft');
  const [booting, setBooting] = useState(true), [official, setOfficial] = useState(null), [preparingOfficial, setPreparingOfficial] = useState(false);
  const [error, setError] = useState(''), [logs, setLogs] = useState([]), [showLogs, setShowLogs] = useState(false);
  const [launch, setLaunch] = useState({ busy: false, running: false, label: '', progress: null });
  const [importing, setImporting] = useState(false), [selecting, setSelecting] = useState(false);
  const [update, setUpdate] = useState(null);
  const { news, loading: newsLoading, refresh: refreshNews } = useNews();
  const logEnd = useRef();
  const draftRef = useRef(null), saveRevision = useRef(0), settingsQueue = useRef(Promise.resolve());
  useEffect(() => { if(!state) return; const timer=setTimeout(()=>setBooting(false),state.settings.startupAnimation && !state.settings.reducedMotion ? 500 : 0);return ()=>clearTimeout(timer); },[!!state]);
  async function prepareOfficial() {
    setPreparingOfficial(true); setAuthError('');
    try { setOfficial(await call(api.prepareOfficial(selected))); }
    catch(e) { setAuthError(e.message); }
    finally { setPreparingOfficial(false); setLaunch(old=>({...old,busy:false})); }
  }
  function editSettings(updater) {
    const previous = draftRef.current || draft;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => previous[key] !== value));
    draftRef.current = next; setDraft(next); setSaved(false);
    if (!Object.keys(patch).length) return;
    const revision = ++saveRevision.current;
    setSaving(true);
    const request = call(api.saveSettings(patch));
    settingsQueue.current = request.then(settings => {
      setState(old => ({ ...old, settings }));
      if (revision === saveRevision.current) { draftRef.current = settings; setDraft(settings); setSaved(true); }
    }).catch(e => { setError('Settings were not saved: ' + e.message); }).finally(() => { if (revision === saveRevision.current) setSaving(false); });
  }
  const families = catalog?.families || state?.families || [];
  const activeFamily = families.find(f => selected === f.id || selected.startsWith(`${f.id}.`));
  const openFamily = families.find(f => f.id === folder);
  const profile = state?.profile, busy = launch.busy || launch.running;
  const artwork = family => state?.backgrounds?.[family?.id] || family?.artwork;
  const activeArt = artwork(activeFamily);
  const activeVersion = catalog?.versions.find(v => v.id === selected);
  const releaseDate = activeVersion && new Date(activeVersion.releaseTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  async function action(fn) { try { return await fn(); } catch (e) { setError(e.message); } }
  const openLink = key => action(() => call(api.openLink(key)));
  async function loadVersions(refresh = false) {
    setLoading(true); setLoadError('');
    try { const data = await call(api.getVersions(refresh !== false)); setCatalog(data); setSelected(old => data.versions.some(v => v.id === old) ? old : '1.8.9'); }
    catch (e) { setLoadError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!api) { setError('Open Fusion as a desktop application.'); return; }
    const off = api.onEvent(({ type, data }) => {
      if (type === 'update') setUpdate(data);
      if (type === 'account') setState(old => ({ ...old, profile: data }));
      if (type === 'discord') setState(old => old ? ({ ...old, discord: data }) : old);
      if (type === 'launch-status') setLaunch(data);
      if (type === 'log') { setLogs(old => [...old, data].slice(-400)); if(data.level === 'error' && draftRef.current?.outputAutoOpen)setShowLogs(true); }
    });
    call(api.getUpdates()).then(setUpdate).catch(e => setError(e.message));
    call(api.getState()).then(data => { setState(data); setDraft(data.settings); draftRef.current = data.settings; setSelected(data.settings.selectedVersion); setLogs(data.logs); loadVersions(); }).catch(e => setError(e.message));
    return off;
  }, []);
  useEffect(() => { if (showLogs) logEnd.current?.scrollIntoView(); }, [logs, showLogs]);
  function navigate(next) { setPage(next); setFolder(null); setError(''); }
  function enterFamily(family) {
    setPage('versions');
    setFolder(family.id);
    const preferred = family.preferred;
    setCandidate(activeFamily?.id === family.id ? selected : preferred);
  }
  async function choose(version = candidate) {
    if (!version || busy || selecting) return;
    setSelecting(true);
    await action(async () => {
      await settingsQueue.current;
      const compatibleMode = state.settings.launchMode === 'fabric' && /^(1\.8|1\.12)(\.|$)/.test(version) ? 'forge' : state.settings.launchMode;
      const settings = await call(api.saveSettings({ selectedVersion: version, launchMode: compatibleMode }));
      setSelected(version); setState(old => ({ ...old, settings })); setDraft(settings); draftRef.current = settings;
      setPage('play'); setFolder(null);
    });
    setSelecting(false);
  }
  async function changeBackground(family) {
    setImporting(true);
    await action(async () => { const backgrounds = await call(api.pickBackground(family.id)); if (backgrounds) setState(old => ({ ...old, backgrounds })); });
    setImporting(false);
  }
  async function resetBackground(family) {
    setImporting(true);
    await action(async () => { const backgrounds = await call(api.resetBackground(family.id)); setState(old => ({ ...old, backgrounds })); });
    setImporting(false);
  }
  function openAccount() { setAccountPane(draft?.accountMode === 'local' ? 'local' : 'microsoft'); setLocalName(draft?.localName || 'FusionTester'); setAuthError(''); setDialog('account'); }
  async function closeAccount() { if (signingIn) await action(() => call(api.cancelSignIn())); setDialog(null); }
  async function useLocal() {
    setAuthError('');
    try { const settings = await call(api.saveSettings({accountMode:'local',localName:localName.trim()}));setState(old=>({...old,settings}));setDraft(settings);draftRef.current=settings;setDialog(null); } catch(e) { setAuthError(e.message); }
  }
  async function signIn() {
    setSigningIn(true); setAuthError('');
    try { await call(api.signIn()); const settings = await call(api.saveSettings({accountMode:'microsoft'}));setState(old=>({...old,settings}));setDraft(settings);draftRef.current=settings;setDialog(null); return true; }
    catch (e) { if (!e.message.toLowerCase().includes('cancelled')) setAuthError(e.message); }
    finally { setSigningIn(false); }
  }
  async function launchGame() {
    if (busy || signingIn) return;
    await settingsQueue.current;
    if (!profile && draftRef.current?.accountMode !== 'local') { setDialog('account'); return; }
    setLaunch({ busy: true, running: false, label: 'Preparing launch', progress: null });
    try { await call(api.launch(selected)); }
    catch (e) {
      setError(e.message);
      setLaunch({ busy: false, running: false, label: 'Launch failed', progress: null });
    }
  }
  async function saveSettings() {
    await settingsQueue.current;
    setSaving(true);
    await action(async () => { const settings = await call(api.saveSettings(draftRef.current || draft)); setState(old => ({ ...old, settings })); setDraft(settings); draftRef.current = settings; setSaved(true); });
    setSaving(false);
  }
  const versionRows = openFamily?.versions || [];
  return <div className={`app-shell ${(draft?.reducedMotion ?? startupAppearance.reducedMotion) ? 'reduced-motion' : ''}`} data-accent={draft?.accent || startupAppearance.accent}>
    {booting && !error && <div className="startup-screen" role="status"><div className="startup-emblem"><Logo accent={draft?.accent}/></div><span>FUSION</span><div className="startup-line"/></div>}
    <header className="titlebar"><div className="wordmark"><Logo accent={state?.settings.accent}/><span>FUSION</span></div><span className="titlebar-edition">MINECRAFT: JAVA EDITION</span><div className="titlebar-right"><button className="account-button" onClick={openAccount}><span className="account-avatar">{profile || draft?.accountMode === 'local' ? <UserRound size={17}/> : <Microsoft/>}</span><span><strong>{draft?.accountMode === 'local' ? draft.localName : profile?.name || 'Sign in'}</strong><small>{draft?.accountMode === 'local' ? 'Local testing' : 'Microsoft account'}</small></span><ChevronDown size={13}/></button><div className="window-buttons"><button aria-label="Minimize" onClick={() => api.windowAction('minimize')}><Minus size={15}/></button><button aria-label="Maximize" onClick={() => api.windowAction('maximize')}><Square size={12}/></button><button aria-label="Close launcher" onClick={() => api.windowAction('close')}><X size={16}/></button></div></div></header>
    <nav className="sidebar" aria-label="Main navigation">{[['play', Play], ['versions', Layers], ['skins', Shirt], ['mods', Puzzle], ['news', Newspaper], ['settings', Settings2]].map(([item, Icon]) => <button key={item} className={`rail-button ${page === item ? 'active' : ''} ${item === 'settings' ? 'rail-bottom' : ''}`} aria-label={item[0].toUpperCase() + item.slice(1)} aria-current={page === item ? 'page' : undefined} onClick={() => navigate(item)}><Icon size={21}/><span className="rail-tooltip" role="tooltip">{item[0].toUpperCase() + item.slice(1)}</span></button>)}</nav>
    <main className={page === 'play' ? 'play-page' : 'content-page'}>
      {page === 'skins' && <Suspense fallback={<div className="loading"><LoaderCircle size={18} className="spin"/>Loading skins</div>}><Skins settings={draft} profile={draft?.accountMode === 'local' ? null : profile} busy={busy} openAccount={openAccount}/></Suspense>}
      {page === 'play' && state && <PlayPage selected={selected} families={families} activeFamily={activeFamily} artwork={artwork} settings={state.settings} profile={profile} busy={busy || signingIn} loading={loading || !activeVersion} launch={launch} launchGame={launchGame} cancelLaunch={() => action(() => call(api.cancelLaunch()))} choose={choose} selecting={selecting} navigate={navigate} changeBackground={changeBackground} resetBackground={resetBackground} customBackgrounds={state?.backgrounds || {}} importing={importing} news={news} openArticle={url => action(() => call(api.openArticle(url)))}/>}
      {page === 'play' && loadError && <div className="inline-error"><AlertCircle size={16}/><span>{loadError}</span><button onClick={loadVersions}>Retry</button></div>}
      {page === 'news' && <News news={news} accent={state?.settings.accent} loading={newsLoading} refresh={refreshNews} open={url => action(() => call(api.openArticle(url)))}/>}
      {page === 'versions' && <Versions families={families} selected={selected} folder={folder} candidate={candidate} setCandidate={setCandidate} enterFamily={enterFamily} back={() => setFolder(null)} choose={choose} artwork={artwork} loading={loading} loadError={loadError} refresh={loadVersions} busy={busy} selecting={selecting} importing={importing} changeBackground={changeBackground} resetBackground={resetBackground} customBackgrounds={state?.backgrounds || {}}/>}
      {page === 'settings' && draft && <Suspense fallback={<div className="loading">Loading settings</div>}><Settings state={state} openUpdates={() => setDialog('updates')} draft={draft} setDraft={editSettings} save={saveSettings} saving={saving} saved={saved} busy={busy || signingIn} browseJava={() => action(async () => { const file = await call(api.pickJava()); if (file) editSettings(old => ({ ...old, javaPath: file })); })} openFolder={() => action(() => call(api.openFolder()))}/></Suspense>}
      {page === 'mods' && state && <Suspense fallback={<div className="loading">Loading mods</div>}><Mods openAccount={openAccount} key={selected} version={selected} settings={state.settings} busy={busy || signingIn} chooseVersion={() => navigate('versions')} onSettings={settings => { setState(old => ({ ...old, settings })); setDraft(settings); draftRef.current = settings; }}/></Suspense>}
    </main>
    <footer className="statusbar"><button className={showLogs ? 'active' : ''} onClick={() => setShowLogs(!showLogs)}><Terminal size={14}/>Output{logs.some(log => log.level === 'error') && <span className="error-dot"/>}</button><button title="Open game folder" aria-label="Open game folder" onClick={() => action(() => call(api.openFolder()))}><FolderOpen size={14}/></button><button className={['available', 'ready'].includes(update?.status) ? 'update-status has-update' : 'update-status'} onClick={() => setDialog('updates')}><RefreshCw size={12}/>{update?.status === 'ready' ? 'Restart to update' : update?.status === 'available' ? 'Update available' : update?.status === 'downloading' ? 'Downloading update' : 'Updates'}</button><span className="status-version">{state?.appVersion || '0.8.0'}</span></footer>
    {showLogs && <Output logs={logs} clear={()=>setLogs([])} close={()=>setShowLogs(false)} settings={draft} save={editSettings}/>}
    {error && <div className="error-toast" role="status"><AlertCircle size={17}/><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
    {dialog === 'account' && <Modal title="Account" className="account-modal" close={closeAccount}>
      <div className="account-tabs" role="tablist" aria-label="Account type"><button role="tab" aria-selected={accountPane==='microsoft'} disabled={signingIn||preparingOfficial} onClick={()=>setAccountPane('microsoft')}><Microsoft/>Microsoft</button><button role="tab" aria-selected={accountPane==='local'} disabled={signingIn||preparingOfficial} onClick={()=>setAccountPane('local')}><UserRound size={16}/>Local testing</button></div>
      {accountPane==='microsoft' ? <>
        {profile ? <><div className="account-summary"><UserRound size={25}/><div><strong>{profile.name}</strong><span>Minecraft: Java Edition</span></div></div>{draft?.accountMode==='local'&&<button className="primary full" disabled={busy} onClick={()=>{editSettings(old=>({...old,accountMode:'microsoft'}));setDialog(null);}}>Use Microsoft account</button>}<button className="secondary full" onClick={()=>openLink('account')}>Manage profile<ExternalLink size={15}/></button><button className="quiet-button full signout" disabled={busy} onClick={()=>action(async()=>{await call(api.signOut());setDialog(null);})}><LogOut size={15}/>Sign out</button></> : <><p className="dialog-copy">{signingIn?'Complete sign-in in your browser. Fusion will continue automatically.':'Sign in with the Microsoft account that owns Minecraft: Java Edition.'}</p><button className="primary full" disabled={signingIn||busy} onClick={signIn}>{signingIn?<LoaderCircle size={16} className="spin"/>:<Microsoft/>}{signingIn?'Waiting for Microsoft…':'Continue with Microsoft'}</button><button className="signin-help quiet-button full" onClick={()=>openLink('signin-help')}>Having trouble signing in?</button><details className="official-signin"><summary>Use the official Minecraft Launcher instead</summary><p>Close Minecraft Launcher first. Prepare an installation here, then play it from Minecraft Launcher using its account sign-in.</p><button className="secondary full" disabled={signingIn||busy||preparingOfficial} onClick={prepareOfficial}>{preparingOfficial?<LoaderCircle size={15} className="spin"/>:<ExternalLink size={15}/>}Prepare Fusion installation</button>{preparingOfficial&&<p role="status">{launch.label}</p>}{official&&<p role="status">Ready: Minecraft Launcher → Installations → {official.name}. Enable “Modded” if hidden.</p>}</details></>}
      </> : <div className="local-signin"><h3>Test Fusion in game</h3><p>Play singleplayer and try the in-game menu without Microsoft sign-in. Online-mode servers and account skin uploads require a Microsoft account.</p><label htmlFor="local-player">Player name</label><input id="local-player" value={localName} maxLength={16} onChange={e=>setLocalName(e.target.value)}/><button className="primary full" disabled={busy||signingIn} onClick={useLocal}><Play size={15}/>Use local profile</button></div>}
      {authError&&<p className="auth-error" role="alert">{authError}</p>}
    </Modal>}
    {dialog === 'updates' && <Modal title="Updates" className="updates-modal" close={() => setDialog(null)}><Updates update={update} busy={busy || signingIn} perform={method => action(async () => setUpdate(await call(api[method]())))} openLink={openLink}/></Modal>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
