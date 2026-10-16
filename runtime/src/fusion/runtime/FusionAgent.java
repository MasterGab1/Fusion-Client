package fusion.runtime;
import java.lang.instrument.Instrumentation;
/** The small system-loader entry point delegates to a shared runtime. */
public final class FusionAgent {
 public static void premain(String version, Instrumentation instrumentation) throws Exception {
  String kind=System.getProperty("fusion.loader","vanilla");
  System.setProperty("fusion.runtimeJar",new java.io.File(FusionAgent.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getAbsolutePath());
  if(!kind.equals("vanilla")&&!kind.equals("fabric")&&!kind.equals("forge"))throw new IllegalArgumentException("Unknown Fusion loader");
  if(!kind.equals("vanilla")) instrumentation.appendToBootstrapClassLoaderSearch(new java.util.jar.JarFile(new java.io.File(FusionAgent.class.getProtectionDomain().getCodeSource().getLocation().toURI())));
  ClassLoader shared=kind.equals("vanilla")?FusionAgent.class.getClassLoader():null;
  Class.forName("fusion.runtime.RuntimeBootstrap",true,shared).getMethod("install",String.class,Instrumentation.class,String.class).invoke(null,version,instrumentation,kind);
 }
}
