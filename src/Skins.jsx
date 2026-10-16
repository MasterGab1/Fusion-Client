import React, { useEffect, useRef, useState } from 'react';
import { SkinViewer, WalkingAnimation } from 'skinview3d';
import { Upload, Download, Search, RotateCw, RotateCcw, Footprints, Layers, Check, LoaderCircle, AlertCircle, UserRound, Trash2 } from 'lucide-react';
import './skins.css';

const api = window.fusion;
async function invoke(promise) {
  const result = await promise;
  if (!result?.ok) throw new Error(result?.error || 'The skin operation failed.');
  return result.value;
}
function Preview({ skin, model, autoRotate }) {
  const container = useRef(), canvas = useRef(), viewer = useRef(), loadQueue = useRef(Promise.resolve());
  const [error, setError] = useState(''), [ready, setReady] = useState(false);
  const [rotate, setRotate] = useState(!!autoRotate), [walk, setWalk] = useState(false), [layers, setLayers] = useState(true);
  useEffect(() => {
    let scene;
    try {
      scene = new SkinViewer({ canvas: canvas.current, width: 400, height: 430, pixelRatio: Math.min(devicePixelRatio, 1.5), zoom: .78, renderPaused: true });
      viewer.current = scene;
      scene.camera.position.set(25, 9, 55);
      scene.controls.enableDamping = false;
      scene.controls.minDistance = 35;
      scene.controls.maxDistance = 95;
      scene.controls.update();
      const render = () => { if (!scene.disposed) scene.render(); };
      scene.controls.addEventListener('change', render);
      const observer = new ResizeObserver(([entry]) => { scene.setSize(entry.contentRect.width, entry.contentRect.height); render(); });
      observer.observe(container.current);
      return () => { observer.disconnect(); scene.controls.removeEventListener('change', render); scene.dispose(); viewer.current = null; };
    } catch { scene?.dispose(); setError('3D preview is unavailable on this device. You can still import and download skins.'); }
  }, []);
  useEffect(() => {
    if (!skin || !viewer.current) return;
    let cancelled = false; const scene = viewer.current;
    setReady(false); setError('');
    loadQueue.current = loadQueue.current.catch(() => {}).then(() => {
      if (cancelled || scene.disposed) return;
      return scene.loadSkin(skin.dataUrl, { model: model === 'slim' ? 'slim' : 'default' });
    }).then(() => {
      if (cancelled || scene.disposed) return;
      scene.playerObject.skin.setOuterLayerVisible(layers);
      scene.render(); setReady(true);
    }).catch(() => { if (!cancelled) setError('This skin could not be displayed. Try importing another PNG.'); });
    return () => { cancelled = true; };
  }, [skin?.id, model]);
  useEffect(() => {
    const scene = viewer.current; if (!scene) return;
    scene.autoRotate = rotate;
    scene.animation = walk ? new WalkingAnimation() : null;
    if (!walk) scene.playerObject.skin.resetJoints();
    scene.playerObject.skin.setOuterLayerVisible(layers);
    const visibility = () => { scene.renderPaused = document.hidden || !(rotate || walk); if (!document.hidden) scene.render(); };
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [rotate, walk, layers]);
  function reset() {
    const scene = viewer.current; if (!scene) return;
    setRotate(false); setWalk(false);
    scene.playerObject.rotation.set(0, 0, 0); scene.playerWrapper.rotation.set(0, 0, 0); scene.camera.position.set(25, 9, 55);
    scene.controls.target.set(0, 0, 0); scene.controls.update(); scene.render();
  }
  return <section className="skin-preview" aria-label="3D skin preview">
    <header><span>3D PREVIEW</span><span>{model === 'slim' ? 'Slim' : 'Classic'}</span></header>
    <div className="skin-viewport" ref={container} data-ready={ready}>
      <div className="skin-floor"/><canvas ref={canvas} aria-label="Drag to rotate the skin; scroll to zoom"/>
      {error && <div className="preview-error"><AlertCircle size={19}/>{error}</div>}
    </div>
    <p className="preview-hint">Drag to rotate <span>·</span> Scroll to zoom</p>
    <div className="preview-toolbar">
      <button title="Auto rotate" aria-label="Auto rotate" aria-pressed={rotate} onClick={() => setRotate(!rotate)}><RotateCw size={17}/></button>
      <button title="Walking animation" aria-label="Walking animation" aria-pressed={walk} onClick={() => setWalk(!walk)}><Footprints size={17}/></button>
      <button title="Outer layer" aria-label="Outer layer" aria-pressed={layers} onClick={() => setLayers(!layers)}><Layers size={17}/></button>
      <span/><button title="Reset view" aria-label="Reset view" onClick={reset}><RotateCcw size={17}/></button>
    </div>
  </section>;
}
export default function Skins({ profile, busy: gameBusy, openAccount, settings }) {
  const [library, setLibrary] = useState(null), [selected, setSelected] = useState('default'), [model, setModel] = useState('classic');
  const [username, setUsername] = useState(''), [pending, setPending] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('');
  const skin = library?.skins.find(s => s.id === selected);
  function update(data) { if (data) { setLibrary(data); setSelected(data.selected); setModel(data.model); } }
  async function run(label, fn) {
    setPending(label); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setPending(''); }
  }
  useEffect(() => { run('Loading', async () => update(await invoke(api.getSkins()))); }, []);
  async function select(id, variant) {
    await run('Selecting', async () => { await invoke(api.selectSkin(id, variant)); setSelected(id); setModel(variant); setLibrary(old => ({ ...old, skins: old.skins.map(item => item.id === id ? { ...item, model: variant } : item) })); });
  }
  async function lookup(event) {
    event.preventDefault();
    await run('Looking up', async () => { update(await invoke(api.lookupSkin(username.trim()))); setNotice('Skin added to your library.'); });
  }
  return <>
    <header className="page-heading skins-heading"><div><h1>Skins</h1><span>Java Edition</span></div><button className="secondary" disabled={!!pending} onClick={() => run('Importing', async () => update(await invoke(api.importSkin())))}><Upload size={15}/>Import PNG</button></header>
    <div className="skins-layout">
      <Preview skin={skin} model={model} autoRotate={settings?.skinAutoRotate && !settings?.reducedMotion}/>
      <div className="skin-inspector">
        <section className="skin-details">
          <header><div><span className="field-label">Selected skin</span><h2>{skin?.name || 'Loading…'}</h2><p>{skin?.source || 'Local library'}{skin && <> <span>·</span> {skin.width} × {skin.height}</>}</p></div><button className="icon-button" title="Load my account skin" aria-label="Load my account skin" disabled={!!pending || !profile} onClick={() => run('Loading account skin', async () => update(await invoke(api.currentSkin())))}><UserRound size={18}/></button></header>
          <div className="model-selector" role="group" aria-label="Arm model"><button aria-pressed={model === 'classic'} disabled={!!pending || !skin} onClick={() => select(selected, 'classic')}><span className="arm-symbol classic"/><span>Classic<small>4 px arms</small></span>{model === 'classic' && <Check size={14}/>}</button><button aria-pressed={model === 'slim'} disabled={!!pending || !skin || skin.height === 32} onClick={() => select(selected, 'slim')}><span className="arm-symbol slim"/><span>Slim<small>3 px arms</small></span>{model === 'slim' && <Check size={14}/>}</button></div>
          <div className="skin-actions"><button className="primary" disabled={!!pending || !skin || gameBusy} onClick={() => { if (!profile) return openAccount(); run('Applying', async () => { const result = await invoke(api.applySkin(selected, model)); setNotice(`Skin applied to ${result.name}. Relaunch Minecraft to see it.`); }); }}>{pending === 'Applying' ? <LoaderCircle size={15} className="spin"/> : <Check size={15}/>} {!profile ? 'Sign in to apply' : 'Apply skin'}</button><button className="secondary" disabled={!!pending || !skin} onClick={() => run('Saving', async () => { if (await invoke(api.exportSkin(selected))) setNotice('PNG downloaded.'); })}><Download size={15}/>Download PNG</button></div>
        </section>
        <section className="skin-downloader"><h2>Download a player's skin</h2><form onSubmit={lookup}><div><Search size={15}/><input aria-label="Minecraft username" placeholder="Minecraft username" value={username} onChange={e => setUsername(e.target.value)} maxLength={16} spellCheck="false" autoComplete="off"/></div><button className="secondary" disabled={!!pending || !username.trim()} type="submit">{pending === 'Looking up' ? <LoaderCircle size={15} className="spin"/> : 'Load skin'}</button></form></section>
        <section className="skin-library"><header><h2>Library</h2>{skin && selected !== 'default' && <button className="icon-button" aria-label="Remove saved skin" title="Remove saved skin" disabled={!!pending} onClick={() => run('Removing', async () => { update(await invoke(api.removeSkin(selected))); setNotice('Removed from your library.'); })}><Trash2 size={14}/></button>}<span>{library?.skins.length || 0}</span></header><input className="skin-library-search" aria-label="Filter saved skins" placeholder="Find a saved skin…" value={filter} onChange={e=>setFilter(e.target.value)}/><div className="skin-library-list">{library?.skins.filter(item=>item.name.toLowerCase().includes(filter.toLowerCase())).map(item => <button key={item.id} aria-label={`Preview ${item.name}`} aria-pressed={selected === item.id} disabled={!!pending} onClick={() => select(item.id, item.model)}><span className="skin-face" style={{ backgroundImage: `url(${item.dataUrl})`, backgroundSize: `800% ${item.height === 32 ? 400 : 800}%`, backgroundPosition: `14.2857% ${item.height === 32 ? 33.3333 : 14.2857}%` }}/><span><strong>{item.name}</strong><small>{item.model === 'slim' ? 'Slim' : 'Classic'}</small></span>{selected === item.id && <Check size={14}/>}</button>)}</div></section>
        {(error || notice || pending) && <div className={`skin-feedback ${error ? 'is-error' : ''}`} role="status">{error ? <AlertCircle size={15}/> : pending ? <LoaderCircle size={15} className="spin"/> : <Check size={15}/>}<span>{error || (pending ? `${pending}…` : notice)}</span>{error && !library && <button onClick={() => run('Loading', async () => update(await invoke(api.getSkins())))}>Retry</button>}</div>}
      </div>
    </div>
  </>;
}
