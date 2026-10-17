// Regenerate the audited runtime mappings from the official client/MCP mapping files.
// Only generated names/descriptors are shipped; no Minecraft game classes are bundled.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function save(version, values) {
  const text = Object.entries({ version, ...values }).map(([key, value]) => { if (value === undefined) throw new Error(`Missing ${version}: ${key}`); return `${key}=${value}`; }).join('\n') + '\n';
  fs.writeFileSync(path.join(root, 'runtime/profiles', `${version}.properties`), text);
}
for (const version of fs.readdirSync(path.join(root,'build/runtime-cache')).filter(f=>f.endsWith('.srg')).map(f=>f.slice(0,-4))) {
  const lines = fs.readFileSync(path.join(root, 'build/runtime-cache', `${version}.srg`), 'utf8').split(/\r?\n/).map(l => l.split(' '));
  const cls = name => lines.find(l => l[0] === 'CL:' && l[2] === name)[1];
  const field = (owner, name) => lines.find(l => l[0] === 'FD:' && l[2] === `${owner}/${name}`)[1].split('/').pop();
  const method = (owner, name) => { const l = lines.find(l => l[0] === 'MD:' && l[3] === `${owner}/${name}`); return { name: l[1].split('/').pop(), desc: l[2] }; };
  const mc = 'net/minecraft/client/Minecraft', entity = 'net/minecraft/entity/Entity', hud = 'net/minecraft/client/gui/GuiIngame';
  const particle = `net/minecraft/client/particle/${version.startsWith('1.8') ? 'EntityFX' : 'Particle'}`;
  const manager = `net/minecraft/client/particle/${version.startsWith('1.8') ? 'EffectRenderer' : 'ParticleManager'}`;
  const font = 'net/minecraft/client/gui/FontRenderer';
  save(version, {
    'food.player.class': cls('net/minecraft/entity/player/EntityPlayer'), 'food.class': cls('net/minecraft/util/FoodStats'),
    'food.get': method('net/minecraft/entity/player/EntityPlayer','func_71024_bL').name,
    'food.level': method('net/minecraft/util/FoodStats','func_75116_a').name, 'food.saturation': method('net/minecraft/util/FoodStats','func_75115_e').name,
    'turn.class': cls(entity), 'turn.method': method(entity,'func_70082_c').name, 'turn.desc':'(FF)V',
    'camera.class': cls('net/minecraft/client/renderer/EntityRenderer'), 'camera.method': method('net/minecraft/client/renderer/EntityRenderer','func_78467_g').name, 'camera.desc':'(F)V',
    'camera.option': field('net/minecraft/client/settings/GameSettings','field_74320_O'),
    'entity.yaw': field(entity,'field_70177_z'), 'entity.pitch': field(entity,'field_70125_A'),
    'entity.prevYaw': field(entity,'field_70126_B'), 'entity.prevPitch': field(entity,'field_70127_C'),
    'mc.class': cls(mc), 'mc.instance': method(mc, 'func_71410_x').name,
    'mc.font': field(mc, 'field_71466_p'), 'mc.player': field(mc, 'field_71439_g'), 'mc.options': field(mc, 'field_71474_y'),
    'mc.fps.field': field(mc, 'field_71470_ab'), 'mc.focus': 'lwjgl2',
    'hide.field': field('net/minecraft/client/settings/GameSettings', 'field_74319_N'),
    'hud.class': cls(hud), 'hud.method': method(hud, 'func_175180_a').name, 'hud.desc': method(hud, 'func_175180_a').desc,
    'screen.class': cls('net/minecraft/client/gui/GuiScreen'), 'screen.width': field('net/minecraft/client/gui/GuiScreen', 'field_146294_l'), 'screen.height': field('net/minecraft/client/gui/GuiScreen', 'field_146295_m'),
    'screen.render': method('net/minecraft/client/gui/GuiScreen', 'func_73863_a').name, 'screen.render.desc': '(IIF)V',
    'screen.click': method('net/minecraft/client/gui/GuiScreen', 'func_73864_a').name, 'screen.click.desc': '(III)V',
    'screen.key': method('net/minecraft/client/gui/GuiScreen', 'func_73869_a').name, 'screen.key.desc': '(CI)V',
    'screen.pause': method('net/minecraft/client/gui/GuiScreen', 'func_73868_f').name,
    'screen.closed': method('net/minecraft/client/gui/GuiScreen', 'func_146281_b').name,
    'mc.screen': field(mc, 'field_71462_r'), 'mc.setScreen': method(mc, 'func_147108_a').name,
    'fill.class': cls('net/minecraft/client/gui/Gui'), 'fill.method': method('net/minecraft/client/gui/Gui', 'func_73734_a').name,
    'texture.id.class': cls('net/minecraft/util/ResourceLocation'), 'texture.id.method': 'new',
    'texture.dynamic.class': cls('net/minecraft/client/renderer/texture/DynamicTexture'),
    'texture.manager.class': cls('net/minecraft/client/renderer/texture/TextureManager'),
    'texture.manager': method(mc, 'func_110434_K').name,
    'texture.register': method('net/minecraft/client/renderer/texture/TextureManager', 'func_110579_a').name,
    'texture.register.desc': method('net/minecraft/client/renderer/texture/TextureManager', 'func_110579_a').desc,
    'texture.release': method('net/minecraft/client/renderer/texture/TextureManager', 'func_147645_c').name,
    'texture.bind': method('net/minecraft/client/renderer/texture/TextureManager', 'func_110577_a').name,
    'texture.blit.class': cls('net/minecraft/client/gui/Gui'),
    'texture.blit': method('net/minecraft/client/gui/Gui', 'func_152125_a').name,
    'texture.blit.desc': method('net/minecraft/client/gui/Gui', 'func_152125_a').desc,
    'texture.state.class': cls('net/minecraft/client/renderer/GlStateManager'),
    'texture.blend.on': method('net/minecraft/client/renderer/GlStateManager', 'func_179147_l').name,
    'texture.blend.off': method('net/minecraft/client/renderer/GlStateManager', 'func_179084_k').name,
    'texture.color': method('net/minecraft/client/renderer/GlStateManager', 'func_179131_c').name,
    'texture.blend.func': method('net/minecraft/client/renderer/GlStateManager', 'func_179112_b').name,
    'draw.mode': 'legacy', 'draw.class': cls(font), 'draw.method': method(font, 'func_175063_a').name,
    'fps.class': cls(mc), 'fps.method': method(mc, 'func_90020_K').name, 'fps.desc': '()I',
    'particle.class': cls(manager), 'particle.method': method(manager, 'func_78873_a').name, 'particle.desc': method(manager, 'func_78873_a').desc,
    'particle.base': cls(particle), 'particle.remove': method(version.startsWith('1.8') ? entity : particle, version.startsWith('1.8') ? 'func_70106_y' : 'func_187112_i').name,
    'particle.x': field(version.startsWith('1.8') ? entity : particle, version.startsWith('1.8') ? 'field_70165_t' : 'field_187126_f'),
    'particle.y': field(version.startsWith('1.8') ? entity : particle, version.startsWith('1.8') ? 'field_70163_u' : 'field_187127_g'),
    'particle.z': field(version.startsWith('1.8') ? entity : particle, version.startsWith('1.8') ? 'field_70161_v' : 'field_187128_h'),
    'entity.class': cls(entity), 'entity.mode': 'fields', 'entity.x': field(entity, 'field_70165_t'), 'entity.y': field(entity, 'field_70163_u'), 'entity.z': field(entity, 'field_70161_v'),
  });
}
for (const version of fs.readdirSync(path.join(root,'build/runtime-cache')).filter(f=>/^1\.(16|18|19|20|21)(\.\d+)?\.txt$/.test(f)).map(f=>f.slice(0,-4)).concat(['26.1','26.1.1','26.1.2'])) {
  try {
  const identity = version.startsWith('26.'), classes = new Map(); let current;
  if (!identity) for (const line of fs.readFileSync(path.join(root, 'build/runtime-cache', `${version}.txt`), 'utf8').split(/\r?\n/)) {
    const c = line.match(/^([^ #].*) -> (.*):$/);
    if (c) { current = { obf: c[2], fields: new Map(), methods: [] }; classes.set(c[1], current); }
    else if (current && /^    /.test(line)) {
      const entry = line.trim().replace(/^\d+:\d+:/, '').match(/^(\S+) (\S+?)(?:\((.*?)\))?(?::\d+(?::\d+)?)? -> (\S+)$/);
      if (entry) { const [, type, name, args, obf] = entry; if (args === undefined) current.fields.set(name, obf); else current.methods.push({ type, name, args, obf }); }
    }
  }
  const cls = name => (identity ? name : classes.get(name)?.obf)?.replaceAll('.', '/');
  const field = (owner, name) => identity ? name : classes.get(owner)?.fields.get(name);
  const type = name => { if (name.endsWith('[]')) return '[' + type(name.slice(0, -2)); return ({ void: 'V', boolean: 'Z', byte: 'B', char: 'C', short: 'S', int: 'I', long: 'J', float: 'F', double: 'D' })[name] || `L${cls(name) || name.replaceAll('.', '/')};`; };
  const method = (owner, name, args, returns = 'void') => {
    const item = identity ? { obf: name, type: returns, args } : classes.get(owner)?.methods.find(m => m.name === name && m.args === args);
    if (!item) throw new Error(`Missing ${version} method ${owner}.${name}(${args})`);
    return { name: item.obf, desc: `(${item.args ? item.args.split(',').map(type).join('') : ''})${type(item.type)}` };
  };
  const mc = 'net.minecraft.client.Minecraft', hud = 'net.minecraft.client.gui.Gui', font = 'net.minecraft.client.gui.Font', particle = 'net.minecraft.client.particle.Particle', manager = 'net.minecraft.client.particle.ParticleEngine', entity = 'net.minecraft.world.entity.Entity';
  const minor = Number(version.split('.')[1]), patch = Number(version.split('.')[2] || 0);
  const pose = !identity && minor <= 19;
  const oldTexture = !identity && minor === 16;
  const pipelines = identity || minor === 21 && patch >= 6;
  const records = identity || minor === 21 && patch >= 9;
  const extract = identity;
  const renderType = !identity && minor === 21 && patch >= 2 && patch <= 5;
  const sampler = identity || minor === 21 && patch >= 11;
  const supplierTexture = identity || minor === 21 && patch >= 5;
  const tracker = identity || minor === 21 && patch >= 2;
  const context = pose ? 'com.mojang.blaze3d.vertex.PoseStack' : identity ? 'net.minecraft.client.gui.GuiGraphicsExtractor' : 'net.minecraft.client.gui.GuiGraphics';
  const hudMethod = method(hud, identity ? 'extractRenderState' : 'render', `${context},${(identity || minor >= 21) ? 'net.minecraft.client.DeltaTracker' : 'float'}`);
  const fpsClass = tracker ? 'com.mojang.blaze3d.platform.FramerateLimitTracker' : mc;
  const screen = 'net.minecraft.client.gui.screens.Screen', events = 'net.minecraft.client.gui.components.events.GuiEventListener';
  const screenRender = method(screen, identity ? 'extractRenderState' : 'render', context + ',int,int,float');
  const screenClick = method(events, 'mouseClicked', records ? 'net.minecraft.client.input.MouseButtonEvent,boolean' : 'double,double,int', 'boolean');
  const screenKey = method(screen, 'keyPressed', records ? 'net.minecraft.client.input.KeyEvent' : 'int,int,int', 'boolean');
  const fillOwner = pose ? 'net.minecraft.client.gui.GuiComponent' : context;
  const textureId = sampler ? 'net.minecraft.resources.Identifier' : 'net.minecraft.resources.ResourceLocation';
  const textureManager = 'net.minecraft.client.renderer.texture.TextureManager';
  const blit = method(fillOwner, 'blit', pipelines ? 'com.mojang.blaze3d.pipeline.RenderPipeline,' + textureId + ',int,int,float,float,int,int,int,int,int,int' : renderType ? 'java.util.function.Function,' + textureId + ',int,int,float,float,int,int,int,int,int,int' : (pose ? context : textureId) + ',int,int,int,int,float,float,int,int,int,int');
  save(version, {
    'food.player.class': cls('net.minecraft.world.entity.player.Player'), 'food.class': cls('net.minecraft.world.food.FoodData'),
    'food.get': method('net.minecraft.world.entity.player.Player','getFoodData','','net.minecraft.world.food.FoodData').name,
    'food.level': method('net.minecraft.world.food.FoodData','getFoodLevel','','int').name,
    'food.saturation': method('net.minecraft.world.food.FoodData','getSaturationLevel','','float').name,
    'turn.class': cls(entity), 'turn.method': method(entity,'turn','double,double').name, 'turn.desc':'(DD)V',
    'camera.class': cls('net.minecraft.client.Camera'), 'camera.method': method('net.minecraft.client.Camera','setRotation','float,float').name, 'camera.desc':'(FF)V',
    'camera.option': field('net.minecraft.client.Options',minor === 16 && patch < 2 ? 'thirdPersonView' : 'cameraType'),
    'entity.yaw': field(entity,'yRot'), 'entity.pitch': field(entity,'xRot'),
    'entity.prevYaw': field(entity,'yRotO'), 'entity.prevPitch': field(entity,'xRotO'),
    'texture.pipeline': String(pipelines), 'texture.sampler': String(sampler), 'texture.supplier': String(supplierTexture), 'texture.renderType': String(renderType),
    ...(renderType ? { 'texture.renderType.class': cls('net.minecraft.client.renderer.RenderType'), 'texture.renderType.method': method('net.minecraft.client.renderer.RenderType','guiTextured',textureId,'net.minecraft.client.renderer.RenderType').name } : {}),
    ...(sampler ? { 'texture.sampler.method': method('com.mojang.blaze3d.systems.SamplerCache','getClampToEdge','com.mojang.blaze3d.textures.FilterMode','com.mojang.blaze3d.textures.GpuSampler').name, 'texture.sampler.field': field('net.minecraft.client.renderer.texture.AbstractTexture','sampler') } : {}),
    ...(pipelines ? { 'texture.pipeline.class': cls('net.minecraft.client.renderer.RenderPipelines'), 'texture.pipeline.field': field('net.minecraft.client.renderer.RenderPipelines','GUI_TEXTURED') } : {}),
    ...(records ? { 'input.key.class': cls('net.minecraft.client.input.KeyEvent'), 'input.key.method': method('net.minecraft.client.input.KeyEvent','key','','int').name, 'input.mouse.x': method('net.minecraft.client.input.MouseButtonEvent','x','','double').name, 'input.mouse.y': method('net.minecraft.client.input.MouseButtonEvent','y','','double').name, 'input.mouse.button': method('net.minecraft.client.input.MouseButtonEvent','button','','int').name } : {}),
    'texture.id.class': cls(textureId), 'texture.id.method': (identity || minor >= 21) ? method(textureId, 'parse', 'java.lang.String', textureId).name : 'new',
    'texture.dynamic.class': cls('net.minecraft.client.renderer.texture.DynamicTexture'),
    'texture.manager.class': cls(textureManager), 'texture.manager': method(mc, 'getTextureManager', '', textureManager).name,
    'texture.register': method(textureManager, 'register', textureId + ',net.minecraft.client.renderer.texture.AbstractTexture').name,
    'texture.register.desc': method(textureManager, 'register', textureId + ',net.minecraft.client.renderer.texture.AbstractTexture').desc,
    'texture.release': method(textureManager, 'release', textureId).name,
    'texture.native.class': cls('com.mojang.blaze3d.platform.NativeImage'),
    'texture.read': method('com.mojang.blaze3d.platform.NativeImage', 'read', 'java.io.InputStream', 'com.mojang.blaze3d.platform.NativeImage').name,
    'texture.blit.class': cls(fillOwner), 'texture.blit': blit.name, 'texture.blit.desc': blit.desc,
    ...(!sampler ? { 'texture.filter': method('net.minecraft.client.renderer.texture.AbstractTexture', 'setFilter', 'boolean,boolean').name } : {}),
    ...(oldTexture ? { 'texture.bind': method(textureManager, 'bind', textureId).name } : {}),
    ...(pose && !oldTexture ? { 'texture.shader.class': cls('net.minecraft.client.renderer.GameRenderer'), 'texture.shader': method('net.minecraft.client.renderer.GameRenderer', 'getPositionTexShader', '', 'net.minecraft.client.renderer.ShaderInstance').name } : {}),
    'screen.class': cls(screen), 'screen.width': field(screen, 'width'), 'screen.height': field(screen, 'height'),
    'keyboard.class': cls('net.minecraft.client.KeyboardHandler'),
    'keyboard.method': method('net.minecraft.client.KeyboardHandler', 'keyPress', records ? 'long,int,net.minecraft.client.input.KeyEvent' : 'long,int,int,int,int').name,
    'keyboard.desc': method('net.minecraft.client.KeyboardHandler', 'keyPress', records ? 'long,int,net.minecraft.client.input.KeyEvent' : 'long,int,int,int,int').desc,
    'screen.render': screenRender.name, 'screen.render.desc': screenRender.desc,
    'screen.click': screenClick.name, 'screen.click.desc': screenClick.desc, 'screen.key': screenKey.name, 'screen.key.desc': screenKey.desc,
    'screen.pause': method(screen, 'isPauseScreen', '', 'boolean').name,
    'screen.closed': method(screen, 'removed', '').name,
    'screen.component': cls('net.minecraft.network.chat.Component'),
    'screen.title.class': cls((minor <= 18 && !identity) ? 'net.minecraft.network.chat.TextComponent' : 'net.minecraft.network.chat.Component'),
    'screen.title.method': (minor <= 18 && !identity) ? 'new' : method('net.minecraft.network.chat.Component', 'literal', 'java.lang.String', 'net.minecraft.network.chat.MutableComponent').name,
    'mc.screen': field(mc, 'screen'), 'mc.setScreen': method(mc, 'setScreen', screen).name,
    'mc.window': method(mc, 'getWindow', '', 'com.mojang.blaze3d.platform.Window').name,
    'window.handle': method('com.mojang.blaze3d.platform.Window', records ? 'handle' : 'getWindow', '', 'long').name,
    'fill.class': cls(fillOwner), 'fill.method': method(fillOwner, 'fill', (pose ? context + ',' : '') + 'int,int,int,int,int').name,
    'mc.class': cls(mc), 'mc.instance': method(mc, 'getInstance', '', mc).name,
    'mc.font': field(mc, 'font'), 'mc.player': field(mc, 'player'), 'mc.options': field(mc, 'options'),
    ...(identity ? { 'mc.fps.method': 'getFps' } : { 'mc.fps.field': field(mc, 'fps') }),
    'mc.focus': method(mc, 'isWindowActive', '', 'boolean').name, 'hide.field': field('net.minecraft.client.Options', 'hideGui'),
    'hud.class': cls(hud), 'hud.method': hudMethod.name, 'hud.desc': hudMethod.desc,
    'draw.mode': pose ? 'pose' : 'gui', 'draw.class': cls(pose ? font : context),
    'draw.method': pose ? method(font, 'drawShadow', `${context},java.lang.String,float,float,int`, 'int').name : method(context, identity ? 'text' : 'drawString', `${font},java.lang.String,int,int,int,boolean`, identity ? 'void' : 'int').name,
    'fps.class': cls(fpsClass), 'fps.method': method(fpsClass, 'getFramerateLimit', '', 'int').name, 'fps.desc': '()I',
    'particle.class': cls(manager), 'particle.method': method(manager, 'add', particle).name, 'particle.desc': method(manager, 'add', particle).desc,
    'particle.base': cls(particle), 'particle.remove': method(particle, 'remove', '').name,
    'particle.x': field(particle, 'x'), 'particle.y': field(particle, 'y'), 'particle.z': field(particle, 'z'),
    'entity.class': cls(entity), 'entity.mode': 'methods', 'entity.x': method(entity, 'getX', '', 'double').name, 'entity.y': method(entity, 'getY', '', 'double').name, 'entity.z': method(entity, 'getZ', '', 'double').name,
  });
  } catch(error) { console.log(version + ': ' + error.message); }
}
console.log('Generated runtime mappings.');
