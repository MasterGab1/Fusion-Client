package fusion.runtime;

import java.lang.reflect.*;
import java.util.Properties;

/** Version names are resolved once. No game reflection lookup runs per frame. */
final class MinecraftAdapter {
    private final Properties p;
    private final Method instance, active, fpsMethod, draw, remove;
    private final Field font, player, options, hidden, fpsField;
    private final Field[] particlePosition = new Field[3], entityPosition = new Field[3];
    private final Method[] entityCoordinate = new Method[3];
    final String drawMode;
    MinecraftAdapter(Properties profile) throws Exception {
        p = profile;
        Class<?> mc = type("mc.class"), particle = type("particle.base"), entity = type("entity.class");
        instance = method(mc, p.getProperty("mc.instance"));
        font = field(mc, p.getProperty("mc.font")); player = field(mc, p.getProperty("mc.player")); options = field(mc, p.getProperty("mc.options"));
        hidden = field(options.getType(), p.getProperty("hide.field"));
        fpsField = p.containsKey("mc.fps.field") ? field(mc, p.getProperty("mc.fps.field")) : null;
        fpsMethod = fpsField == null ? method(mc, p.getProperty("mc.fps.method")) : null;
        active = p.getProperty("mc.focus").equals("lwjgl2") ? method(Class.forName("org.lwjgl.opengl.Display"), "isActive") : method(mc, p.getProperty("mc.focus"));
        drawMode = p.getProperty("draw.mode");
        Class<?> drawClass = type("draw.class");
        Method found = null;
        for (Method m : drawClass.getDeclaredMethods()) {
            Class<?>[] args = m.getParameterTypes();
            int count = drawMode.equals("legacy") ? 4 : drawMode.equals("pose") ? 5 : 6;
            int stringIndex = drawMode.equals("legacy") ? 0 : 1;
            if (m.getName().equals(p.getProperty("draw.method")) && args.length == count && args[stringIndex] == String.class && (drawMode.equals("gui") ? args[5] == boolean.class : args[stringIndex + 1] == float.class)) { found = m; break; }
        }
        if (found == null) throw new NoSuchMethodException("Fusion text renderer");
        found.setAccessible(true); draw = found;
        remove = method(particle, p.getProperty("particle.remove"));
        String[] axes = { "x", "y", "z" };
        for (int i = 0; i < 3; i++) {
            particlePosition[i] = field(particle, p.getProperty("particle." + axes[i]));
            if (p.getProperty("entity.mode").equals("fields")) entityPosition[i] = field(entity, p.getProperty("entity." + axes[i]));
            else entityCoordinate[i] = method(entity, p.getProperty("entity." + axes[i]));
        }
    }
    Class<?> type(String key) throws ClassNotFoundException { return Class.forName(p.getProperty(key).replace('/', '.')); }
    static Field field(Class<?> type, String name) throws NoSuchFieldException {
        for (Class<?> c = type; c != null; c = c.getSuperclass()) try { Field f = c.getDeclaredField(name); f.setAccessible(true); return f; } catch (NoSuchFieldException ignored) { }
        throw new NoSuchFieldException(type.getName() + "." + name);
    }
    static Method method(Class<?> type, String name) throws NoSuchMethodException {
        for (Class<?> c = type; c != null; c = c.getSuperclass()) try { Method m = c.getDeclaredMethod(name); m.setAccessible(true); return m; } catch (NoSuchMethodException ignored) { }
        throw new NoSuchMethodException(type.getName() + "." + name);
    }
    Object minecraft() throws Exception { return instance.invoke(null); }
    Object player(Object mc) throws Exception { return player.get(mc); }
    boolean focused(Object mc) throws Exception { return (Boolean) active.invoke(Modifier.isStatic(active.getModifiers()) ? null : mc); }
    boolean hideHud(Object mc) throws Exception { return hidden.getBoolean(options.get(mc)); }
    int fps(Object mc) throws Exception { return fpsField != null ? fpsField.getInt(Modifier.isStatic(fpsField.getModifiers()) ? null : mc) : ((Number) fpsMethod.invoke(mc)).intValue(); }
    void text(Object mc, Object context, String value, int x, int y, int color) throws Exception {
        Object renderer = font.get(mc);
        if (drawMode.equals("legacy")) draw.invoke(renderer, value, (float)x, (float)y, color);
        else if (drawMode.equals("pose")) draw.invoke(renderer, context, value, (float)x, (float)y, color);
        else draw.invoke(context, renderer, value, x, y, color, true);
    }
    double coordinate(Object player, int axis) throws Exception { return entityPosition[axis] != null ? entityPosition[axis].getDouble(player) : ((Number) entityCoordinate[axis].invoke(player)).doubleValue(); }
    double particleCoordinate(Object particle, int axis) throws Exception { return particlePosition[axis].getDouble(particle); }
    void expire(Object particle) throws Exception { remove.invoke(particle); }
}
