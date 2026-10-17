// Build-time only: translate Fusion's bindings using the loaders' published mappings.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const unzip = createRequire(require.resolve('@xmcl/installer'))('@xmcl/unzip');
function mappings(source) {
  const classes = new Map(), members = new Map();
  const lines = source.split(/\r?\n/); let owner;
  const put = (kind, owner, name, desc, target) => members.set(`${kind}:${owner}:${name}:${desc}`, target);
  if (lines[0].startsWith('v1\t')) {
    for (const line of lines) { const [kind, a, b, c, d] = line.split('\t'); if (kind === 'CLASS') classes.set(a,b); else if (kind === 'METHOD' || kind === 'FIELD') put(kind === 'METHOD' ? 'm':'f',a,c,b,d); }
  } else if (lines[0].startsWith('tiny\t2')) {
    for (const line of lines) { const t=line.split('\t'); if(t[0]==='c') { owner=t[1]; classes.set(owner,t[2]); } else if(t[0]==='' && ['m','f'].includes(t[1])) put(t[1],owner,t[3],t[2],t[4]); }
  } else if (source.includes('CL: ')) {
    for(const line of lines) { const t=line.split(' '); if(t[0]==='CL:') classes.set(t[1],t[2]); else if(t[0]==='FD:' || t[0]==='MD:') { const i=t[1].lastIndexOf('/'), target=t[t[0]==='MD:'?3:2]; put(t[0]==='MD:'?'m':'f',t[1].slice(0,i),t[1].slice(i+1),t[0]==='MD:'?t[2]:'',target.slice(target.lastIndexOf('/')+1)); } }
  } else {
    for(const line of lines) { if(!line || line.startsWith('tsrg2')) continue; const t=line.trim().split(/\s+/); if(!line.startsWith('\t')) { owner=t[0]; classes.set(owner,t[1]); } else if(!line.startsWith('\t\t') && t.length>=2) { if(t[1].startsWith('(')) put('m',owner,t[0],t[1],t[2]); else put('f',owner,t[0],'',t[1]); } }
  }
  if(!classes.size) throw new Error('Empty loader mappings');
  return { classes, members };
}
function remap(p, index, map) {
  const out={...p}, bindings=[];
  const cls = name => map.classes.get(name) || name;
  const desc = value => value.replace(/L([^;]+);/g,(_,name)=>`L${cls(name)};`);
  function find(owner, name, descriptor, kind, seen=new Set()) {
    if(!owner || seen.has(owner)) return null; seen.add(owner);
    const c=index.get(owner); if(!c) return null;
    const found=c[kind==='f'?'fields':'methods'].find(m=>m.name===name && (!descriptor || (typeof descriptor==='function'?descriptor(m.desc):m.desc===descriptor)));
    if(found) return {owner,...found};
    return find(c.parent,name,descriptor,kind,seen) || (c.interfaces||[]).map(i=>find(i,name,descriptor,kind,seen)).find(Boolean);
  }
  function member(key, owner, descriptor, kind='m') {
    if(!p[key]) return;
    const found=find(owner,p[key],descriptor,kind);
    if(!found) throw new Error(`Unresolved ${key} ${owner}.${p[key]} ${descriptor}`);
    // Interface and inherited overrides may have their name declared in a parent mapping.
    function nameIn(owner,seen=new Set()) { if(!owner || seen.has(owner)) return; seen.add(owner); const direct=map.members.get(`${kind}:${owner}:${found.name}:${found.desc}`)||map.members.get(`${kind}:${owner}:${found.name}:`); if(direct)return direct; const c=index.get(owner); return c&&(nameIn(c.parent,seen)||(c.interfaces||[]).map(i=>nameIn(i,seen)).find(Boolean)); }
    out[key]=nameIn(owner)||found.name;
    bindings.push({key,kind,owner:cls(found.owner),name:out[key],desc:desc(found.desc)});
    return found;
  }
  const mc=p['mc.class'], screen=p['screen.class'], id=p['texture.id.class'], manager=p['texture.manager.class'];
  const legacy=p['draw.mode']==='legacy', pose=p['draw.mode']==='pose';
  for(const hook of ['hud','fps','particle','keyboard','turn','camera']) if(p[hook+'.class']) member(hook+'.method',p[hook+'.class'],p[hook+'.desc']);
  member('mc.instance',mc,`()L${mc};`);
  for(const key of ['font','player','screen','fps.field']) member('mc.'+key,mc,null,'f');
  const options=member('mc.options',mc,null,'f'); member('hide.field',options.desc.slice(1,-1),'Z','f');
  member('camera.option', options.desc.slice(1,-1), null, 'f');
  for(const key of ['yaw','pitch','prevYaw','prevPitch']) member('entity.'+key,p['entity.class'],'F','f');
  member('food.get',p['food.player.class'],`()L${p['food.class']};`);
  member('food.level',p['food.class'],'()I'); member('food.saturation',p['food.class'],'()F');
  member('mc.fps.method',mc,'()I'); if(!legacy) member('mc.focus',mc,'()Z');
  member('mc.setScreen',mc,`(L${screen};)V`);
  for(const key of ['width','height']) member('screen.'+key,screen,'I','f');
  for(const key of ['render','click','key','pause','closed']) member('screen.'+key,screen,p['screen.'+key+'.desc']||(key==='closed'?'()V':'()Z'));
  const poseClass=pose?/^\(L([^;]+);/.exec(p['screen.render.desc'])[1]:null;
  member('fill.method',p['fill.class'],`(${pose?'L'+poseClass+';':''}IIIII)V`);
  member('draw.method',p['draw.class'],legacy?'(Ljava/lang/String;FFI)I':pose?`(L${poseClass};Ljava/lang/String;FFI)I`:d=>/^\(L[^;]+;Ljava\/lang\/String;IIIZ\)[IV]$/.test(d));
  for(const axis of ['x','y','z']) { member('particle.'+axis,p['particle.base'],'D','f'); member('entity.'+axis,p['entity.class'],p['entity.mode']==='fields'?'D':'()D',p['entity.mode']==='fields'?'f':'m'); }
  member('particle.remove',p['particle.base'],'()V');
  member('texture.manager',mc,`()L${manager};`);
  if(p['texture.id.method']!=='new') member('texture.id.method',id,`(Ljava/lang/String;)L${id};`);
  member('texture.register',manager,p['texture.register.desc']);
  for(const key of ['release','bind']) member('texture.'+key,manager,`(L${id};)V`);
  member('texture.blit',p['texture.blit.class'],p['texture.blit.desc']);
  member('texture.read',p['texture.native.class'],`(Ljava/io/InputStream;)L${p['texture.native.class']};`);
  member('texture.filter',p['texture.dynamic.class'],'(ZZ)V');
  for(const [key,d] of [['blend.on','()V'],['blend.off','()V'],['blend.func','(II)V'],['color','(FFFF)V']]) member('texture.'+key,p['texture.state.class'],d);
  member('texture.shader',p['texture.shader.class'],d=>d.startsWith('()'));
  member('texture.pipeline.field',p['texture.pipeline.class'],null,'f');
  member('texture.renderType.method',p['texture.renderType.class'],d=>d.startsWith(`(L${id};)`));
  member('texture.sampler.field',p['texture.dynamic.class'],null,'f');
  if(p['texture.sampler.method']) { const rs=index.get('com/mojang/blaze3d/systems/RenderSystem'); const owner=rs.methods.find(m=>m.name==='getSamplerCache').desc.slice(3,-1); member('texture.sampler.method',owner,d=>d.startsWith('(Lcom/mojang/blaze3d/textures/FilterMode;)')); }
  const win=member('mc.window',mc,d=>d.startsWith('()')); if(win)member('window.handle',win.desc.slice(3,-1),'()J');
  if(p['screen.title.method']!=='new')member('screen.title.method',p['screen.title.class'],d=>d.startsWith('(Ljava/lang/String;)'));
  if(p['input.key.class']) { member('input.key.method',p['input.key.class'],'()I'); const mouse=/^\(L([^;]+)/.exec(p['screen.click.desc'])[1]; for(const key of ['x','y','button'])member('input.mouse.'+key,mouse,key==='button'?'()I':'()D'); }
  for(const [key,value] of Object.entries(p)) { if(key.endsWith('.class')||['particle.base','screen.component'].includes(key))out[key]=cls(value); else if(key.endsWith('.desc'))out[key]=desc(value); }
  return {profile:out,bindings};
}
async function mappingArchive(url, cache, entryName) {
  let bytes=await fs.readFile(cache).catch(()=>null);
  if(!bytes) { const r=await fetch(url,{signal:AbortSignal.timeout(60000)}); if(!r.ok)throw new Error(`${r.status} ${url}`); bytes=Buffer.from(await r.arrayBuffer()); await fs.mkdir(path.dirname(cache),{recursive:true}); await fs.writeFile(cache,bytes); }
  const zip=await unzip.open(cache); try { const entry=(await unzip.readAllEntries(zip)).find(e=>entryName.test(e.fileName)); if(!entry)throw new Error('Mapping entry missing: '+url); return (await unzip.readEntry(zip,entry)).toString('utf8'); }finally{zip.close();}
}
module.exports={mappings,remap,mappingArchive};
