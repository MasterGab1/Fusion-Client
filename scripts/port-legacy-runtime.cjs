const fs=require('fs'),{index,audit}=require('./audit-runtime.cjs');
const base=index('1.8.8');const original=Object.fromEntries(fs.readFileSync('runtime/profiles/1.8.8.properties','utf8').trim().split(/\r?\n/).map(x=>x.split('=')));
const shape=x=>x.replace(/L[^;]+;/g,'L;');
for(let n=1;n<=7;n++){
const version='1.8.'+n,target=index(version),mapping=new Map();
const required=new Set(Object.entries(original).filter(([k])=>k.endsWith('.class')||k==='particle.base').map(([,v])=>v));
required.add(base.get(original['mc.class']).fields.find(f=>f.name===original['mc.options']).desc.slice(1,-1));
for(const name of required){const b=base.get(name);const strings=new Set(b.strings);const hashes=new Set(b.methods.filter(m=>m.size>15).map(m=>m.hash));
const choices=[...target.values()].map(t=>{const common=t.strings.filter(s=>strings.has(s)).length;const methods=t.methods.filter(m=>hashes.has(m.hash)).length;return {t,score:common*5+methods,common,methods};}).sort((a,b)=>b.score-a.score);
if(!choices[0]||choices[0].score===choices[1]?.score||choices[0].score<2)throw new Error(`Ambiguous ${version} ${name}: `+JSON.stringify(choices.slice(0,3).map(x=>[x.t.name,x.score])));
mapping.set(name,choices[0].t.name);
}
// Infer descriptor-only types from unique, bytecode-identical methods.
for(const [bn,tn] of [...mapping]) for(const bm of base.get(bn).methods) {
  const matches=target.get(tn).methods.filter(tm=>tm.hash===bm.hash&&tm.size===bm.size&&shape(tm.desc)===shape(bm.desc));
  if(matches.length!==1)continue;
  const left=[...bm.desc.matchAll(/L([^;]+);/g)].map(x=>x[1]),right=[...matches[0].desc.matchAll(/L([^;]+);/g)].map(x=>x[1]);
  left.forEach((name,i)=>{if(base.has(name)&&target.has(right[i])&&!mapping.has(name))mapping.set(name,right[i]);});
}
const remapDesc=d=>d.replace(/L([^;]+);/g,(_,c)=>'L'+(mapping.get(c)||c)+';');
const votes=new Map();
for(const [bn,tn]of mapping){for(const bm of base.get(bn).methods){const ts=target.get(tn).methods.filter(tm=>tm.hash===bm.hash&&tm.size===bm.size&&shape(tm.desc)===shape(bm.desc));if(ts.length!==1||ts[0].refs.length!==bm.refs.length)continue;bm.refs.forEach((r,i)=>{const tr=ts[0].refs[i];if(mapping.get(r.owner)!==tr.owner||shape(r.desc)!==shape(tr.desc))return;const k=r.owner+'.'+r.name;const vs=votes.get(k)||new Map();vs.set(tr.name,(vs.get(tr.name)||0)+1);votes.set(k,vs);});}}
function field(owner,name){let b=base.get(owner);while(b&&!b.fields.some(f=>f.name===name))b=base.get(b.parent);if(!b)throw new Error('Missing basefield');const ranked=[...(votes.get(b.name+'.'+name)||[])].sort((a,b)=>b[1]-a[1]);if(!ranked.length||ranked[0][1]===ranked[1]?.[1])throw new Error(`No unambiguous field evidence ${version} ${b.name}.${name}`);return ranked[0][0];}
function method(owner,name,desc){const b=base.get(owner),items=b.methods.filter(m=>m.name===name&&(!desc||m.desc===desc));if(items.length!==1){if(!desc)return name;throw new Error('Ambiguous base method');}const bm=items[0],t=target.get(mapping.get(owner));let found=t.methods.filter(m=>m.hash===bm.hash&&m.size===bm.size&&m.desc===remapDesc(bm.desc));if(found.length>1)found=found.filter(m=>m.name===name);if(found.length===1)return found[0].name;found=t.methods.filter(m=>m.name===name&&m.desc===remapDesc(bm.desc));if(found.length===1){console.log('STRUCTURAL method '+version+' '+owner+'.'+name);return found[0].name;}throw new Error('No method '+version+' '+owner+'.'+name);}
const p={...original,version};for(const [k,v]of Object.entries(p))if(k.endsWith('.class')||k==='particle.base')p[k]=mapping.get(v);else if(k.endsWith('.desc'))p[k]=remapDesc(v);
for(const [key,owner]of Object.entries({'mc.font':'mc.class','mc.player':'mc.class','mc.options':'mc.class','mc.fps.field':'mc.class','mc.screen':'mc.class','screen.width':'screen.class','screen.height':'screen.class','particle.x':'entity.class','particle.y':'entity.class','particle.z':'entity.class','entity.x':'entity.class','entity.y':'entity.class','entity.z':'entity.class'}))p[key]=field(original[owner],original[key]);
for(const key of ['yaw','pitch','prevYaw','prevPitch'])p['entity.'+key]=field(original['entity.class'],original['entity.'+key]);
for(const [key,owner,desc]of [['turn.method','turn.class','(FF)V'],['camera.method','camera.class','(F)V'],['food.get','food.player.class'],['food.level','food.class','()I'],['food.saturation','food.class','()F']])p[key]=method(original[owner],original[key],desc);
const options=base.get(original['mc.class']).fields.find(f=>f.name===original['mc.options']).desc.slice(1,-1);p['hide.field']=field(options,original['hide.field']);p['camera.option']=field(options,original['camera.option']);
for(const [key,owner,descKey]of [['mc.instance','mc.class'],['mc.setScreen','mc.class'],['hud.method','hud.class','hud.desc'],['fps.method','fps.class','fps.desc'],['particle.method','particle.class','particle.desc'],['particle.remove','entity.class'],['screen.render','screen.class','screen.render.desc'],['screen.click','screen.class','screen.click.desc'],['screen.key','screen.class','screen.key.desc'],['screen.pause','screen.class'],['screen.closed','screen.class'],['fill.method','fill.class'],['draw.method','draw.class'],['texture.manager','mc.class'],['texture.register','texture.manager.class','texture.register.desc'],['texture.release','texture.manager.class'],['texture.bind','texture.manager.class'],['texture.blit','texture.blit.class','texture.blit.desc'],['texture.blend.on','texture.state.class'],['texture.blend.off','texture.state.class'],['texture.color','texture.state.class'],['texture.blend.func','texture.state.class']])p[key]=method(original[owner],original[key],descKey?original[descKey]:undefined);
fs.writeFileSync(`runtime/profiles/${version}.properties`,Object.entries(p).map(([k,v])=>k+'='+v).join('\n')+'\n');audit(version);
}
