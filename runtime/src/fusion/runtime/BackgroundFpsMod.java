package fusion.runtime;

final class BackgroundFpsMod {
    private boolean capped;
    static int cappedLimit(int original, int limit, boolean focused) { return focused ? original : original > 0 ? Math.min(original, limit) : limit; }
    int limit(MinecraftAdapter game, RuntimeConfig config, int original) throws Exception {
        Object mc = game.minecraft();
        if (mc == null) return original;
        boolean focused = game.focused(mc);
        if (!focused && !capped) System.out.println("[Fusion] Background FPS cap active: " + config.backgroundFps);
        if (focused && capped) System.out.println("[Fusion] Foreground FPS restored");
        capped = !focused;
        return cappedLimit(original, config.backgroundFps, focused);
    }
}
