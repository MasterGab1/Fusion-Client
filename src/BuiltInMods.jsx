import React, { useEffect, useState } from 'react';
import { Check, Cpu, Eye, Moon, Sparkles, RefreshCw, LoaderCircle, ChevronRight, AlertCircle, Utensils, Move, Gauge, MapPin } from 'lucide-react';
import './mods.css';
const api = window.fusion;
const icons = { watermark: Eye, focus: Moon, particles: Sparkles, saturation: Utensils, freelook: Move, fps: Gauge, coordinates: MapPin };
async function call(promise) { const result = await promise; if (!result.ok) throw new Error(result.error); return result.value; }
export default function Mods({ version, settings, busy, onSettings, chooseVersion }) {
  const [catalog, setCatalog] = useState(null), [pending, setPending] = useState(false), [error, setError] = useState('');
  async function load(refresh = false) { setPending(true); setError(''); try { setCatalog(await call(api.modCatalog(version, refresh !== false))); } catch(e) { setError(e.message); } finally { setPending(false); } }
  useEffect(() => { load(); }, [version]);
  useEffect(() => { const refresh = () => load(); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [version]);
  async function toggle(id, enabled) {
    setPending(true); setError('');
    try { const selected = catalog.mods.filter(m => m.enabled && m.id !== id).map(m => m.id); if (enabled) selected.push(id); setCatalog(await call(api.configureMods(version, selected))); }
    catch(e) { setError(e.message); } finally { setPending(false); }
  }
  return <>
    <div className="mods-section-heading"><h2>Included with Fusion</h2><button className="icon-button" aria-label="Refresh mods" disabled={pending} onClick={load}><RefreshCw size={16}/></button></div>
    {error && <div className="inline-error"><AlertCircle size={16}/>{error}<button onClick={load}>Retry</button></div>}
    {!catalog && pending ? <div className="loading"><LoaderCircle size={18} className="spin"/>Loading mods</div> : catalog && !catalog.loader ? <div className="mods-note">Update Fusion to use its built-in mods on this release.</div> : <div className="fusion-features">{catalog?.mods.map(mod => { const Icon = icons[mod.id] || Cpu; return <article className={`mod-card ${mod.enabled ? 'enabled' : ''}`} key={mod.id}><div className="mod-icon"><Icon size={20}/></div><div className="mod-info"><h3>{mod.name}</h3><p>{mod.description}</p></div><input type="checkbox" className="switch" aria-label={`Enable ${mod.name}`} checked={mod.enabled} disabled={!mod.available || pending || busy} onChange={e => toggle(mod.id, e.target.checked)}/></article>; })}</div>}
    <p className="mods-note">Right Shift opens Fusion mods in-game. Changes apply on your next launch.</p>
  </>;
}
