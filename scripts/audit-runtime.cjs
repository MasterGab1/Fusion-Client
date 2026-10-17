const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
function index(version){const file=`build/runtime-cache/${version}-index.json`;if(!fs.existsSync(file))execFileSync('java',['-cp',['build','runtime/vendor/asm-9.10.1.jar'].join(path.delimiter),'ClassIndex',`build/runtime-cache/${version}-client.jar`,file],{stdio:'inherit',windowsHide:true});return new Map(JSON.parse(fs.readFileSync(file,'utf8').replace(/[\x00-\x1f]/g, c => '\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))).map(x=>[x.name,x]));}
function audit(version){const p=Object.fromEntries(fs.readFileSync(`runtime/profiles/${version}.properties`,'utf8').trim().split(/\r?\n/).map(l=>l.split(/=(.*)/s).slice(0,2))),classes=index(version);let checks=0;
function cls(name){const c=classes.get(name);if(!c)throw new Error('Missing class '+name);return c;}
function field(owner,name,desc){const c=cls(owner),f=c.fields.find(x=>x.name===name&&(!desc||x.desc===desc));if(f){checks++;return f;}if(classes.has(c.parent))return field(c.parent,name,desc);throw new Error(`Missing field ${owner}.${name} ${desc||''}`);}
function method(owner,name,desc,seen=new Set()){if(seen.has(owner))return null;seen.add(owner);const c=classes.get(owner);if(!c)return null;return c.methods.find(x=>x.name===name&&(!desc||x.desc===desc))||method(c.parent,name,desc,seen)||(c.interfaces||[]).map(i=>method(i,name,desc,seen)).find(Boolean);}
function m(owner,name,desc){const f=method(owner,name,desc);if(!f)throw new Error(`Missing method ${owner}.${name} ${desc||''}`);checks++;return f;}
const legacy=p['draw.mode']==='legacy',pose=p['draw.mode']==='pose',mc=p['mc.class'],screen=p['screen.class'],tex=p['texture.id.class'],native=p['texture.native.class'];
for(const k of Object.keys(p).filter(k=>k.endsWith('.class')))cls(p[k]);
for(const part of ['hud','fps','particle','keyboard','turn','camera'])if(p[part+'.class'])m(p[part+'.class'],p[part+'.method'],p[part+'.desc']);
for(const key of ['yaw','pitch','prevYaw','prevPitch'])field(p['entity.class'],p['entity.'+key],'F');
m(p['food.player.class'],p['food.get'],'()L'+p['food.class']+';');m(p['food.class'],p['food.level'],'()I');m(p['food.class'],p['food.saturation'],'()F');
m(mc,p['mc.instance'],'()L'+mc+';');const options=field(mc,p['mc.options']).desc.slice(1,-1);field(options,p['hide.field'],'Z');field(mc,p['mc.font']);field(mc,p['mc.player']);field(mc,p['mc.screen'],'L'+screen+';');m(mc,p['mc.setScreen'],'(L'+screen+';)V');if(p['mc.fps.field'])field(mc,p['mc.fps.field'],'I');else m(mc,p['mc.fps.method'],'()I');if(!legacy)m(mc,p['mc.focus'],'()Z');
for(const k of ['width','height'])field(screen,p['screen.'+k],'I');
for(const part of ['render','click','key','pause','closed'])m(screen,p['screen.'+part],p['screen.'+part+'.desc']||(part==='closed'?'()V':'()Z'));
m(screen,'<init>',legacy?'()V':'(L'+p['screen.component']+';)V');
for(const axis of ['x','y','z']){field(p['particle.base'],p['particle.'+axis],'D');if(p['entity.mode']==='fields')field(p['entity.class'],p['entity.'+axis],'D');else m(p['entity.class'],p['entity.'+axis],'()D');}m(p['particle.base'],p['particle.remove'],'()V');
m(p['fill.class'],p['fill.method']);m(p['draw.class'],p['draw.method']);
m(mc,p['texture.manager'],'()L'+p['texture.manager.class']+';');m(tex,p['texture.id.method']==='new'?'<init>':p['texture.id.method'],p['texture.id.method']==='new'?'(Ljava/lang/String;)V':'(Ljava/lang/String;)L'+tex+';');
m(p['texture.manager.class'],p['texture.register'],p['texture.register.desc']);m(p['texture.manager.class'],p['texture.release'],'(L'+tex+';)V');m(p['texture.blit.class'],p['texture.blit'],p['texture.blit.desc']);
m(p['texture.dynamic.class'],'<init>',legacy?'(Ljava/awt/image/BufferedImage;)V':p['texture.supplier']==='true'?'(Ljava/util/function/Supplier;L'+native+';)V':'(L'+native+';)V');
if(!legacy){m(native,p['texture.read'],'(Ljava/io/InputStream;)L'+native+';');if(p['texture.filter'])m(p['texture.dynamic.class'],p['texture.filter'],'(ZZ)V');if(p['texture.pipeline']==='true')field(p['texture.pipeline.class'],p['texture.pipeline.field']);if(p['texture.renderType']==='true')m(p['texture.renderType.class'],p['texture.renderType.method']);if(p['texture.sampler']==='true')field(p['texture.dynamic.class'],p['texture.sampler.field']);}
if(p['input.key.class']){m(p['input.key.class'],p['input.key.method'],'()I');const mouse=/^\(L([^;]+)/.exec(p['screen.click.desc'])[1];for(const axis of ['x','y','button'])m(mouse,p['input.mouse.'+axis],axis==='button'?'()I':'()D');}
console.log('PASS '+version+' '+checks+' bindings');return checks;
}
if(require.main===module){let failed=0;for(const f of fs.readdirSync('runtime/profiles')){const version=f.replace('.properties','');if(!fs.existsSync(`build/runtime-cache/${version}-client.jar`))continue;try{audit(version);}catch(e){failed++;console.error('FAIL '+version+': '+e.message);}}process.exitCode=failed?1:0;}
module.exports={index,audit};
