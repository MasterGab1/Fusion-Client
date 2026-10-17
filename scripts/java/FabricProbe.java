package fusion.qa;
import net.fabricmc.loader.api.entrypoint.PreLaunchEntrypoint;
import java.lang.reflect.*;
import java.util.*;
public final class FabricProbe implements PreLaunchEntrypoint {
 public void onPreLaunch() {
  try {
   ClassLoader loader=Thread.currentThread().getContextClassLoader();
   Properties p=new Properties();try(java.io.InputStream in=FabricProbe.class.getResourceAsStream("/fusion-profile.properties")){p.load(in);}
   for(String hook:new String[]{"turn","camera","hud","fps","particle","keyboard"})if(p.containsKey(hook+".class"))Class.forName(p.getProperty(hook+".class").replace('/','.'),false,loader).getDeclaredMethods();
   Class<?> hooks=Class.forName("fusion.runtime.Hooks",false,loader);
   if(hooks.getClassLoader()!=null)throw new AssertionError("Fusion is not shared through bootstrap: "+hooks.getClassLoader());
   try(java.io.BufferedReader input=new java.io.BufferedReader(new java.io.InputStreamReader(FabricProbe.class.getResourceAsStream("/bindings.tsv"),"UTF-8"))) {
    String line;while((line=input.readLine())!=null){String[] b=line.split("\t");Class<?> owner=Class.forName(b[1].replace('/','.'),false,loader);boolean found=false;
     if(b[0].equals("f")){for(Field f:owner.getDeclaredFields())if(f.getName().equals(b[2]))found=true;}
     else for(Method m:owner.getDeclaredMethods())if(m.getName().equals(b[2]))found=true;
     if(!found)throw new AssertionError("Missing binding "+line);
    }
   }
   Class<?> adapter=Class.forName("fusion.runtime.GuiAdapter");
   Method factory=adapter.getDeclaredMethod("screenBytes",Properties.class,boolean.class);factory.setAccessible(true);
   final byte[] bytes=(byte[])factory.invoke(null,p,false);
   Class<?> screen=new ClassLoader(loader){Class<?> define(){return defineClass("fusion.generated.ModScreen",bytes,0,bytes.length);}}.define();
   screen.getDeclaredMethods();
   Class<?> painterType=Class.forName("fusion.runtime.OverlayPainter",true,null),configType=Class.forName("fusion.runtime.RuntimeConfig",true,null);
   java.lang.reflect.Constructor<?> ctor=painterType.getDeclaredConstructor();ctor.setAccessible(true);Object painter=ctor.newInstance();
   java.lang.reflect.Method paint=painterType.getDeclaredMethod("paint",configType,int.class,int.class,String.class,String.class,int.class);paint.setAccessible(true);
   Object image=paint.invoke(painter,configType.getMethod("load").invoke(null),0,0,p.getProperty("version"),null,1);
   if(((java.awt.image.BufferedImage)image).getWidth()!=800)throw new AssertionError("Overlay render failed");
   System.out.println("FUSION_FABRIC_PROBE_PASS: runtime hooks and menu link through real Fabric Loader");System.exit(0);
  }catch(Throwable e){e.printStackTrace();System.exit(9);}
 }
}
