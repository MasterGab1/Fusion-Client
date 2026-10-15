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

const api = window.fusion;
async function call(promise) {
  const result = await promise;
  if (!result?.ok) throw new Error(result?.error || 'Open Fusion as a desktop application.');
  return result.value;
}
function Logo({ accent = 'pink' }) { return <img key={accent} src={`./assets/branding/${accent}.png`} className="logo" alt="Fusion"/>; }
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
  const [error, setError] = useState(''), [logs, setLogs] = useState([]), [showLogs, setShowLogs] = useState(false);
  const [launch, setLaunch] = useState({ busy: false, running: false, label: '', progress: null });
  const [importing, setImporting] = useState(false), [selecting, setSelecting] = useState(false);
  const [update, setUpdate] = useState(null);
  const { news, loading: newsLoading, refresh: refreshNews } = useNews();
  const logEnd = useRef();
  const draftRef = useRef(null), saveRevision = useRef(0), settingsQueue = useRef(Promise.resolve());
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
      if (type === 'log') setLogs(old => [...old, data].slice(-400));
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
  function openAccount() { setAuthError(''); setDialog('account'); }
  async function closeAccount() { if (signingIn) await action(() => call(api.cancelSignIn())); setDialog(null); }
  async function signIn() {
    setSigningIn(true); setAuthError('');
    try { await call(api.signIn()); setDialog(null); return true; }
    catch (e) { if (!e.message.toLowerCase().includes('cancelled')) setAuthError(e.message); }
    finally { setSigningIn(false); }
  }
  async function launchGame() {
    if (busy || signingIn) return;
    if (!profile) { setDialog('account'); if (!await signIn()) return; }
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
  return <div className={`app-shell ${draft?.reducedMotion ? 'reduced-motion' : ''}`} data-accent={draft?.accent || 'pink'}>
    {!state && !error && <div className="startup-screen" role="status"><Logo/><span>FUSION</span><div className="startup-line"/></div>}
    <header className="titlebar"><div className="wordmark"><Logo accent={state?.settings.accent}/><span>FUSION</span></div><span className="titlebar-edition">MINECRAFT: JAVA EDITION</span><div className="titlebar-right"><button className="account-button" onClick={openAccount}><span className="account-avatar">{profile ? <UserRound size={17}/> : <Microsoft/>}</span><span><strong>{profile?.name || 'Sign in'}</strong><small>Microsoft account</small></span><ChevronDown size={13}/></button><div className="window-buttons"><button aria-label="Minimize" onClick={() => api.windowAction('minimize')}><Minus size={15}/></button><button aria-label="Maximize" onClick={() => api.windowAction('maximize')}><Square size={12}/></button><button aria-label="Close launcher" onClick={() => api.windowAction('close')}><X size={16}/></button></div></div></header>
    <nav className="sidebar" aria-label="Main navigation">{[['play', Play], ['versions', Layers], ['skins', Shirt], ['mods', Puzzle], ['news', Newspaper], ['settings', Settings2]].map(([item, Icon]) => <button key={item} className={`rail-button ${page === item ? 'active' : ''} ${item === 'settings' ? 'rail-bottom' : ''}`} aria-label={item[0].toUpperCase() + item.slice(1)} aria-current={page === item ? 'page' : undefined} onClick={() => navigate(item)}><Icon size={21}/><span className="rail-tooltip" role="tooltip">{item[0].toUpperCase() + item.slice(1)}</span></button>)}</nav>
    <main className={page === 'play' ? 'play-page' : 'content-page'}>
      {page === 'skins' && <Suspense fallback={<div className="loading"><LoaderCircle size={18} className="spin"/>Loading skins</div>}><Skins profile={profile} busy={busy} openAccount={openAccount}/></Suspense>}
      {page === 'play' && state && <PlayPage selected={selected} families={families} activeFamily={activeFamily} artwork={artwork} settings={state.settings} profile={profile} busy={busy || signingIn} loading={loading || !activeVersion} launch={launch} launchGame={launchGame} cancelLaunch={() => action(() => call(api.cancelLaunch()))} choose={choose} selecting={selecting} navigate={navigate} changeBackground={changeBackground} resetBackground={resetBackground} customBackgrounds={state?.backgrounds || {}} importing={importing} news={news} openArticle={url => action(() => call(api.openArticle(url)))}/>}
      {page === 'play' && loadError && <div className="inline-error"><AlertCircle size={16}/><span>{loadError}</span><button onClick={loadVersions}>Retry</button></div>}
      {page === 'news' && <News news={news} accent={state?.settings.accent} loading={newsLoading} refresh={refreshNews} open={url => action(() => call(api.openArticle(url)))}/>}
      {page === 'versions' && <Versions families={families} selected={selected} folder={folder} candidate={candidate} setCandidate={setCandidate} enterFamily={enterFamily} back={() => setFolder(null)} choose={choose} artwork={artwork} loading={loading} loadError={loadError} refresh={loadVersions} busy={busy} selecting={selecting} importing={importing} changeBackground={changeBackground} resetBackground={resetBackground} customBackgrounds={state?.backgrounds || {}}/>}
      {page === 'settings' && draft && <Suspense fallback={<div className="loading">Loading settings</div>}><Settings state={state} openUpdates={() => setDialog('updates')} draft={draft} setDraft={editSettings} save={saveSettings} saving={saving} saved={saved} busy={busy || signingIn} browseJava={() => action(async () => { const file = await call(api.pickJava()); if (file) editSettings(old => ({ ...old, javaPath: file })); })} openFolder={() => action(() => call(api.openFolder()))}/></Suspense>}
      {page === 'mods' && state && <Suspense fallback={<div className="loading">Loading mods</div>}><Mods key={selected} version={selected} settings={state.settings} busy={busy || signingIn} chooseVersion={() => navigate('versions')} onSettings={settings => { setState(old => ({ ...old, settings })); setDraft(settings); draftRef.current = settings; }}/></Suspense>}
    </main>
    <footer className="statusbar"><button className={showLogs ? 'active' : ''} onClick={() => setShowLogs(!showLogs)}><Terminal size={14}/>Output{logs.some(log => log.level === 'error') && <span className="error-dot"/>}</button><button title="Open game folder" aria-label="Open game folder" onClick={() => action(() => call(api.openFolder()))}><FolderOpen size={14}/></button><button className={['available', 'ready'].includes(update?.status) ? 'update-status has-update' : 'update-status'} onClick={() => setDialog('updates')}><RefreshCw size={12}/>{update?.status === 'ready' ? 'Restart to update' : update?.status === 'available' ? 'Update available' : update?.status === 'downloading' ? 'Downloading update' : 'Updates'}</button><span className="status-version">{state?.appVersion || '0.8.0'}</span></footer>
    {showLogs && <section className="logs-panel"><header><h2>Output</h2><button className="quiet-button" onClick={() => setLogs([])}>Clear</button><button className="icon-button" aria-label="Close output" onClick={() => setShowLogs(false)}><X size={16}/></button></header><div className="logs-content">{logs.map((entry, i) => <div key={i} className={`log-line ${entry.level}`}><time>{new Date(entry.time).toLocaleTimeString('en-GB')}</time><span>{entry.message}</span></div>)}<div ref={logEnd}/></div></section>}
    {error && <div className="error-toast" role="status"><AlertCircle size={17}/><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
    {dialog === 'account' && <Modal title={profile ? 'Account' : 'Microsoft sign-in'} close={closeAccount}>
      {profile ? <><div className="account-summary"><UserRound size={25}/><div><strong>{profile.name}</strong><span>Minecraft: Java Edition</span></div></div><button className="secondary full" onClick={() => openLink('account')}>Manage profile<ExternalLink size={15}/></button><button className="quiet-button full signout" disabled={busy} onClick={() => action(async () => { await call(api.signOut()); setDialog(null); })}><LogOut size={15}/>Sign out</button></> : <><div className="signin-brand"><Logo accent={state?.settings.accent}/></div><p className="dialog-copy">{signingIn ? 'Complete sign-in in your browser. Fusion will continue automatically.' : 'Sign in with the Microsoft account that owns Minecraft: Java Edition.'}</p><button className="primary full" disabled={signingIn} onClick={signIn}>{signingIn ? <LoaderCircle size={16} className="spin"/> : <Microsoft/>}{signingIn ? 'Waiting for Microsoft…' : 'Continue with Microsoft'}</button></>}
      {!profile && <button className="signin-help quiet-button full" onClick={() => openLink('signin-help')}>Having trouble signing in?</button>}
      {authError && <p className="auth-error" role="alert">{authError}</p>}
    </Modal>}
    {dialog === 'updates' && <Modal title="Updates" className="updates-modal" close={() => setDialog(null)}><Updates update={update} busy={busy || signingIn} perform={method => action(async () => setUpdate(await call(api[method]())))} openLink={openLink}/></Modal>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
