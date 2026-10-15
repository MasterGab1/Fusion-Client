package fusion.runtime;
import java.lang.reflect.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import fusion.internal.asm.Type;

/** Links generated screens against cached official game classes without running a game. */
public final class ScreenBindingsTest {
    static class ScreenLoader extends ClassLoader {
        ScreenLoader(ClassLoader parent) { super(parent); }
        Class<?> define(byte[] bytes) { Class<?> type = defineClass("fusion.generated.ModScreen", bytes, 0, bytes.length); resolveClass(type); return type; }
    }
    static Method declared(Class<?> owner, String name, String desc) {
        for (Method m : owner.getDeclaredMethods()) if (m.getName().equals(name) && Type.getMethodDescriptor(m).equals(desc)) return m;
        for (Class<?> i : owner.getInterfaces()) { Method m = declared(i, name, desc); if (m != null) return m; }
        return owner.getSuperclass() == null ? null : declared(owner.getSuperclass(), name, desc);
    }
    public static void main(String[] args) throws Exception {
        List<URL> urls = new ArrayList<URL>();
        for (String line : Files.readAllLines(Paths.get(args[1]))) urls.add(Paths.get(line).toUri().toURL());
        try (URLClassLoader loader = new URLClassLoader(urls.toArray(new URL[0]), ScreenBindingsTest.class.getClassLoader())) {
            Properties p = new Properties();
            try (java.io.InputStream in = Files.newInputStream(Paths.get(args[0]))) { p.load(in); }
            Class<?> screen = Class.forName(p.getProperty("screen.class").replace('/', '.'), false, loader);
            Method factory = GuiAdapter.class.getDeclaredMethod("screenBytes", Properties.class, boolean.class); factory.setAccessible(true);
            byte[] bytes = (byte[])factory.invoke(null, p, p.getProperty("draw.mode").equals("legacy"));
            Class<?> generated = new ScreenLoader(loader).define(bytes);
            generated.getDeclaredMethods(); // Forces verifier/linker resolution.
            for (String part : new String[] { "render", "click", "key", "pause", "closed" }) {
                String desc = p.getProperty("screen." + part + ".desc", part.equals("closed") ? "()V" : "()Z"), name = p.getProperty("screen." + part);
                Method original = declared(screen, name, desc), override = declared(generated, name, desc);
                if (original == null || override == null || Modifier.isFinal(original.getModifiers())) throw new AssertionError("Invalid override " + part);
            }
            for (String hook : new String[] { "hud", "fps", "particle", "keyboard" }) if (p.containsKey(hook + ".class")) Class.forName(p.getProperty(hook + ".class").replace('/', '.'), false, loader).getDeclaredMethods();
            Class<?> mc = Class.forName(p.getProperty("mc.class").replace('/', '.'), false, loader);
            mc.getMethod(p.getProperty("mc.setScreen"), screen);
            Class<?> blitOwner = Class.forName(p.getProperty("texture.blit.class").replace('/', '.'), false, loader);
            if (declared(blitOwner, p.getProperty("texture.blit"), p.getProperty("texture.blit.desc")) == null) throw new AssertionError("Texture blit target missing");
            Class<?> manager = Class.forName(p.getProperty("texture.manager.class").replace('/', '.'), false, loader);
            if (declared(manager, p.getProperty("texture.register"), p.getProperty("texture.register.desc")) == null) throw new AssertionError("Texture registration target missing");
            if (p.containsKey("keyboard.class")) {
                Class<?> keyboard = Class.forName(p.getProperty("keyboard.class").replace('/', '.'), false, loader);
                if (declared(keyboard, p.getProperty("keyboard.method"), p.getProperty("keyboard.desc")) == null) throw new AssertionError("Keyboard target missing");
            }
            System.out.println("PASS " + p.getProperty("version") + ": generated screen verifies and render/mouse/key/pause bindings match official classes.");
        }
    }
}
