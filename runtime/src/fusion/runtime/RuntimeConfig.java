package fusion.runtime;

import java.io.*;
import java.util.Properties;

public final class RuntimeConfig {
    public volatile boolean watermark, focus, particles;
    public volatile int backgroundFps, particleDistance;
    public final String accent;
    public final String[] mods;
    public int modPage;
    RuntimeConfig(Properties p) {
        watermark = Boolean.parseBoolean(p.getProperty("watermark", "true"));
        focus = Boolean.parseBoolean(p.getProperty("focus", "true"));
        particles = Boolean.parseBoolean(p.getProperty("particles", "true"));
        String selected = p.getProperty("accent", "pink"); accent = selected.equals("blue") || selected.equals("violet") || selected.equals("orange") || selected.equals("green") ? selected : "pink";
        backgroundFps = bounded(p, "backgroundFps", 30, 5, 60);
        particleDistance = bounded(p, "particleDistance", 24, 8, 64);
        java.util.List<String> names = new java.util.ArrayList<String>();
        String library = System.getProperty("fusion.library");
        if(library != null) try(InputStream in = new FileInputStream(library)) { Properties entries=new Properties();entries.load(in);for(int i=0;i<200&&entries.containsKey(Integer.toString(i));i++)names.add(entries.getProperty(Integer.toString(i))); } catch(IOException ignored){}
        mods=names.toArray(new String[0]);
    }
    private static int bounded(Properties p, String key, int fallback, int min, int max) {
        try { return Math.max(min, Math.min(max, Integer.parseInt(p.getProperty(key, "")))); } catch (NumberFormatException e) { return fallback; }
    }
    public static RuntimeConfig load() throws IOException {
        Properties p = new Properties();
        String file = System.getProperty("fusion.config");
        if (file != null) try (InputStream input = new FileInputStream(file)) { p.load(input); }
        return new RuntimeConfig(p);
    }
    void save() throws IOException {
        String file = System.getProperty("fusion.config");
        if (file == null) return;
        Properties p = new Properties();
        p.setProperty("watermark", Boolean.toString(watermark)); p.setProperty("focus", Boolean.toString(focus)); p.setProperty("particles", Boolean.toString(particles));
        p.setProperty("backgroundFps", Integer.toString(backgroundFps)); p.setProperty("particleDistance", Integer.toString(particleDistance));
        p.setProperty("accent", accent);
        java.nio.file.Path target = java.nio.file.Paths.get(file), temp = java.nio.file.Paths.get(file + ".tmp");
        try (OutputStream out = java.nio.file.Files.newOutputStream(temp)) { p.store(out, "Fusion in-game settings"); }
        java.nio.file.Files.move(temp, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }
}
