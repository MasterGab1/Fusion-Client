import React, { useState } from 'react';
import privacy from '../docs/PRIVACY.md?raw';
import terms from '../docs/TERMS.md?raw';
export default function Legal() {
  const [selected,setSelected]=useState('privacy');
  return <section className="legal-page"><div className="settings-segments" role="group" aria-label="Legal documents"><button aria-pressed={selected==='privacy'} onClick={()=>setSelected('privacy')}>Privacy</button><button aria-pressed={selected==='terms'} onClick={()=>setSelected('terms')}>Terms of use</button></div><article tabIndex={0} aria-label={selected==='privacy'?'Privacy notice':'Terms of use'}>{(selected==='privacy'?privacy:terms).trim().split(/\r?\n\r?\n/).map((block,i)=>block.startsWith('## ')?<h3 key={i}>{block.slice(3)}</h3>:block.startsWith('# ')?<h2 key={i}>{block.slice(2)}</h2>:<p key={i}>{block}</p>)}<button className="secondary" onClick={()=>window.fusion.openLink('contact')}>Contact the maintainer</button></article></section>;
}
