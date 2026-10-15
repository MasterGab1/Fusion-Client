package fusion.runtime;

import java.util.Properties;

/** Custom texture overlay: no vanilla widgets and no always-on gameplay watermark. */
public final class ClientMenu {
    private static GuiAdapter gui;
    private static RuntimeConfig config;
    private static Properties profile;
    private static boolean failed, pendingOpen;
    private static java.lang.reflect.Method eventKey, eventState;
    private static int category;
    private static String saveError, renderedState;
    private static OverlayPainter painter;
    private static OverlayTexture texture;
    public static void legacyEvent(boolean available) {
        if (!available) return;
        try {
            if (eventKey == null) { Class<?> keyboard = Class.forName("org.lwjgl.input.Keyboard"); eventKey = keyboard.getMethod("getEventKey"); eventState = keyboard.getMethod("getEventKeyState"); }
            keyEvent((Integer)eventKey.invoke(null), (Boolean)eventState.invoke(null) ? 1 : 0);
        } catch (Exception ignored) { }
    }
    public static void keyEvent(int key, int action) {
        if (gui == null || action != 1 || key != (gui.game.drawMode.equals("legacy") ? 54 : 344)) return;
        try { if (!gui.hasScreen(gui.game.minecraft())) pendingOpen = true; } catch (Exception ignored) { }
    }
    static void tick(MinecraftAdapter game, Properties mappings, RuntimeConfig settings, Object context) {
        if (failed) return;
        try {
            config = settings; profile = mappings;
            if (gui == null) gui = new GuiAdapter(game, profile);
            Object mc = game.minecraft();
            if (pendingOpen) { pendingOpen = false; if (game.player(mc) != null && !gui.hasScreen(mc)) gui.open(mc); }
        } catch (Throwable error) { failed = true; System.err.println("[Fusion] Menu unavailable: " + error); error.printStackTrace(); }
    }
    private static int[] layout(Object screen) throws Exception {
        int width = gui.width(screen), height = gui.height(screen);
        double scale = Math.min(0.75, Math.min((width - 24) / (double)OverlayPainter.WIDTH, (height - 24) / (double)OverlayPainter.HEIGHT));
        int w = Math.max(1, (int)(OverlayPainter.WIDTH * scale)), h = Math.max(1, (int)(OverlayPainter.HEIGHT * scale));
        return new int[] { (width - w) / 2, (height - h) / 2, w, h };
    }
    private static int control(int[] a, double mx, double my) { return OverlayPainter.control((mx - a[0]) * OverlayPainter.WIDTH / a[2], (my - a[1]) * OverlayPainter.HEIGHT / a[3], category); }
    private static void toggle(int id) { if (id == 0) config.watermark = !config.watermark; else if (id == 1) config.focus = !config.focus; else config.particles = !config.particles; save(); }
    private static void save() {
        try { config.save(); saveError = null; }
        catch (Exception error) { saveError = "Could not save settings"; System.err.println("[Fusion] Settings save failed: " + error); }
    }
    public static void render(Object screen, Object ctx, int mx, int my) {
        if (gui == null) return;
        try {
            int[] a = layout(screen); int hover = control(a, mx, my);
            if (painter == null) painter = new OverlayPainter();
            if (texture == null) texture = new OverlayTexture(gui.game, profile);
            String state = category + ":" + hover + ":" + config.watermark + ":" + config.focus + ":" + config.particles + ":" + config.backgroundFps + ":" + config.particleDistance + ":" + config.accent + ":" + saveError;
            if (!state.equals(renderedState)) {
                texture.upload(painter.paint(config, category, hover, profile.getProperty("version"), saveError, 2)); renderedState = state;
            }
            gui.rect(ctx, 0, 0, gui.width(screen), gui.height(screen), 0x9006090f);
            texture.draw(ctx, a[0], a[1], a[2], a[3]);
        } catch (Throwable error) { System.err.println("[Fusion] Menu render failed: " + error); error.printStackTrace(); try { gui.close(); } catch (Exception ignored) { } }
    }
    public static boolean click(Object screen, double mx, double my, int button) {
        if (gui == null || button != 0) return false;
        try {
            int id = control(layout(screen), mx, my);
            if (id == 1) gui.close();
            else if (id >= 10 && id <= 12) category = id - 10;
            else if (id >= 20 && id <= 22) toggle(id - 20);
            else if (id == 31 || id == 41) { config.backgroundFps = Math.max(5, Math.min(60, config.backgroundFps + (id == 31 ? -5 : 5))); save(); }
            else if (id == 32 || id == 42) { config.particleDistance = Math.max(8, Math.min(64, config.particleDistance + (id == 32 ? -4 : 4))); save(); }
        } catch (Exception error) { System.err.println("[Fusion] Menu input failed: " + error); }
        return true;
    }
    public static boolean key(int code) {
        try {
            boolean legacy = gui.game.drawMode.equals("legacy");
            if (code == (legacy ? 1 : 256) || code == (legacy ? 54 : 344)) gui.close();
            else if (legacy && code >= 2 && code <= 4) toggle(code - 2);
            else if (!legacy && code >= 49 && code <= 51) toggle(code - 49);
        } catch (Exception error) { System.err.println("[Fusion] Menu key failed: " + error); }
        return true;
    }
    public static void closed() {
        try { if (texture != null) texture.close(); } catch (Exception error) { System.err.println("[Fusion] Texture cleanup failed: " + error); }
        texture = null; renderedState = null;
    }
}
