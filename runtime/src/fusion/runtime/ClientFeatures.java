package fusion.runtime;

import java.lang.reflect.*;
import java.util.Properties;
import java.util.Locale;
import javax.imageio.ImageIO;

/** Optional HUD and camera controls. Camera movement never changes player aim. */
final class ClientFeatures {
    private final MinecraftAdapter game;
    private final RuntimeConfig config;
    private final GuiAdapter gui;
    private final Method food, foodLevel, saturation, keyDown;
    private final Field options, cameraMode, yawField, pitchField;
    private final long window;
    private final boolean legacy;
    private final Properties profile;
    private OverlayTexture logo;
    private final FreeLookMod freeLook;
    ClientFeatures(MinecraftAdapter game, Properties p, RuntimeConfig config) throws Exception {
        this.game=game;this.profile=p;this.config=config;this.gui=new GuiAdapter(game,p);legacy=game.drawMode.equals("legacy");
        food=MinecraftAdapter.method(game.type("food.player.class"),p.getProperty("food.get"));
        foodLevel=MinecraftAdapter.method(game.type("food.class"),p.getProperty("food.level"));
        saturation=MinecraftAdapter.method(game.type("food.class"),p.getProperty("food.saturation"));
        options=MinecraftAdapter.field(game.type("mc.class"),p.getProperty("mc.options"));
        cameraMode=MinecraftAdapter.field(options.getType(),p.getProperty("camera.option"));
        yawField=MinecraftAdapter.field(game.type("entity.class"),p.getProperty("entity.yaw"));
        pitchField=MinecraftAdapter.field(game.type("entity.class"),p.getProperty("entity.pitch"));
        if(legacy){keyDown=Hooks.type("org.lwjgl.input.Keyboard").getMethod("isKeyDown",int.class);window=0;}
        else {Object w=MinecraftAdapter.method(game.type("mc.class"),p.getProperty("mc.window")).invoke(game.minecraft());window=((Number)MinecraftAdapter.method(w.getClass(),p.getProperty("window.handle")).invoke(w)).longValue();keyDown=Hooks.type("org.lwjgl.glfw.GLFW").getMethod("glfwGetKey",long.class,int.class);}
        freeLook=new FreeLookMod(new FreeLookMod.Input(){
            public Object player() throws Exception{return game.player(game.minecraft());}
            public boolean held() throws Exception{return legacy?(Boolean)keyDown.invoke(null,56):((Number)keyDown.invoke(null,window,342)).intValue()==1;}
            public boolean available() throws Exception{return !gui.hasScreen(game.minecraft())&&game.focused(game.minecraft());}
            public float yaw(Object player) throws Exception{return yawField.getFloat(player);}
            public float pitch(Object player) throws Exception{return pitchField.getFloat(player);}
            public Object mode() throws Exception{return cameraMode.get(options.get(game.minecraft()));}
            public void thirdPerson() throws Exception{cameraMode.set(options.get(game.minecraft()),cameraMode.getType()==int.class?Integer.valueOf(1):cameraMode.getType().getEnumConstants()[1]);}
            public void restore(Object mode) throws Exception{cameraMode.set(options.get(game.minecraft()),mode);}
        },legacy);
    }
    void poll() throws Exception {
        freeLook.poll(config.freelook);
    }
    void release() throws Exception { freeLook.release(); }
    boolean turn(Object player,double dx,double dy) throws Exception {
        return freeLook.turn(player,dx,dy,config.freelook);
    }
    static float clampPitch(float value){return FreeLookMod.clampPitch(value);}
    float yaw(float original){return freeLook.yaw(original);}
    float pitch(float original){return freeLook.pitch(original);}
    void draw(Object context) throws Exception {
        poll();Object mc=game.minecraft(),player=game.player(mc);
        if(player==null||game.hideHud(mc))return;
        Object screen=gui.screen(mc);
        if(screen!=null){
            if(config.watermark&&!screen.getClass().getName().equals("fusion.generated.ModScreen")){
                if(logo==null){logo=new OverlayTexture(game,profile,"watermark");try(java.io.InputStream in=getClass().getResourceAsStream("/logo-white.png")){logo.upload(ImageIO.read(in));}}
                logo.draw(context,8,8,18,18);game.text(mc,context,"FUSION",31,13,0xffeeeeef);
            }
            return;
        }
        int y=8;
        if(config.fps){game.text(mc,context,game.fps(mc)+" FPS",8,y,0xffb6ddad);y+=13;}
        if(config.coordinates){game.text(mc,context,String.format(Locale.ROOT,"XYZ  %.0f / %.0f / %.0f",Math.floor(game.coordinate(player,0)),Math.floor(game.coordinate(player,1)),Math.floor(game.coordinate(player,2))),8,y,0xffd3d9e5);y+=13;}
        if(config.saturation){Object data=food.invoke(player);float value=((Number)saturation.invoke(data)).floatValue();int hunger=((Number)foodLevel.invoke(data)).intValue();
            game.text(mc,context,String.format(Locale.ROOT,"Hunger %d/20  |  Saturation ~%.1f",hunger,Math.max(0,value)),8,y,0xffedc68b);
        }
    }
}
