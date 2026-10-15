package fusion.runtime;
import java.util.Properties;
public final class RuntimeTests {
    private static void check(boolean condition) { if (!condition) throw new AssertionError(); }
    public static void main(String[] args) throws Exception {
        check(BackgroundFpsMod.cappedLimit(144, 30, false) == 30);
        check(BackgroundFpsMod.cappedLimit(15, 30, false) == 15);
        check(BackgroundFpsMod.cappedLimit(144, 30, true) == 144);
        check(BackgroundFpsMod.cappedLimit(0, 30, false) == 30);
        check(!ParticleDistanceMod.outside(8, 0, 0, 8));
        check(ParticleDistanceMod.outside(8, 1, 0, 8));
        check(ParticleDistanceMod.outside(-100, 0, 0, 24));
        Properties p = new Properties(); p.setProperty("backgroundFps", "9999"); p.setProperty("particleDistance", "invalid"); p.setProperty("watermark", "false");
        RuntimeConfig config = new RuntimeConfig(p);
        check(config.backgroundFps == 60 && config.particleDistance == 24 && !config.watermark && config.focus);
        java.nio.file.Path file = java.nio.file.Files.createTempFile("fusion-runtime", ".properties");
        try {
            System.setProperty("fusion.config", file.toString());
            config.backgroundFps = 15; config.particles = false; config.save();
            RuntimeConfig restored = RuntimeConfig.load();
            check(restored.backgroundFps == 15 && !restored.particles && !restored.watermark);
        } finally { java.nio.file.Files.deleteIfExists(file); System.clearProperty("fusion.config"); }
        System.out.println("PASS: background FPS restore/caps, particle radius boundaries, bounded configuration and in-game persistence.");
    }
}
