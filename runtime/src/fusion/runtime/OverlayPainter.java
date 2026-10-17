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
    static int[] visible(int category) { return category == 4 ? new int[0] : category == 1 ? new int[] {0,3,5,6} : category == 2 ? new int[] {1,2} : category == 3 ? new int[] {4} : new int[] {0,1,2,3,4,5,6}; }
    static boolean hit(double x, double y, int left, int top, int w, int h) { return x >= left && y >= top && x < left + w && y < top + h; }
    // Stable control IDs also drive hover repainting and mouse hit testing.
    static int control(double x, double y, int category) {
        if (hit(x,y,752,20,28,28)) return 1;
        for(int i=0;i<5;i++) if(hit(x,y,12,87+i*52,36,36)) return 10+i;
        if(hit(x,y,626,455,28,26))return 60; if(hit(x,y,744,455,28,26))return 61;
        if(category==4){if(hit(x,y,644,401,58,25))return 50;if(hit(x,y,710,401,62,25))return 51;}
        int n=0;
        for(int id:visible(category)) {
            int cx=84+(n%2)*350,cy=126+(n/2)*78;n++;
            if(hit(x,y,cx+290,cy+10,34,22))return 20+id;
            if(id==1||id==2){if(hit(x,y,cx+194,cy+40,26,22))return 30+id;if(hit(x,y,cx+298,cy+40,26,22))return 40+id;}
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
        else if(id==5){for(int n=0;n<3;n++){int yy=5+n*7;p.drawLine(2,yy,22,yy);p.fillOval(n==1?14:6,yy-3,6,6);}}
        else if(id==6){p.drawLine(6,2,6,21);p.drawLine(2,2,2,8);p.drawLine(10,2,10,8);p.draw(new Arc2D.Float(2,5,8,7,180,180,Arc2D.OPEN));p.drawLine(19,2,19,21);p.draw(new Arc2D.Float(13,2,12,12,90,180,Arc2D.OPEN));}
        else if(id==7){Path2D eye=new Path2D.Float();eye.moveTo(1,12);eye.curveTo(7,1,17,1,23,12);eye.curveTo(17,23,7,23,1,12);p.draw(eye);p.drawOval(8,8,8,8);}
        else if(id==8){p.draw(new Arc2D.Float(2,3,20,20,0,180,Arc2D.OPEN));p.drawLine(2,13,2,19);p.drawLine(22,13,22,19);p.drawLine(12,14,17,7);p.fillOval(10,12,4,4);}
        else if(id==9){p.drawOval(3,3,18,18);p.drawLine(12,0,12,7);p.drawLine(12,17,12,24);p.drawLine(0,12,7,12);p.drawLine(17,12,24,12);p.fillOval(10,10,4,4);}
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
            String[] categories = { "Mods", "HUD", "Performance", "Controls", "Installed mods" };
            for (int i = 0; i < 5; i++) {
                if (category == i || hover == 10 + i) round(g, 12, 87 + i * 52, 36, 36, 10, category == i ? new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 28) : card);
                if (category == i) round(g, 1, 96 + i * 52, 3, 18, 3, accent);
                icon(g, i==3?5:i==4?0:i, 18, 93 + i * 52, category == i ? accent : muted);
            }
            text(g, category == 0 ? "Mods" : categories[category], 25, true, 84, 94, white);
            text(g, category==4 ? config.mods.length+" installed mods" : "HUD, controls and performance", 11, false, 84, 114, muted);
            if(category==4){
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
            String[] titles = { "Watermark", "Background FPS", "Particles", "Saturation", "Free look", "FPS counter", "Coordinates" };
            String[] hints = { "Visible in menus only", "When the game is unfocused", "Limit distant particles", "Client estimate, not server-verified", "Hold Left Alt to look around", "Your current frame rate", "Your position in the world" };
            boolean[] enabled = { config.watermark, config.focus, config.particles, config.saturation, config.freelook, config.fps, config.coordinates };
            int index=0;
            for(int id:visible(category)) {
                int cx=84+(index%2)*350,cy=126+(index/2)*78; index++;
                boolean on=enabled[id];
                round(g,cx,cy,338,70,10,card);
                g.setColor(border);g.draw(new RoundRectangle2D.Float(cx,cy,338,70,10,10));
                icon(g,new int[]{7,3,4,6,7,8,9}[id],cx+13,cy+12,on?accent:muted);
                text(g,titles[id],13,true,cx+48,cy+26,white);
                text(g,hints[id],9,false,cx+14,cy+57,muted);
                round(g,cx+290,cy+10,34,20,20,on?accent:color(0x434953));
                g.setColor(white);g.fillOval(cx+(on?306:293),cy+13,14,14);
                if(hover==20+id){g.setColor(white);g.draw(new RoundRectangle2D.Float(cx+288,cy+8,38,24,24,24));}
                if(id==1||id==2){
                    round(g,cx+190,cy+38,136,26,6,bg);
                    text(g,"−",14,true,cx+200,cy+56,hover==30+id?accent:white);text(g,"+",14,true,cx+306,cy+56,hover==40+id?accent:white);
                    String value=id==1?config.backgroundFps+" FPS":config.particleDistance+" blocks";
                    text(g,value,10,true,cx+228,cy+56,white);
                }
            }
            line(g,60,446,799,446,border);
            text(g,message==null?"Saved automatically":message,10,false,84,472,muted);
            text(g,"MENU SIZE",9,true,537,472,muted);
            round(g,626,455,28,26,6,card);round(g,744,455,28,26,6,card);
            text(g,"−",16,true,635,474,hover==60?accent:white);text(g,"+",16,true,753,474,hover==61?accent:white);
            text(g,config.menuScale+"%",12,true,681,474,white);
            if (hover >= 10 && hover <= 14) { int y = 93 + (hover - 10) * 52; round(g, 55, y, 112, 25, 7, color(0x35313c)); text(g, categories[hover - 10], 11, true, 66, y + 17, white); }
        } finally { g.dispose(); }
        return image;
    }
}
