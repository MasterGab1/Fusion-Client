package fusion.runtime;

import java.awt.image.BufferedImage;
import java.io.*;
import java.lang.reflect.*;
import java.util.Properties;
import java.util.function.Supplier;
import javax.imageio.ImageIO;
import org.objectweb.asm.Type;

/** Uploads a cached high-resolution UI image as one Minecraft-owned texture. */
final class OverlayTexture {
    private final MinecraftAdapter game;
    private final Properties p;
    private final boolean legacy, modern, renderType, samplerMode, supplierTexture;
    private final Object manager, id;
    private final Method register, release, blit, bind, filter, shader, shaderSet, shaderTexture, blend, blendFunc;
    private final Class<?> nativeImage, dynamic;
    private final Object pipeline;
    private final Method renderTypeFactory;
    private final Method blendOff, blendEnabled, color, texParameter;
    private int pixelWidth, pixelHeight;
    private boolean uploaded;
    static Method mapped(Class<?> owner, String name, String desc) throws Exception {
        for (Method m : owner.getDeclaredMethods()) if (m.getName().equals(name) && Type.getMethodDescriptor(m).equals(desc)) { m.setAccessible(true); return m; }
        throw new NoSuchMethodException(owner.getName() + "." + name + desc);
    }
    OverlayTexture(MinecraftAdapter game, Properties p) throws Exception {
        this.game = game; this.p = p; legacy = game.drawMode.equals("legacy"); modern = Boolean.parseBoolean(p.getProperty("texture.pipeline", "false")); renderType = Boolean.parseBoolean(p.getProperty("texture.renderType", "false")); samplerMode = Boolean.parseBoolean(p.getProperty("texture.sampler", "false")); supplierTexture = Boolean.parseBoolean(p.getProperty("texture.supplier", "false"));
        Class<?> resource = game.type("texture.id.class"), owner = game.type("texture.manager.class");
        manager = MinecraftAdapter.method(game.type("mc.class"), p.getProperty("texture.manager")).invoke(game.minecraft());
        id = p.getProperty("texture.id.method").equals("new") ? resource.getConstructor(String.class).newInstance("fusion:menu") : resource.getMethod(p.getProperty("texture.id.method"), String.class).invoke(null, "fusion:menu");
        dynamic = game.type("texture.dynamic.class"); nativeImage = legacy ? null : game.type("texture.native.class");
        register = mapped(owner, p.getProperty("texture.register"), p.getProperty("texture.register.desc"));
        release = owner.getMethod(p.getProperty("texture.release"), resource);
        blit = mapped(game.type("texture.blit.class"), p.getProperty("texture.blit"), p.getProperty("texture.blit.desc"));
        bind = p.containsKey("texture.bind") ? owner.getMethod(p.getProperty("texture.bind"), resource) : null;
        renderTypeFactory = renderType ? game.type("texture.renderType.class").getMethod(p.getProperty("texture.renderType.method"), resource) : null;
        filter = legacy || samplerMode ? null : dynamic.getMethod(p.getProperty("texture.filter"), boolean.class, boolean.class);
        if (legacy) {
            Class<?> gl = Hooks.type("org.lwjgl.opengl.GL11"), state = game.type("texture.state.class");
            blend = state.getMethod(p.getProperty("texture.blend.on")); blendOff = state.getMethod(p.getProperty("texture.blend.off"));
            blendFunc = state.getMethod(p.getProperty("texture.blend.func"), int.class, int.class);
            blendEnabled = gl.getMethod("glIsEnabled", int.class);
            color = state.getMethod(p.getProperty("texture.color"), float.class, float.class, float.class, float.class);
            texParameter = gl.getMethod("glTexParameteri", int.class, int.class, int.class);
            shader = shaderSet = shaderTexture = null; pipeline = null;
        } else {
            Class<?> rs = Hooks.type("com.mojang.blaze3d.systems.RenderSystem");
            blend = (modern || renderType) ? null : rs.getMethod("enableBlend"); blendFunc = (modern || renderType) ? null : rs.getMethod("defaultBlendFunc");
            shader = p.containsKey("texture.shader") ? game.type("texture.shader.class").getMethod(p.getProperty("texture.shader")) : null;
            shaderSet = shader != null ? rs.getMethod("setShader", Supplier.class) : null;
            shaderTexture = shader != null ? rs.getMethod("setShaderTexture", int.class, resource) : null;
            pipeline = modern ? game.type("texture.pipeline.class").getField(p.getProperty("texture.pipeline.field")).get(null) : null;
            blendOff = (modern || renderType) ? null : rs.getMethod("disableBlend"); blendEnabled = (modern || renderType) ? null : Hooks.type("org.lwjgl.opengl.GL11").getMethod("glIsEnabled", int.class);
            color = texParameter = null;
        }
    }
    void upload(BufferedImage image) throws Exception {
        Object texture;
        if (legacy) texture = dynamic.getConstructor(BufferedImage.class).newInstance(image);
        else {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(); ImageIO.write(image, "PNG", bytes);
            Object pixels = nativeImage.getMethod(p.getProperty("texture.read"), InputStream.class).invoke(null, new ByteArrayInputStream(bytes.toByteArray()));
            try { texture = supplierTexture ? dynamic.getConstructor(Supplier.class, nativeImage).newInstance((Supplier<String>)() -> "Fusion menu", pixels) : dynamic.getConstructor(nativeImage).newInstance(pixels); }
            catch (Exception error) { nativeImage.getMethod("close").invoke(pixels); throw error; }
        }
        if (uploaded) release.invoke(manager, id);
        register.invoke(manager, id, texture);
        if (filter != null) filter.invoke(texture, true, false);
        if (samplerMode) {
            Class<?> rs = Hooks.type("com.mojang.blaze3d.systems.RenderSystem"), mode = Hooks.type("com.mojang.blaze3d.textures.FilterMode");
            Object cache = rs.getMethod("getSamplerCache").invoke(null);
            Object sampler = cache.getClass().getMethod(p.getProperty("texture.sampler.method"), mode).invoke(cache, mode.getField("LINEAR").get(null));
            MinecraftAdapter.field(texture.getClass(), p.getProperty("texture.sampler.field")).set(texture, sampler);
        }
        uploaded = true; pixelWidth = image.getWidth(); pixelHeight = image.getHeight();
    }
    void draw(Object context, int x, int y, int width, int height) throws Exception {
        if (!uploaded) return;
        if (legacy) {
            bind.invoke(manager, id);
            boolean previousBlend = (Boolean)blendEnabled.invoke(null, 3042);
            color.invoke(null, 1f, 1f, 1f, 1f); blend.invoke(null); blendFunc.invoke(null, 770, 771);
            texParameter.invoke(null, 3553, 10241, 9729); texParameter.invoke(null, 3553, 10240, 9729);
            try { blit.invoke(null, x, y, 0f, 0f, pixelWidth, pixelHeight, width, height, (float)pixelWidth, (float)pixelHeight); }
            finally { if (!previousBlend) blendOff.invoke(null); }
        } else if (modern) blit.invoke(context, pipeline, id, x, y, 0f, 0f, width, height, pixelWidth, pixelHeight, pixelWidth, pixelHeight);
        else if (renderType) {
            java.util.function.Function<Object,Object> factory = resource -> { try { return renderTypeFactory.invoke(null, resource); } catch (Exception e) { throw new RuntimeException(e); } };
            blit.invoke(context, factory, id, x, y, 0f, 0f, width, height, pixelWidth, pixelHeight, pixelWidth, pixelHeight);
        } else {
            boolean previousBlend = (Boolean)blendEnabled.invoke(null, 3042);
            blend.invoke(null); blendFunc.invoke(null);
            try {
            if (game.drawMode.equals("pose")) {
                if (bind != null) bind.invoke(manager, id);
                if (shader != null) { shaderSet.invoke(null, (Supplier<Object>)() -> { try { return shader.invoke(null); } catch (Exception e) { throw new RuntimeException(e); } }); shaderTexture.invoke(null, 0, id); }
                blit.invoke(null, context, x, y, width, height, 0f, 0f, pixelWidth, pixelHeight, pixelWidth, pixelHeight);
            } else blit.invoke(context, id, x, y, width, height, 0f, 0f, pixelWidth, pixelHeight, pixelWidth, pixelHeight);
            } finally { if (!previousBlend) blendOff.invoke(null); }
        }
    }
    void close() throws Exception { if (uploaded) { release.invoke(manager, id); uploaded = false; } }
}
