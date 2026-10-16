import React, { useState } from 'react';
import { Check, FolderOpen, Monitor, Cpu, Settings2, Palette } from 'lucide-react';
import './settings.css';
export default function Settings({ state, draft, setDraft, save, saving, saved, busy, browseJava, openFolder, openUpdates }) {
  const [tab, setTab] = useState('game');
  const set = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const toggle = (key, label) => <div className="setting-row"><label htmlFor={key}>{label}</label><input className="switch" id={key} type="checkbox" checked={!!draft[key]} onChange={e => set(key, e.target.checked)}/></div>;
  const range = (key, label, min, max, step, unit) => <div className="setting-row"><label htmlFor={key}>{label}</label><div className="memory-control"><output>{draft[key]} {unit}</output><input id={key} type="range" min={min} max={max} step={step} value={draft[key]} onChange={e => set(key, Number(e.target.value))}/></div></div>;
  return <>
    <header className="page-heading settings-heading"><div><h1>Settings</h1></div><button className="quiet-button save-status" disabled={busy || saving} onClick={save}><Check size={14}/>{saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}</button></header>
    <div className="preferences-tabs" role="tablist" aria-label="Settings categories">{[['game', Cpu, 'Game'], ['appearance', Palette, 'Appearance'], ['launcher', Settings2, 'Launcher']].map(([id, Icon, label]) => <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}><Icon size={16}/>{label}</button>)}</div>
    <fieldset className="preferences-content" disabled={busy}>
    {tab === 'game' && <div className="preferences-grid page-enter">
      <section className="settings-section"><h2><Cpu size={15}/>Game</h2>
        <div className="setting-row profile-setting"><label>Game loader</label><div className="settings-segments" role="radiogroup" aria-label="Game loader">{[['performance','Fusion'],['fabric','Fabric'],['forge','Forge'],['vanilla','Vanilla']].map(([id,label]) => <button role="radio" aria-checked={draft.launchMode === id} key={id} onClick={() => set('launchMode',id)}>{label}</button>)}</div></div>
        {range('memory', 'Memory', 2, state.maxMemory, 1, 'GB')}
        <div className="setting-row"><label>Java</label><div className="java-control"><span title={draft.javaPath}>{draft.javaPath ? draft.javaPath.split(/[\\/]/).slice(-2).join('/') : 'Automatic'}</span><button className="icon-button" aria-label="Browse for Java" onClick={browseJava}><FolderOpen size={17}/></button>{draft.javaPath && <button className="quiet-button" onClick={() => set('javaPath', '')}>Reset</button>}</div></div>
      </section>
      <section className="settings-section"><h2><Monitor size={15}/>Game window</h2>
        <div className="setting-row"><label>Resolution</label><div className="resolution-inputs"><input aria-label="Game width" type="number" min="640" max="7680" defaultValue={draft.width} onBlur={e => { const value = Math.max(640, Math.min(7680, Number(e.target.value) || 1280)); e.target.value = value; set('width', value); }}/><span>×</span><input aria-label="Game height" type="number" min="480" max="4320" defaultValue={draft.height} onBlur={e => { const value = Math.max(480, Math.min(4320, Number(e.target.value) || 720)); e.target.value = value; set('height', value); }}/></div></div>
        {toggle('fullscreen', 'Start fullscreen')}{toggle('minimizeOnLaunch', 'Minimize launcher on play')}{toggle('restoreAfterGame', 'Return when game closes')}
      </section>
      <section className="settings-section"><h2>Fusion optimizations</h2>{range('backgroundFps', 'Background FPS', 5, 60, 5, 'FPS')}{range('particleDistance', 'Particle distance', 8, 64, 4, 'blocks')}</section>
      <section className="settings-section"><h2>Files & downloads</h2>{range('downloadThreads', 'Parallel downloads', 1, 16, 1, '')}{toggle('verifyFiles', 'Verify all files on launch')}<div className="setting-row"><label>Game directory</label><button className="secondary" title={state.root} onClick={openFolder}><FolderOpen size={15}/>Open folder</button></div></section>
    </div>}
    {tab === 'appearance' && <div className="preferences-grid page-enter"><section className="settings-section appearance-card"><h2>Theme</h2><div className="theme-choices">{[['pink','Rose'],['violet','Violet'],['blue','Blue'],['orange','Ember'],['green','Lime']].map(([id,label]) => <button data-theme={id} key={id} aria-label={`${label} theme`} aria-pressed={draft.accent === id} onClick={() => set('accent',id)}><img src={`./assets/branding/${id}.png`} alt=""/><span>{label}</span>{draft.accent === id && <Check size={15}/>}</button>)}</div></section><section className="settings-section"><h2>Motion & layout</h2>{toggle('startupAnimation','Startup animation')}{toggle('reducedMotion', 'Reduce motion')}{toggle('showNews','News on Play')}{toggle('skinAutoRotate','Rotate skin preview')}</section></div>}
    {tab === 'launcher' && <div className="preferences-grid page-enter"><section className="settings-section"><h2>Launcher</h2>{toggle('discordPresence', 'Discord Rich Presence')}{toggle('autoCheckUpdates', 'Check for updates on startup')}<div className="setting-row"><label>Fusion {state.appVersion}</label><button className="secondary" onClick={openUpdates}>Manage updates</button></div></section><section className="settings-section"><h2>Output</h2>{toggle('outputAutoOpen','Open output on errors')}{range('outputFontSize','Text size',9,16,1,'px')}<p className="setting-hint">Drag the top edge of Output to resize it. Your size is saved.</p></section><section className="settings-section"><h2>Storage</h2><p className="setting-hint data-path">{state.root}</p><button className="secondary" onClick={openFolder}><FolderOpen size={15}/>Open folder</button></section></div>}
    </fieldset>
  </>;
}
