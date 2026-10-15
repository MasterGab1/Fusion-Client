package fusion.runtime;

import java.lang.reflect.*;
import java.util.*;
import java.io.*;
import org.objectweb.asm.*;

final class GuiAdapter {
    final MinecraftAdapter game;
    private final Properties p;
    private final Field currentScreen, width, height;
    private final Method setScreen, fill;
    private final Constructor<?> constructor;
    private final Object title;
    GuiAdapter(MinecraftAdapter game, Properties p) throws Exception {
        this.game = game; this.p = p;
        Class<?> mc = game.type("mc.class"), screen = game.type("screen.class");
        currentScreen = MinecraftAdapter.field(mc, p.getProperty("mc.screen"));
        width = MinecraftAdapter.field(screen, p.getProperty("screen.width")); height = MinecraftAdapter.field(screen, p.getProperty("screen.height"));
        setScreen = mc.getMethod(p.getProperty("mc.setScreen"), screen);
        boolean legacy = game.drawMode.equals("legacy");
        Method found = null;
        for (Method m : game.type("fill.class").getDeclaredMethods()) {
            Class<?>[] a = m.getParameterTypes(); int count = game.drawMode.equals("pose") ? 6 : 5;
            boolean matches = m.getName().equals(p.getProperty("fill.method")) && a.length == count;
            if (matches) for (int i = game.drawMode.equals("pose") ? 1 : 0; i < a.length; i++) if (a[i] != int.class) matches = false;
            if (matches && Modifier.isStatic(m.getModifiers()) == !game.drawMode.equals("gui")) { found = m; break; }
        }
        if (found == null) throw new NoSuchMethodException("Fusion rectangle renderer");
        found.setAccessible(true); fill = found;
        if (legacy) { title = null; }
        else {
            Class<?> component = game.type("screen.title.class");
            title = p.getProperty("screen.title.method").equals("new") ? component.getConstructor(String.class).newInstance("Fusion") : component.getMethod(p.getProperty("screen.title.method"), String.class).invoke(null, "Fusion");
        }
        constructor = new ScreenLoader(screen.getClassLoader()).define(screenBytes(p, legacy)).getConstructor(Object.class);
    }
    boolean hasScreen(Object mc) throws Exception { return currentScreen.get(mc) != null; }
    void open(Object mc) throws Exception { setScreen.invoke(mc, constructor.newInstance(title)); System.out.println("[Fusion] Mod menu opened"); }
    void close() throws Exception { setScreen.invoke(game.minecraft(), new Object[] { null }); }
    int width(Object screen) throws Exception { return width.getInt(screen); }
    int height(Object screen) throws Exception { return height.getInt(screen); }
    void rect(Object context, int x, int y, int right, int bottom, int color) throws Exception {
        if (game.drawMode.equals("pose")) fill.invoke(null, context, x, y, right, bottom, color);
        else fill.invoke(game.drawMode.equals("legacy") ? null : context, x, y, right, bottom, color);
    }
    private static final class ScreenLoader extends ClassLoader {
        ScreenLoader(ClassLoader parent) { super(parent); }
        Class<?> define(byte[] code) { return defineClass("fusion.generated.ModScreen", code, 0, code.length); }
    }
    private static byte[] screenBytes(Properties p, boolean legacy) {
        String name = "fusion/generated/ModScreen", parent = p.getProperty("screen.class"), hooks = "fusion/runtime/ClientMenu";
        ClassWriter w = new ClassWriter(ClassWriter.COMPUTE_MAXS); w.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC, name, null, parent, null);
        MethodVisitor m = w.visitMethod(Opcodes.ACC_PUBLIC, "<init>", "(Ljava/lang/Object;)V", null, null); m.visitCode(); m.visitVarInsn(Opcodes.ALOAD, 0);
        if (!legacy) { m.visitVarInsn(Opcodes.ALOAD, 1); m.visitTypeInsn(Opcodes.CHECKCAST, p.getProperty("screen.component")); }
        m.visitMethodInsn(Opcodes.INVOKESPECIAL, parent, "<init>", legacy ? "()V" : "(L" + p.getProperty("screen.component") + ";)V", false); m.visitInsn(Opcodes.RETURN); finish(m);
        m = w.visitMethod(Opcodes.ACC_PUBLIC, p.getProperty("screen.render"), p.getProperty("screen.render.desc"), null, null); m.visitCode(); m.visitVarInsn(Opcodes.ALOAD, 0);
        if (legacy) m.visitInsn(Opcodes.ACONST_NULL); else m.visitVarInsn(Opcodes.ALOAD, 1);
        m.visitVarInsn(Opcodes.ILOAD, legacy ? 1 : 2); m.visitVarInsn(Opcodes.ILOAD, legacy ? 2 : 3);
        m.visitMethodInsn(Opcodes.INVOKESTATIC, hooks, "render", "(Ljava/lang/Object;Ljava/lang/Object;II)V", false); m.visitInsn(Opcodes.RETURN); finish(m);
        String click = p.getProperty("screen.click.desc"), keyDesc = p.getProperty("screen.key.desc");
        boolean records = click.startsWith("(L");
        m = w.visitMethod(Opcodes.ACC_PUBLIC, p.getProperty("screen.click"), click, null, null); m.visitCode(); m.visitVarInsn(Opcodes.ALOAD, 0);
        if (records) {
            String event = org.objectweb.asm.Type.getArgumentTypes(click)[0].getInternalName();
            for (String method : new String[] { "x", "y", "button" }) { m.visitVarInsn(Opcodes.ALOAD, 1); m.visitMethodInsn(Opcodes.INVOKEVIRTUAL, event, p.getProperty("input.mouse." + method, method), method.equals("button") ? "()I" : "()D", false); }
        } else if (legacy) { m.visitVarInsn(Opcodes.ILOAD, 1); m.visitInsn(Opcodes.I2D); m.visitVarInsn(Opcodes.ILOAD, 2); m.visitInsn(Opcodes.I2D); m.visitVarInsn(Opcodes.ILOAD, 3); }
        else { m.visitVarInsn(Opcodes.DLOAD, 1); m.visitVarInsn(Opcodes.DLOAD, 3); m.visitVarInsn(Opcodes.ILOAD, 5); }
        m.visitMethodInsn(Opcodes.INVOKESTATIC, hooks, "click", "(Ljava/lang/Object;DDI)Z", false); if (legacy) m.visitInsn(Opcodes.POP); m.visitInsn(legacy ? Opcodes.RETURN : Opcodes.IRETURN); finish(m);
        m = w.visitMethod(Opcodes.ACC_PUBLIC, p.getProperty("screen.key"), keyDesc, null, null); m.visitCode();
        if (records) { m.visitVarInsn(Opcodes.ALOAD, 1); m.visitMethodInsn(Opcodes.INVOKEVIRTUAL, org.objectweb.asm.Type.getArgumentTypes(keyDesc)[0].getInternalName(), p.getProperty("input.key.method", "key"), "()I", false); }
        else m.visitVarInsn(Opcodes.ILOAD, legacy ? 2 : 1);
        m.visitMethodInsn(Opcodes.INVOKESTATIC, hooks, "key", "(I)Z", false); if (legacy) m.visitInsn(Opcodes.POP); m.visitInsn(legacy ? Opcodes.RETURN : Opcodes.IRETURN); finish(m);
        m = w.visitMethod(Opcodes.ACC_PUBLIC, p.getProperty("screen.pause"), "()Z", null, null); m.visitCode(); m.visitInsn(Opcodes.ICONST_0); m.visitInsn(Opcodes.IRETURN); finish(m);
        m = w.visitMethod(Opcodes.ACC_PUBLIC, p.getProperty("screen.closed"), "()V", null, null); m.visitCode();
        m.visitVarInsn(Opcodes.ALOAD, 0); m.visitMethodInsn(Opcodes.INVOKESPECIAL, parent, p.getProperty("screen.closed"), "()V", false);
        m.visitMethodInsn(Opcodes.INVOKESTATIC, hooks, "closed", "()V", false); m.visitInsn(Opcodes.RETURN); finish(m);
        w.visitEnd(); return w.toByteArray();
    }
    private static void finish(MethodVisitor m) { m.visitMaxs(0, 0); m.visitEnd(); }
}
