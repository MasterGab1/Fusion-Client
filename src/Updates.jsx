import React from 'react';
import { Download, RefreshCw, Check, ExternalLink, RotateCw, ArrowUpRight } from 'lucide-react';
export default function Updates({ update, busy, perform, openLink }) {
  if (!update) return <p className="dialog-copy">Loading updater…</p>;
  const status = update.status;
  const working = ['checking', 'downloading', 'installing'].includes(status);
  const title = { idle: 'Launcher updates', checking: 'Checking GitHub', available: `Fusion ${update.version}`, downloading: `Downloading ${update.version}`, ready: 'Ready to install', current: 'You’re up to date', error: 'Could not check for updates', unavailable: 'Packaged app required', installing: 'Restarting Fusion' }[status];
  return <div className="updates-content">
    <div className={`update-symbol ${status}`} aria-hidden="true">{status === 'ready' || status === 'current' ? <Check size={26}/> : working ? <RefreshCw size={26} className="spin"/> : <Download size={26}/>}</div>
    <h3>{title}</h3><p className="update-caption">{update.channel} edition <span>·</span> Installed {update.currentVersion}</p>
    <div className="update-source"><span>Release source</span><button onClick={() => openLink('releases')}>MasterGab1 / Fusion-Client<ArrowUpRight size={13}/></button></div>
    {status === 'available' && <p className="dialog-copy">A new launcher version is available. Your worlds, skins, and settings stay in place.</p>}
    {status === 'downloading' && <div className="update-progress"><progress aria-label="Update download progress" max="100" value={update.percent}/><span>{Math.round(update.percent)}%</span></div>}
    {status === 'ready' && <p className="dialog-copy">Download verified. Restart Fusion to install the update.{busy ? ' Close Minecraft first.' : ''}</p>}
    {update.error && <p className="update-error" role="status">{update.error}</p>}
    {!update.installed && <p className="update-hint">Run the Fusion setup once to enable in-place updates.</p>}
    {status === 'available' ? <button className="primary full" disabled={!update.installed} onClick={() => perform('downloadUpdate')}><Download size={15}/>Download update</button> : status === 'ready' ? <button className="primary full" disabled={busy} onClick={() => perform('installUpdate')}><RotateCw size={15}/>Restart to install</button> : <button className="primary full" disabled={working} onClick={() => perform('checkUpdates')}><RefreshCw size={15} className={working ? 'spin' : ''}/>{working ? status === 'downloading' ? 'Downloading…' : status === 'installing' ? 'Restarting…' : 'Checking…' : 'Check for updates'}</button>}
    <div className="update-links"><button className="text-button" onClick={() => openLink('releases')}>Release notes<ExternalLink size={12}/></button><button className="text-button" onClick={() => openLink('updates-guide')}>Publishing guide<ExternalLink size={12}/></button></div>
  </div>;
}
