package fusion.runtime;
import java.util.Properties;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.File;

public final class OverlayTests {
    private static void check(boolean value) { if (!value) throw new AssertionError(); }
    public static void main(String[] args) throws Exception {
        OverlayPainter painter = new OverlayPainter(); Properties p = new Properties(); p.setProperty("accent", "pink");
        RuntimeConfig config = new RuntimeConfig(p);
        BufferedImage image = painter.paint(config, 0, 0, "1.8.9", null, 2);
        check(image.getWidth() == 1600 && image.getHeight() == 1000);
        check((image.getRGB(0, 0) >>> 24) == 0);
        check(OverlayPainter.control(390, 147, 0) == 20);
        check(OverlayPainter.control(740, 147, 0) == 21);
        check(OverlayPainter.control(390, 225, 0) == 22);
        check(OverlayPainter.control(640, 177, 0) == 31);
        check(OverlayPainter.control(27, 155, 0) == 11);
        check(OverlayPainter.control(700, 467, 0) == 0);
        check(OverlayPainter.control(637, 465, 0) == 60);
        check(OverlayPainter.control(756, 465, 0) == 61);
        check(OverlayPainter.control(390, 303, 0) == 24);
        config.watermark = false;
        BufferedImage hidden = painter.paint(config, 0, 0, "1.8.9", null, 2);
        int changed = 0;
        for (int y = 30; y < 94; y++) for (int x = 36; x < 100; x++) if (image.getRGB(x, y) != hidden.getRGB(x, y)) changed++;
        check(changed > 100);
        if (args.length > 0) { new File(args[0]).mkdirs(); ImageIO.write(image, "png", new File(args[0], "overlay.png")); ImageIO.write(hidden, "png", new File(args[0], "overlay-no-logo.png")); }
        System.out.println("PASS: overlay resolution, transparency, hit regions and menu-logo visibility.");
    }
}
