import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
export default function Output({ logs, clear, close, settings, save }) {
  const [height,setHeight]=useState(settings?.outputHeight||250), end=useRef(), drag=useRef();
  const limit=value=>Math.round(Math.max(120,Math.min(550,window.innerHeight-110,value)));
  useEffect(()=>{end.current?.scrollIntoView();},[logs]);
  const commit=value=>{setHeight(value);save(old=>({...old,outputHeight:value}));};
  return <section className="logs-panel" style={{height, '--output-font':`${settings?.outputFontSize||11}px`}}>
    <div className="output-resizer" role="separator" tabIndex={0} aria-label="Resize output" aria-orientation="horizontal" aria-valuemin={120} aria-valuemax={550} aria-valuenow={height}
      onPointerDown={e=>{drag.current={y:e.clientY,height};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(drag.current)setHeight(limit(drag.current.height+drag.current.y-e.clientY));}}
      onPointerUp={e=>{if(drag.current){const next=limit(drag.current.height+drag.current.y-e.clientY);drag.current=null;commit(next);}}}
      onPointerCancel={()=>{drag.current=null;}}
      onKeyDown={e=>{if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();commit(limit(e.key==='Home'?120:e.key==='End'?550:height+(e.key==='ArrowUp'?20:-20)));}}}/>
    <header><h2>Output</h2><button className="quiet-button" onClick={clear}>Clear</button><button className="icon-button" aria-label="Close output" onClick={close}><X size={16}/></button></header>
    <div className="logs-content">{logs.map((entry,i)=><div key={i} className={`log-line ${entry.level}`}><time>{new Date(entry.time).toLocaleTimeString('en-GB')}</time><span>{entry.message}</span></div>)}<div ref={end}/></div>
  </section>;
}
