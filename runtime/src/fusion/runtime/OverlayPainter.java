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
    static int[] visible(int category) { return category == 3 ? new int[0] : category == 1 ? new int[] { 0 } : category == 2 ? new int[] { 1, 2 } : new int[] { 0, 1, 2 }; }
    static boolean hit(double x, double y, int left, int top, int w, int h) { return x >= left && y >= top && x < left + w && y < top + h; }
    // Stable control IDs also drive hover repainting and mouse hit testing.
    static int control(double x, double y, int category) {
        if (hit(x, y, 752, 20, 28, 28) || hit(x, y, 642, 452, 130, 30)) return 1;
        for (int i = 0; i < 4; i++) if (hit(x, y, 12, 87 + i * 52, 36, 36)) return 10 + i;
        if(category==3){if(hit(x,y,644,401,58,25))return 50;if(hit(x,y,710,401,62,25))return 51;}
        int index = 0;
        for (int id : visible(category)) {
            int cy = 150 + index++ * 86;
            if (hit(x, y, 714, cy + 18, 38, 24)) return 20 + id;
            if (id > 0) {
                if (hit(x, y, 542, cy + 23, 26, 28)) return 30 + id;
                if (hit(x, y, 656, cy + 23, 26, 28)) return 40 + id;
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
            Color accent = color(config.accent.equals("blue") ? 0x72a9ee : config.accent.equals("violet") ? 0xb398ee : config.accent.equals("orange") ? 0xed9b54 : config.accent.equals("green") ? 0xa0cf60 : 0xed78a5);
            round(g, 1, 1, 798, 498, 20, bg); g.setColor(border); g.draw(new RoundRectangle2D.Float(1, 1, 797, 497, 20, 20));
            line(g, 1, 63, 798, 63, border); line(g, 60, 64, 60, 498, border);
            if (config.watermark) g.drawImage(logo, 18, 15, 32, 32, null);
            text(g, "FUSION", 14, true, config.watermark ? 62 : 20, 36, white);
            text(g, "MINECRAFT " + version, 10, true, 575, 36, muted);
            if (hover == 1) round(g, 752, 20, 28, 28, 8, card);
            g.setStroke(new BasicStroke(1.5f)); line(g, 761, 29, 771, 39, muted); line(g, 771, 29, 761, 39, muted);
            String[] categories = { "Fusion", "HUD", "Performance", "Installed mods" };
            for (int i = 0; i < 4; i++) {
                if (category == i || hover == 10 + i) round(g, 12, 87 + i * 52, 36, 36, 10, category == i ? new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 28) : card);
                if (category == i) round(g, 1, 96 + i * 52, 3, 18, 3, accent);
                icon(g, i, 18, 93 + i * 52, category == i ? accent : muted);
            }
            text(g, category == 0 ? "Mods" : categories[category], 25, true, 84, 110, white);
            text(g, category==3 ? config.mods.length+" third-party mods · manage downloads in the launcher" : "Your settings apply immediately", 11, false, 84, 131, muted);
            if(category==3){
                int start=config.modPage*5;
                for(int i=start;i<Math.min(start+5,config.mods.length);i++){
                    int cy=150+(i-start)*49;round(g,84,cy,688,42,9,card);icon(g,0,99,cy+9,muted);
                    String label=config.mods[i];g.setFont(regular.deriveFont(12f));while(label.length()>1&&g.getFontMetrics().stringWidth(label)>600)label=label.substring(0,label.length()-2)+"…";
                    text(g,label,12,false,139,cy+26,white);
                }
                if(config.mods.length==0)text(g,"Install mods from Discover in the launcher.",13,false,104,192,muted);
                text(g,"Page "+(config.modPage+1)+" / "+Math.max(1,(config.mods.length+4)/5),11,false,84,419,muted);
                round(g,644,401,58,25,7,card);round(g,710,401,62,25,7,card);text(g,"Previous",10,false,651,418,muted);text(g,"Next",10,false,728,418,muted);
            }
            String[] titles = { "Menu logo", "Background FPS", "Particle distance" };
            String[] descriptions = { "Fusion branding inside this menu only", "Lower the frame rate when you switch apps", "Expire particles beyond the selected distance" };
            int index = 0;
            for (int id : visible(category)) {
                int cy = 150 + index++ * 86;
                boolean on = id == 0 ? config.watermark : id == 1 ? config.focus : config.particles;
                round(g, 84, cy, 688, 74, 12, card);
                g.setColor(border);g.draw(new RoundRectangle2D.Float(84,cy,688,74,12,12));
                round(g,100,cy+17,40,40,10,color(0x242a35));icon(g,id==0?1:id==1?3:4,108,cy+25,on?accent:muted);
                text(g,titles[id],14,true,154,cy+30,white);
                text(g,descriptions[id],10,false,154,cy+49,muted);
                round(g,714,cy+25,38,22,22,on?accent:color(0x434953));
                g.setColor(on?bg:muted);g.fillOval(on?733:717,cy+28,16,16);
                if(hover==20+id){g.setColor(white);g.draw(new RoundRectangle2D.Float(712,cy+23,42,26,26,26));}
                if(id>0){
                    round(g,534,cy+17,156,40,8,color(0x11151c));
                    round(g,542,cy+23,26,28,6,hover==30+id?color(0x343b48):color(0x222833));
                    round(g,656,cy+23,26,28,6,hover==40+id?color(0x343b48):color(0x222833));
                    text(g,"−",16,false,550,cy+42,white);text(g,"+",16,false,663,cy+42,white);
                    String value=id==1?config.backgroundFps+" FPS":config.particleDistance+" blocks";
                    g.setFont(semibold.deriveFont(11f));int valueWidth=g.getFontMetrics().stringWidth(value);
                    text(g,value,11,true,612-valueWidth/2,cy+41,white);
                }
            }
            line(g, 60, 438, 799, 438, border);
            text(g, message == null ? "Changes save automatically" : message, 11, false, 84, 471, muted);
            round(g, 642, 452, 130, 30, 8, hover == 1 ? color(0x34313a) : card);
            round(g, 651, 458, 25, 18, 5, color(0x30323b)); text(g, "Esc", 9, true, 656, 471, muted); text(g, "Back to game", 11, true, 684, 472, white);
            if (hover >= 10 && hover <= 13) { int y = 93 + (hover - 10) * 52; round(g, 55, y, 112, 25, 7, color(0x35313c)); text(g, categories[hover - 10], 11, true, 66, y + 17, white); }
        } finally { g.dispose(); }
        return image;
    }
}
