package fusion.runtime;

import java.util.Properties;

public final class Hooks {
    private static Properties profile;
    private static RuntimeConfig config;
    private static MinecraftAdapter adapter;
    private static boolean failed;
    private static Object hudContext;
    private static final BackgroundFpsMod focus = new BackgroundFpsMod();
    private static final ParticleDistanceMod particles = new ParticleDistanceMod();
    static void initialize(Properties p, RuntimeConfig c) { profile = p; config = c; }
    private static MinecraftAdapter game() throws Exception {
        if (adapter == null && !failed) adapter = new MinecraftAdapter(profile);
        return adapter;
    }
    private static void failure(Throwable error) { if (!failed) { failed = true; System.err.println("[Fusion] Runtime adapter disabled: " + error); error.printStackTrace(); } }
    public static void beginHud(Object context) { hudContext = context; }
    public static void endHud() {
        Object context = hudContext; hudContext = null;
        if (failed) return;
        try {
            MinecraftAdapter game = game();
            ClientMenu.tick(game, profile, config, context);
        } catch (Throwable error) { failure(error); }
    }
    public static int limitFps(int original) {
        if (!config.focus || failed) return original;
        try { return focus.limit(game(), config, original); } catch (Throwable error) { failure(error); return original; }
    }
    public static void particle(Object particle) {
        if (!config.particles || failed) return;
        try { particles.created(game(), config, particle); } catch (Throwable error) { failure(error); }
    }
}
