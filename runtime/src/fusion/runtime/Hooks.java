package fusion.runtime;

import java.util.Properties;

public final class Hooks {
    private static Properties profile;
    private static RuntimeConfig config;
    private static MinecraftAdapter adapter;
    private static boolean failed;
    private static Object hudContext;
    private static int hudDepth;
    private static ClientFeatures features;
    private static boolean featuresFailed;
    private static final BackgroundFpsMod focus = new BackgroundFpsMod();
    private static final ParticleDistanceMod particles = new ParticleDistanceMod();
    private static volatile ClassLoader gameLoader;
    public static void initialize(Properties p, RuntimeConfig c) { profile = p; config = c; }
    public static synchronized void bindLoader(ClassLoader loader) {
        if (loader == null || loader == gameLoader) return;
        try {
            if (loader.getClass().getName().equals("net.minecraft.launchwrapper.LaunchClassLoader")) {
                loader.getClass().getMethod("addClassLoaderExclusion", String.class).invoke(loader, "fusion.");
            }
            gameLoader = loader;
        } catch (Exception e) { throw new IllegalStateException("Fusion could not attach to the mod loader", e); }
    }
    static Class<?> type(String name) throws ClassNotFoundException { return Class.forName(name, true, gameLoader == null ? Hooks.class.getClassLoader() : gameLoader); }
    private static MinecraftAdapter game() throws Exception {
        if (adapter == null && !failed) adapter = new MinecraftAdapter(profile);
        return adapter;
    }
    private static void failure(Throwable error) { if (!failed) { failed = true; System.err.println("[Fusion] Runtime adapter disabled: " + error); error.printStackTrace(); } }
    public static void beginHud(Object context) { if(hudDepth++ == 0)hudContext = context; }
    public static void endHud() {
        if(hudDepth > 0 && --hudDepth > 0)return;
        Object context = hudContext; hudContext = null;
        if (failed) return;
        try {
            MinecraftAdapter game = game();
            ClientMenu.tick(game, profile, config, context);
            try { if(!featuresFailed) { if(features==null)features=new ClientFeatures(game,profile,config);features.draw(context); } }
            catch(Throwable error){disableFeatures(error);}
        } catch (Throwable error) { failure(error); }
    }
    private static void disableFeatures(Throwable error) {
        if(features!=null)try{features.release();}catch(Exception ignored){}
        if(!featuresFailed)System.err.println("[Fusion] Optional HUD/camera features unavailable: "+error);
        featuresFailed=true;
    }
    public static boolean turn(Object player,double dx,double dy){
        try{return !featuresFailed&&features!=null&&features.turn(player,dx,dy);}catch(Throwable error){disableFeatures(error);return false;}
    }
    public static float cameraYaw(float value){return featuresFailed||features==null?value:features.yaw(value);}
    public static float cameraPitch(float value){return featuresFailed||features==null?value:features.pitch(value);}
    public static int limitFps(int original) {
        if (!config.focus || failed) return original;
        try { return focus.limit(game(), config, original); } catch (Throwable error) { failure(error); return original; }
    }
    public static void particle(Object particle) {
        if (!config.particles || failed) return;
        try { particles.created(game(), config, particle); } catch (Throwable error) { failure(error); }
    }
}
