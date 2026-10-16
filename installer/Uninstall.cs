using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
[assembly: AssemblyTitle("Fusion Uninstaller")]
[assembly: AssemblyProduct("Fusion Launcher")]
[assembly: AssemblyVersion("__VERSION__.0")]
namespace FusionRemove {
 public static class Program {
  internal static string Target, Forward;
  internal static int Result=0;
  static string Quote(string value){if(value.Contains("\"")||value.Contains("\n"))throw new IOException("Invalid installation path.");return "\""+value+"\"";}
  [STAThread]public static int Main(string[] args){
   try {
    bool preview=args.Length==2&&args[0]=="--preview";
    bool silent=args.Any(x=>x.Equals("/S",StringComparison.OrdinalIgnoreCase));
    Target=Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
    int targetIndex=Array.IndexOf(args,"--target");if(targetIndex>=0&&targetIndex+1<args.Length)Target=args[targetIndex+1];
    int nsisIndex=Array.FindIndex(args,x=>x.StartsWith("_?="));if(nsisIndex>=0)Target=String.Join(" ",args.Skip(nsisIndex)).Substring(3);
    Target=Path.GetFullPath(Target);
    Forward=String.Join(" ",args.Where(x=>new[]{"/currentuser","/allusers","--updated","--keep-shortcuts"}.Contains(x)));
    if(!preview) {
     if(Target==Path.GetPathRoot(Target)||Target.StartsWith(@"\\")||!File.Exists(Path.Combine(Target,"Uninstall Fusion Launcher.exe"))||!File.Exists(Path.Combine(Target,"resources","app.asar")))throw new IOException("Fusion's installation could not be found. Run the uninstaller from Windows Settings.");
     if(String.Equals(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),Target,StringComparison.OrdinalIgnoreCase)) {
      // Run outside the install folder so Windows can remove every app file.
      string temp=Path.Combine(Path.GetTempPath(),"Fusion-Uninstall-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(temp);
      string exe=Path.Combine(temp,"Fusion-Uninstall.exe");File.Copy(Assembly.GetExecutingAssembly().Location,exe);
      Process.Start(new ProcessStartInfo(exe,"--target "+Quote(Target)+(silent?" /S ":" ")+Forward){UseShellExecute=false,CreateNoWindow=true});return 0;
     }
     if(silent)return Remove();
    }
    var app=new Application();var window=new RemoveWindow();
    if(preview){var content=(FrameworkElement)window.Content;content.Measure(new Size(660,420));content.Arrange(new Rect(0,0,660,420));content.UpdateLayout();var bitmap=new RenderTargetBitmap(660,420,96,96,PixelFormats.Pbgra32);bitmap.Render(window.Content as Visual);var encoder=new PngBitmapEncoder();encoder.Frames.Add(BitmapFrame.Create(bitmap));using(var stream=File.Create(args[1]))encoder.Save(stream);return 0;}
    app.Run(window);return Result;
   }catch(Exception e){if(!args.Any(x=>x=="/S"))MessageBox.Show(e.Message,"Fusion Uninstaller",MessageBoxButton.OK,MessageBoxImage.Error);return 1;}
  }
  internal static int Remove(){
   string engine=Path.Combine(Path.GetTempPath(),"Fusion-Remove-"+Guid.NewGuid().ToString("N")+".exe");
   File.Copy(Path.Combine(Target,"Uninstall Fusion Launcher.exe"),engine);
   try{using(var process=Process.Start(new ProcessStartInfo(engine,"/S /KEEP_APP_DATA --updated "+Forward+" _?="+Target){UseShellExecute=false,CreateNoWindow=true})){process.WaitForExit();return process.ExitCode;}}
   finally{try{File.Delete(engine);}catch{}}
  }
 }
 public class RemoveWindow:Window {
  public RemoveWindow(){
   Title="Uninstall Fusion";Width=660;Height=420;WindowStartupLocation=WindowStartupLocation.CenterScreen;WindowStyle=WindowStyle.None;ResizeMode=ResizeMode.NoResize;AllowsTransparency=true;Background=Brushes.Transparent;
   Content=XamlReader.Parse(@"<Border xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' Background='#12151b' BorderBrush='#343944' BorderThickness='1' CornerRadius='16' Padding='30'><Border.Resources><Style TargetType='Button'><Setter Property='Foreground' Value='#e9edf4'/><Setter Property='Background' Value='#282e3a'/><Setter Property='BorderThickness' Value='0'/><Setter Property='Padding' Value='18,11'/><Setter Property='Cursor' Value='Hand'/><Setter Property='Template'><Setter.Value><ControlTemplate TargetType='Button'><Border Background='{TemplateBinding Background}' CornerRadius='7' Padding='{TemplateBinding Padding}'><ContentPresenter HorizontalAlignment='Center'/></Border></ControlTemplate></Setter.Value></Setter></Style></Border.Resources><Grid><Grid.RowDefinitions><RowDefinition Height='55'/><RowDefinition Height='*'/><RowDefinition Height='45'/></Grid.RowDefinitions><StackPanel Orientation='Horizontal'><Image Name='Brand' Width='36' Height='36'/><TextBlock Text='FUSION' Foreground='#f2f4f8' FontWeight='Bold' FontSize='13' VerticalAlignment='Center' Margin='12,0,0,0'/></StackPanel><Button Name='Close' Content='&#x2715;' HorizontalAlignment='Right' VerticalAlignment='Center' Padding='10,5'/><StackPanel Grid.Row='1' VerticalAlignment='Center'><TextBlock Name='Heading' Text='Uninstall Fusion?' Foreground='#f2f4f8' FontSize='28' FontWeight='SemiBold'/><TextBlock Name='Copy' Text='Remove the launcher and its shortcuts from this PC.' Foreground='#9da7b8' FontSize='13' Margin='0,12,0,20'/><Border Background='#1c222c' CornerRadius='8' Padding='16'><StackPanel><TextBlock Text='Your game files stay here' Foreground='#e7edf5' FontSize='13' FontWeight='SemiBold'/><TextBlock Text='Worlds, mods, skins and settings are kept for next time.' Foreground='#9da7b8' FontSize='12' Margin='0,7,0,0'/></StackPanel></Border><ProgressBar Name='Progress' Height='3' Visibility='Collapsed' Margin='0,20,0,0' Foreground='#e57ca7' Background='#2a303a'/><TextBlock Name='Status' Foreground='#9da7b8' FontSize='11' TextWrapping='Wrap' Margin='0,12,0,0'/></StackPanel><StackPanel Grid.Row='2' Orientation='Horizontal' HorizontalAlignment='Right'><Button Name='Cancel' Content='Keep Fusion' Margin='0,0,10,0'/><Button Name='Remove' Content='Uninstall' Background='#b85278'/></StackPanel></Grid></Border>");
   var root=(FrameworkElement)Content;var close=(Button)root.FindName("Close");var cancel=(Button)root.FindName("Cancel");var remove=(Button)root.FindName("Remove");var heading=(TextBlock)root.FindName("Heading");var copy=(TextBlock)root.FindName("Copy");var status=(TextBlock)root.FindName("Status");var progress=(ProgressBar)root.FindName("Progress");
   using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("brand.png")){var image=new BitmapImage();image.BeginInit();image.CacheOption=BitmapCacheOption.OnLoad;image.StreamSource=stream;image.EndInit();((Image)root.FindName("Brand")).Source=image;Icon=image;}
   bool working=false,done=false;close.Click+=(s,e)=>Close();cancel.Click+=(s,e)=>Close();Closing+=(s,e)=>{if(working)e.Cancel=true;};MouseLeftButtonDown+=(s,e)=>{if(e.ButtonState==MouseButtonState.Pressed)DragMove();};
   remove.Click+=async(s,e)=>{if(done){Close();return;}working=true;remove.IsEnabled=cancel.IsEnabled=close.IsEnabled=false;progress.Visibility=Visibility.Visible;progress.IsIndeterminate=true;status.Text="Removing launcher files and shortcuts…";
    try{int result=await Task.Run(()=>Program.Remove());if(result!=0)throw new IOException("Uninstall could not finish (code "+result+"). Close Fusion and retry.");heading.Text="Fusion was removed";copy.Text="Your game files are still on this PC.";status.Text="You can close this window.";remove.Content="Done";cancel.Visibility=Visibility.Collapsed;done=true;Program.Result=0;}
    catch(Exception error){status.Text=error.Message;remove.Content="Retry";Program.Result=1;}
    finally{working=false;progress.IsIndeterminate=false;progress.Visibility=Visibility.Collapsed;remove.IsEnabled=cancel.IsEnabled=close.IsEnabled=true;}
   };
  }
 }
}
