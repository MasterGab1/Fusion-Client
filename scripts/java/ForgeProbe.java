package fusion.qa;
import java.io.*;
import java.util.*;
import net.minecraft.launchwrapper.*;
public final class ForgeProbe implements ITweaker {
 private LaunchClassLoader loader;
 public void acceptOptions(List<String> args,File game,File assets,String profile){}
 public void injectIntoClassLoader(LaunchClassLoader loader){this.loader=loader;}
 public String getLaunchTarget(){return "net.minecraft.client.main.Main";}
 private void exit(int code) throws Exception { Class<?> handler=Class.forName("net.minecraftforge.fml.common.FMLCommonHandler",true,loader);handler.getMethod("exitJava",int.class,boolean.class).invoke(handler.getMethod("instance").invoke(null),code,false); }
 public String[] getLaunchArguments(){
  try {
   Properties p=new Properties();try(InputStream in=new FileInputStream(System.getProperty("fusion.qa.profile"))){p.load(in);}
   for(String hook:new String[]{"turn","camera","hud","fps","particle"})Class.forName(p.getProperty(hook+".class").replace('/','.'),false,loader).getDeclaredMethods();
   Class.forName("net.minecraftforge.client.GuiIngameForge",false,loader).getDeclaredMethods();
   Class<?> hooks=Class.forName("fusion.runtime.Hooks",false,loader);
   if(hooks.getClassLoader()!=null)throw new AssertionError("Duplicate Fusion runtime");
   Class<?> gui=Class.forName("fusion.runtime.GuiAdapter",false,loader);
   java.lang.reflect.Method factory=gui.getDeclaredMethod("screenBytes",Properties.class,boolean.class);factory.setAccessible(true);
   final byte[] bytes=(byte[])factory.invoke(null,p,true);
   Class<?> screen=new ClassLoader(loader){Class<?> define(){return defineClass("fusion.generated.ModScreen",bytes,0,bytes.length);}}.define();screen.getDeclaredMethods();
   Class<?> painterType=Class.forName("fusion.runtime.OverlayPainter",true,null),configType=Class.forName("fusion.runtime.RuntimeConfig",true,null);
   java.lang.reflect.Constructor<?> ctor=painterType.getDeclaredConstructor();ctor.setAccessible(true);Object painter=ctor.newInstance();
   java.lang.reflect.Method paint=painterType.getDeclaredMethod("paint",configType,int.class,int.class,String.class,String.class,int.class);paint.setAccessible(true);
   Object image=paint.invoke(painter,configType.getMethod("load").invoke(null),0,0,p.getProperty("version"),null,1);
   if(((java.awt.image.BufferedImage)image).getWidth()!=800)throw new AssertionError("Overlay render failed");
   System.out.println("FUSION_FORGE_PROBE_PASS");exit(0);
  }catch(Throwable e){e.printStackTrace();throw new RuntimeException(e);}
  return new String[0];
 }
}
