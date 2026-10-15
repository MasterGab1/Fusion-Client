package fusion.runtime;

import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;

/** Resolution-independent launcher styling, rasterized only when the menu changes. */
final class OverlayPainter {
    static final int WIDTH = 800, HEIGHT = 500;
    private final Font regular, semibold;
    private final BufferedImage logo;
    OverlayPainter() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/Inter-Regular.ttf")) { regular = Font.createFont(Font.TRUETYPE_FONT, in); }
        try (InputStream in = getClass().getResourceAsStream("/Inter-Semibold.ttf")) { semibold = Font.createFont(Font.TRUETYPE_FONT, in); }
        try (InputStream in = getClass().getResourceAsStream("/logo-white.png")) { logo = ImageIO.read(in); }
    }
    static int[] visible(int category) { return category == 1 ? new int[] { 0 } : category == 2 ? new int[] { 1, 2 } : new int[] { 0, 1, 2 }; }
    static boolean hit(double x, double y, int left, int top, int w, int h) { return x >= left && y >= top && x < left + w && y < top + h; }
    // Stable control IDs also drive hover repainting and mouse hit testing.
    static int control(double x, double y, int category) {
        if (hit(x, y, 752, 20, 28, 28) || hit(x, y, 642, 452, 130, 30)) return 1;
        for (int i = 0; i < 3; i++) if (hit(x, y, 12, 87 + i * 52, 36, 36)) return 10 + i;
        int index = 0;
        for (int id : visible(category)) {
            int cx = 84 + index++ * 232;
            if (hit(x, y, cx + 160, 170, 36, 22)) return 20 + id;
            if (id > 0) {
                if (hit(x, y, cx + 16, 344, 30, 30)) return 30 + id;
                if (hit(x, y, cx + 166, 344, 30, 30)) return 40 + id;
            }
        }
        return 0;
    }
    private void text(Graphics2D g, String value, float size, boolean bold, int x, int baseline, Color color) {
        g.setFont((bold ? semibold : regular).deriveFont(size)); g.setColor(color); g.drawString(value, x, baseline);
    }
    private static Color color(int rgb) { return new Color(rgb); }
    private static void round(Graphics2D g, int x, int y, int w, int h, int radius, Color c) {
        g.setColor(c); g.fill(new RoundRectangle2D.Float(x, y, w, h, radius, radius));
    }
    private static void line(Graphics2D g, int x, int y, int x2, int y2, Color c) { g.setColor(c); g.drawLine(x, y, x2, y2); }
    private static void icon(Graphics2D g, int id, int x, int y, Color c) {
        Graphics2D p = (Graphics2D)g.create(); p.translate(x, y); p.setColor(c); p.setStroke(new BasicStroke(1.65f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        if (id == 0) { for (int row = 0; row < 2; row++) for (int col = 0; col < 2; col++) p.draw(new RoundRectangle2D.Float(2 + col * 11, 2 + row * 11, 7, 7, 2, 2)); }
        else if (id == 1) { p.draw(new RoundRectangle2D.Float(1, 3, 21, 15, 3, 3)); p.drawLine(8, 22, 16, 22); p.drawLine(12, 18, 12, 22); }
        else if (id == 2) { p.draw(new RoundRectangle2D.Float(5, 5, 14, 14, 3, 3)); p.drawRect(9, 9, 6, 6); for (int v = 8; v <= 16; v += 4) { p.drawLine(v, 1, v, 5); p.drawLine(v, 19, v, 23); p.drawLine(1, v, 5, v); p.drawLine(19, v, 23, v); } }
        else if (id == 3) { Path2D moon = new Path2D.Float(); moon.moveTo(16, 2); moon.curveTo(2, -1, -1, 18, 12, 22); moon.curveTo(18, 24, 23, 20, 23, 15); moon.curveTo(14, 18, 9, 9, 16, 2); p.draw(moon); }
        else { Path2D star = new Path2D.Float(); star.moveTo(11, 2); star.lineTo(14, 9); star.lineTo(21, 12); star.lineTo(14, 15); star.lineTo(11, 22); star.lineTo(8, 15); star.lineTo(1, 12); star.lineTo(8, 9); star.closePath(); p.draw(star); p.drawLine(21, 1, 21, 6); p.drawLine(18, 3, 24, 3); }
        p.dispose();
    }
    BufferedImage paint(RuntimeConfig config, int category, int hover, String version, String message, int scale) {
        BufferedImage image = new BufferedImage(WIDTH * scale, HEIGHT * scale, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        try {
            g.scale(scale, scale);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            Color bg = color(0x111214), card = color(0x1b1d22), border = color(0x30323a), muted = color(0x90949f), white = color(0xf4f4f6);
            Color accent = color(config.accent.equals("blue") ? 0x72a9ee : config.accent.equals("violet") ? 0xb398ee : 0xed78a5);
            round(g, 1, 1, 798, 498, 20, bg); g.setColor(border); g.draw(new RoundRectangle2D.Float(1, 1, 797, 497, 20, 20));
            line(g, 1, 63, 798, 63, border); line(g, 60, 64, 60, 498, border);
            if (config.watermark) g.drawImage(logo, 18, 15, 32, 32, null);
            text(g, "FUSION", 14, true, config.watermark ? 62 : 20, 36, white);
            text(g, "MINECRAFT " + version, 10, true, 575, 36, muted);
            if (hover == 1) round(g, 752, 20, 28, 28, 8, card);
            g.setStroke(new BasicStroke(1.5f)); line(g, 761, 29, 771, 39, muted); line(g, 771, 29, 761, 39, muted);
            String[] categories = { "All mods", "HUD", "Performance" };
            for (int i = 0; i < 3; i++) {
                if (category == i || hover == 10 + i) round(g, 12, 87 + i * 52, 36, 36, 10, category == i ? new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 28) : card);
                if (category == i) round(g, 1, 96 + i * 52, 3, 18, 3, accent);
                icon(g, i, 18, 93 + i * 52, category == i ? accent : muted);
            }
            text(g, category == 0 ? "Mods" : categories[category], 25, true, 84, 110, white);
            text(g, visible(category).length + " modules", 12, false, 84, 133, muted);
            text(g, "FUSION PROFILE", 10, true, 665, 108, muted);
            String[] titles = { "Menu watermark", "Focus", "Particles" };
            String[][] descriptions = { { "White Fusion logo.", "Visible only in this menu." }, { "Lower the frame rate while", "Minecraft is in the background." }, { "Limit distant particle effects", "to reduce rendering work." } };
            int index = 0;
            for (int id : visible(category)) {
                int cx = 84 + index++ * 232; boolean on = id == 0 ? config.watermark : id == 1 ? config.focus : config.particles;
                round(g, cx, 154, 216, 240, 14, card); g.setColor(border); g.draw(new RoundRectangle2D.Float(cx, 154, 216, 240, 14, 14));
                round(g, cx + 16, 170, 44, 44, 12, color(0x29252e)); icon(g, id == 0 ? 1 : id == 1 ? 3 : 4, cx + 26, 180, accent);
                round(g, cx + 160, 172, 36, 20, 20, on ? accent : color(0x43464f));
                g.setColor(on ? bg : muted); g.fillOval(cx + (on ? 179 : 163), 175, 14, 14);
                if (hover == 20 + id) { g.setColor(white); g.setStroke(new BasicStroke(1)); g.draw(new RoundRectangle2D.Float(cx + 158, 170, 40, 24, 24, 24)); }
                text(g, titles[id], 17, true, cx + 16, 247, white);
                text(g, descriptions[id][0], 11, false, cx + 16, 271, muted); text(g, descriptions[id][1], 11, false, cx + 16, 289, muted);
                line(g, cx + 16, 313, cx + 200, 313, border);
                if (id == 0) { text(g, on ? "Shown in menus" : "Hidden", 12, true, cx + 16, 352, on ? accent : muted); text(g, "Gameplay stays clear", 10, false, cx + 16, 372, muted); }
                else {
                    text(g, id == 1 ? "BACKGROUND LIMIT" : "RENDER DISTANCE", 9, true, cx + 16, 335, muted);
                    round(g, cx + 16, 344, 30, 30, 8, hover == 30 + id ? color(0x41444e) : color(0x292c33));
                    round(g, cx + 166, 344, 30, 30, 8, hover == 40 + id ? color(0x41444e) : color(0x292c33));
                    text(g, "−", 18, false, cx + 25, 365, white); text(g, "+", 18, false, cx + 174, 365, white);
                    String value = id == 1 ? config.backgroundFps + " FPS" : config.particleDistance + " blocks";
                    g.setFont(semibold.deriveFont(13f)); int valueWidth = g.getFontMetrics().stringWidth(value);
                    text(g, value, 13, true, cx + (216 - valueWidth) / 2, 364, white);
                }
            }
            line(g, 60, 438, 799, 438, border);
            text(g, message == null ? "Changes save automatically" : message, 11, false, 84, 471, muted);
            round(g, 642, 452, 130, 30, 8, hover == 1 ? color(0x34313a) : card);
            round(g, 651, 458, 25, 18, 5, color(0x30323b)); text(g, "Esc", 9, true, 656, 471, muted); text(g, "Back to game", 11, true, 684, 472, white);
            if (hover >= 10 && hover <= 12) { int y = 93 + (hover - 10) * 52; round(g, 55, y, 112, 25, 7, color(0x35313c)); text(g, categories[hover - 10], 11, true, 66, y + 17, white); }
        } finally { g.dispose(); }
        return image;
    }
}
