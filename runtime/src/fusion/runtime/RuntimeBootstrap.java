package fusion.runtime;

import java.io.InputStream;
import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;
import java.util.Properties;
import org.objectweb.asm.*;

/** Fusion's own client hooks. Game JARs on disk are never modified. */
public final class RuntimeBootstrap {
    public static void install(String version, Instrumentation instrumentation, final String loaderKind) throws Exception {
        final Properties profile = new Properties();
        String folder = loaderKind.equals("vanilla") ? "/profiles/" : "/loader-profiles/" + loaderKind + "/";
        try (InputStream input = RuntimeBootstrap.class.getResourceAsStream(folder + version + ".properties")) {
            if (input == null) throw new IllegalArgumentException("Unsupported Fusion runtime version: " + version);
            profile.load(input);
        }
        Hooks.initialize(profile, RuntimeConfig.load());
        instrumentation.addTransformer(new ClassFileTransformer() {
            @Override public byte[] transform(ClassLoader loader, String name, Class<?> type, ProtectionDomain domain, byte[] bytes) {
                if (name == null) return null;
                if (loaderKind.equals("fabric") && name.equals("net/fabricmc/loader/impl/launch/knot/KnotClassLoader")) return parentBridge(bytes);
                String target = null;
                for (String key : new String[] { "hud", "fps", "particle", "keyboard" }) if (name.equals(profile.getProperty(key + ".class"))) target = key;
                if (loaderKind.equals("forge") && (name.equals("net/minecraftforge/client/GuiIngameForge") || name.equals("net/minecraftforge/client/gui/ForgeIngameGui") || name.equals("net/minecraftforge/client/gui/overlay/ForgeGui"))) target = "hud";
                if (target == null) return null;
                Hooks.bindLoader(loader);
                final String hook = target;
                try {
                    ClassReader reader = new ClassReader(bytes);
                    ClassWriter writer = new ClassWriter(reader, ClassWriter.COMPUTE_MAXS);
                    final int[] matches = { 0 };
                    reader.accept(new ClassVisitor(Opcodes.ASM9, writer) {
                        @Override public MethodVisitor visitMethod(int access, String method, String descriptor, String signature, String[] exceptions) {
                            MethodVisitor original = super.visitMethod(access, method, descriptor, signature, exceptions);
                            if (profile.getProperty("draw.mode").equals("legacy") && name.equals(profile.getProperty("mc.class"))) {
                                original = new MethodVisitor(Opcodes.ASM9, original) {
                                    @Override public void visitMethodInsn(int op, String owner, String name, String desc, boolean itf) {
                                        super.visitMethodInsn(op, owner, name, desc, itf);
                                        if (op == Opcodes.INVOKESTATIC && owner.equals("org/lwjgl/input/Keyboard") && name.equals("next") && desc.equals("()Z")) {
                                            super.visitInsn(Opcodes.DUP);
                                            super.visitMethodInsn(Opcodes.INVOKESTATIC, "fusion/runtime/ClientMenu", "legacyEvent", "(Z)V", false);
                                        }
                                    }
                                };
                            }
                            if (!method.equals(profile.getProperty(hook + ".method")) || !descriptor.equals(profile.getProperty(hook + ".desc"))) return original;
                            matches[0]++;
                            return new MethodVisitor(Opcodes.ASM9, original) {
                                @Override public void visitCode() {
                                    super.visitCode();
                                    if (hook.equals("keyboard")) {
                                        if (profile.containsKey("input.key.class")) {
                                            super.visitVarInsn(Opcodes.ALOAD, 4);
                                            super.visitMethodInsn(Opcodes.INVOKEVIRTUAL, profile.getProperty("input.key.class"), profile.getProperty("input.key.method"), "()I", false);
                                            super.visitVarInsn(Opcodes.ILOAD, 3);
                                        } else { super.visitVarInsn(Opcodes.ILOAD, 3); super.visitVarInsn(Opcodes.ILOAD, 5); }
                                        super.visitMethodInsn(Opcodes.INVOKESTATIC, "fusion/runtime/ClientMenu", "keyEvent", "(II)V", false);
                                    }
                                    if (hook.equals("hud")) {
                                        if (profile.getProperty("draw.mode").equals("legacy")) super.visitInsn(Opcodes.ACONST_NULL); else super.visitVarInsn(Opcodes.ALOAD, 1);
                                        super.visitMethodInsn(Opcodes.INVOKESTATIC, "fusion/runtime/Hooks", "beginHud", "(Ljava/lang/Object;)V", false);
                                    }
                                    if (hook.equals("particle")) { super.visitVarInsn(Opcodes.ALOAD, 1); super.visitMethodInsn(Opcodes.INVOKESTATIC, "fusion/runtime/Hooks", "particle", "(Ljava/lang/Object;)V", false); }
                                }
                                @Override public void visitInsn(int opcode) {
                                    if (hook.equals("hud") && opcode == Opcodes.RETURN) {
                                        // Obfuscators can end methods with a dead return whose locals
                                        // have been cleared. Capture the context at entry instead.
                                        super.visitMethodInsn(Opcodes.INVOKESTATIC, "fusion/runtime/Hooks", "endHud", "()V", false);
                                    }
                                    if (hook.equals("fps") && opcode == Opcodes.IRETURN) super.visitMethodInsn(Opcodes.INVOKESTATIC, "fusion/runtime/Hooks", "limitFps", "(I)I", false);
                                    super.visitInsn(opcode);
                                }
                            };
                        }
                    }, 0);
                    if (matches[0] != 1) throw new IllegalStateException("Expected exactly one " + hook + " target, got " + matches[0]);
                    System.out.println("[Fusion] Installed " + hook + " hook for " + version);
                    return writer.toByteArray();
                } catch (Throwable error) { System.err.println("[Fusion] Could not install " + hook + ": " + error); return null; }
            }
        });
        System.out.println("[Fusion] Runtime 0.5.0 loaded for Minecraft " + version);
    }
    private static byte[] parentBridge(byte[] bytes) {
        ClassReader reader = new ClassReader(bytes);
        ClassWriter writer = new ClassWriter(reader, ClassWriter.COMPUTE_MAXS);
        reader.accept(new ClassVisitor(Opcodes.ASM9, writer) {
            @Override public MethodVisitor visitMethod(int access, String name, String desc, String signature, String[] exceptions) {
                MethodVisitor next = super.visitMethod(access, name, desc, signature, exceptions);
                if (!name.equals("loadClass") || !desc.equals("(Ljava/lang/String;Z)Ljava/lang/Class;")) return next;
                return new MethodVisitor(Opcodes.ASM9, next) {
                    @Override public void visitCode() {
                        super.visitCode(); Label original = new Label();
                        super.visitVarInsn(Opcodes.ALOAD, 1); super.visitLdcInsn("fusion.runtime.");
                        super.visitMethodInsn(Opcodes.INVOKEVIRTUAL,"java/lang/String","startsWith","(Ljava/lang/String;)Z",false);
                        super.visitJumpInsn(Opcodes.IFEQ,original);
                        super.visitVarInsn(Opcodes.ALOAD,1); super.visitInsn(Opcodes.ICONST_0); super.visitInsn(Opcodes.ACONST_NULL);
                        super.visitMethodInsn(Opcodes.INVOKESTATIC,"java/lang/Class","forName","(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;",false);
                        super.visitInsn(Opcodes.ARETURN); super.visitLabel(original); super.visitFrame(Opcodes.F_SAME,0,null,0,null);
                    }
                };
            }
        },0);
        return writer.toByteArray();
    }
}
