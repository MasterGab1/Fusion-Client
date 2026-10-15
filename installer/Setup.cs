using System;
using System.IO;
using System.Reflection;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Win32;

[assembly: AssemblyTitle("Fusion Setup")]
[assembly: AssemblyProduct("Fusion Launcher")]
[assembly: AssemblyCompany("Fusion")]
[assembly: AssemblyVersion("__VERSION__.0")]
[assembly: AssemblyFileVersion("__VERSION__.0")]

namespace FusionSetup {
  public class Program {
    internal static string Version = "__VERSION__", Hash = "__HASH__";
    static string temp;
    [STAThread] public static int Main(string[] args) {
      try {
        if (Array.Exists(args, x => x.Equals("/S", StringComparison.OrdinalIgnoreCase))) {
          string engine = Extract(null);
          // NSIS /D= must be last and consumes the remainder, including spaces.
          string forwarded = "";
          string directory = null;
          foreach (string arg in args) {
            if (arg.StartsWith("/D=", StringComparison.OrdinalIgnoreCase)) directory = arg.Substring(3);
            else forwarded += Quote(arg) + " ";
          }
          int code = Run(engine, forwarded + (directory == null ? "" : "/D=" + directory));
          return code;
        }
        var application = new Application();
        var window = new SetupWindow();
#if QA
        if (args.Length == 2 && args[0] == "--qa-install") return window.TestInstall(args[1]);
#endif
        if (args.Length == 2 && args[0] == "--preview") {
          var content = (FrameworkElement)window.Content; content.Measure(new Size(820, 520)); content.Arrange(new Rect(0, 0, 820, 520)); content.UpdateLayout();
          var bitmap = new RenderTargetBitmap(820, 520, 96, 96, PixelFormats.Pbgra32); bitmap.Render(window.Content as Visual);
          var encoder = new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(bitmap));
          using (var file = File.Create(args[1])) encoder.Save(file);
          return 0;
        }
        application.Run(window); return window.Result;
      } catch (Exception error) {
        // Silent update failures must never open a modal or expose command-line arguments.
        if (!Array.Exists(args, x => x.Equals("/S", StringComparison.OrdinalIgnoreCase))) MessageBox.Show(error.Message, "Fusion setup", MessageBoxButton.OK, MessageBoxImage.Error);
        return 1;
      } finally { if (temp != null) try { Directory.Delete(temp, true); } catch {} }
    }
    static string Quote(string s) { return "\"" + s.Replace("\"", "\\\"") + "\""; }
    internal static string Extract(Action<double> progress) {
      temp = Path.Combine(Path.GetTempPath(), "Fusion-Setup-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(temp);
      string target = Path.Combine(temp, "engine.exe");
      using (var source = Assembly.GetExecutingAssembly().GetManifestResourceStream("engine.exe"))
      using (var output = File.Create(target)) {
        byte[] buffer = new byte[1024 * 1024]; int count; long total = 0;
        while ((count = source.Read(buffer, 0, buffer.Length)) > 0) { output.Write(buffer, 0, count); total += count; if (progress != null) progress((double)total / source.Length * 100); }
      }
      using (var sha = SHA256.Create()) using (var file = File.OpenRead(target)) {
        if (BitConverter.ToString(sha.ComputeHash(file)).Replace("-", "").ToLowerInvariant() != Hash) throw new IOException("Installer verification failed. Download Fusion setup again.");
      }
      return target;
    }
    internal static int Run(string exe, string args) {
      using (var process = Process.Start(new ProcessStartInfo(exe, args) { UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden })) { process.WaitForExit(); return process.ExitCode; }
    }
  }
  class SetupWindow : Window {
    TextBox folder; CheckBox desktop; Button install, browse, close; ProgressBar progress; TextBlock status, title, subtitle;
    bool installing, done; public int Result = 0;
    public SetupWindow() {
      Width = 820; Height = 520; ResizeMode = ResizeMode.NoResize; WindowStartupLocation = WindowStartupLocation.CenterScreen;
      WindowStyle = WindowStyle.None; AllowsTransparency = true; Background = Brushes.Transparent; Title = "Fusion Setup";
      Content = XamlReader.Parse(@"
<Border xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' CornerRadius='18' BorderBrush='#36333e' BorderThickness='1' Background='#111216'>
<Border.Resources>
<Style TargetType='TextBlock'><Setter Property='Foreground' Value='#f4f1f8'/><Setter Property='FontFamily' Value='Segoe UI'/></Style>
<Style TargetType='Button'><Setter Property='Foreground' Value='#f5eef4'/><Setter Property='Cursor' Value='Hand'/><Setter Property='Background' Value='#27252e'/><Setter Property='Padding' Value='14,9'/><Setter Property='BorderThickness' Value='0'/><Setter Property='Template'><Setter.Value><ControlTemplate TargetType='Button'><Border Background='{TemplateBinding Background}' CornerRadius='7' Padding='{TemplateBinding Padding}'><ContentPresenter HorizontalAlignment='Center' VerticalAlignment='Center'/></Border><ControlTemplate.Triggers><Trigger Property='IsMouseOver' Value='True'><Setter Property='Opacity' Value='0.83'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter Property='Opacity' Value='0.45'/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter></Style>
</Border.Resources>
<Grid><Grid.ColumnDefinitions><ColumnDefinition Width='285'/><ColumnDefinition Width='*'/></Grid.ColumnDefinitions>
<Border CornerRadius='18,0,0,18'><Border.Background><LinearGradientBrush StartPoint='0,0' EndPoint='1,1'><GradientStop Color='#342331' Offset='0'/><GradientStop Color='#17171e' Offset='0.7'/><GradientStop Color='#20202e' Offset='1'/></LinearGradientBrush></Border.Background><Grid Margin='28'><TextBlock Text='F U S I O N' FontSize='13' FontWeight='Bold' VerticalAlignment='Top' Margin='0,8,0,0'/><StackPanel VerticalAlignment='Center'><Image Name='Brand' Width='220' Height='220'/><TextBlock Text='Fusion Launcher' FontSize='20' FontWeight='SemiBold' TextAlignment='Center' Margin='0,22,0,0'/><TextBlock Text='Minecraft: Java Edition' Foreground='#aaa0b3' TextAlignment='Center' Margin='0,10,0,0'/></StackPanel><TextBlock Name='Version' Foreground='#8e8799' VerticalAlignment='Bottom' FontSize='11'/></Grid></Border>
<Grid Grid.Column='1' Margin='34,22,30,27'><Grid.RowDefinitions><RowDefinition Height='35'/><RowDefinition Height='*'/><RowDefinition Height='48'/></Grid.RowDefinitions><Button Name='Close' Content='✕' HorizontalAlignment='Right' Width='30' Padding='0' Background='Transparent'/>
<StackPanel Grid.Row='1' VerticalAlignment='Center'><TextBlock Text='SETUP' Foreground='#ec76a5' FontSize='10' FontWeight='Bold'/><TextBlock Name='Heading' Text='Install Fusion' FontSize='30' FontWeight='SemiBold' Margin='0,10,0,0'/><TextBlock Name='Subtitle' Text='Choose where Fusion will be installed.' Foreground='#9d99a8' FontSize='13' Margin='0,10,0,28'/><TextBlock Text='INSTALL LOCATION' FontSize='10' Foreground='#9d99a8' Margin='0,0,0,9'/><Grid><Grid.ColumnDefinitions><ColumnDefinition Width='*'/><ColumnDefinition Width='72'/></Grid.ColumnDefinitions><TextBox Name='Folder' Background='#1d1e25' Foreground='#e5e1eb' BorderBrush='#37343f' Padding='10' FontSize='11' VerticalContentAlignment='Center'/><Button Grid.Column='1' Name='Browse' Content='Browse' FontSize='11' Padding='0' Margin='7,0,0,0'/></Grid><CheckBox Name='Desktop' Content='Create a desktop shortcut' Foreground='#c5c0cd' FontSize='12' Margin='0,17,0,28' IsChecked='True'/><ProgressBar Name='Progress' Height='4' Background='#28252f' Foreground='#ef70a5' BorderThickness='0' Minimum='0' Maximum='100'/><TextBlock Name='Status' Text='Installs for your Windows account.' FontSize='11' Foreground='#928b9d' TextWrapping='Wrap' Margin='0,12,0,0'/></StackPanel>
<Grid Grid.Row='2'><TextBlock Text='WINDOWS  •  64-BIT' Foreground='#756f82' FontSize='9' VerticalAlignment='Center'/><Button Name='Install' Content='Install Fusion  →' Background='#df6093' Foreground='White' FontWeight='SemiBold' HorizontalAlignment='Right' MinWidth='155'/></Grid></Grid></Grid></Border>");
      var root = (FrameworkElement)Content;
      folder = (TextBox)root.FindName("Folder"); desktop = (CheckBox)root.FindName("Desktop"); install = (Button)root.FindName("Install"); browse = (Button)root.FindName("Browse"); close = (Button)root.FindName("Close"); progress = (ProgressBar)root.FindName("Progress"); status = (TextBlock)root.FindName("Status"); title = (TextBlock)root.FindName("Heading"); subtitle = (TextBlock)root.FindName("Subtitle");
      ((TextBlock)root.FindName("Version")).Text = "FUSION " + Program.Version;
      using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("brand.png")) { var image = new BitmapImage(); image.BeginInit(); image.CacheOption = BitmapCacheOption.OnLoad; image.StreamSource = stream; image.EndInit(); ((Image)root.FindName("Brand")).Source = image; Icon = image; }
      folder.Text = ExistingLocation() ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Fusion Launcher");
      close.Click += (s,e) => Close();
      MouseLeftButtonDown += (s,e) => { if (e.ButtonState == MouseButtonState.Pressed) DragMove(); };
      Closing += (s,e) => { if (installing) e.Cancel = true; };
      browse.Click += (s,e) => { using (var dialog = new System.Windows.Forms.FolderBrowserDialog { Description = "Choose where to install Fusion", SelectedPath = folder.Text }) { if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK) folder.Text = dialog.SelectedPath; } };
      install.Click += async (s,e) => {
        if (done) { try { Process.Start(new ProcessStartInfo(Path.Combine(folder.Text, "Fusion Launcher.exe")) { UseShellExecute = true }); Close(); } catch { status.Text = "Fusion could not open. Launch it from the Start menu."; } return; }
        string target;
        try { target = Path.GetFullPath(folder.Text.Trim()); if (!Path.IsPathRooted(folder.Text) || target.Contains("\"") || target.Contains("\n") || target == Path.GetPathRoot(target) || target.StartsWith(@"\\")) throw new IOException(); }
        catch { status.Text = "Choose a local installation folder, not a drive root."; return; }
        folder.Text = target; installing = true; install.IsEnabled = browse.IsEnabled = folder.IsEnabled = desktop.IsEnabled = close.IsEnabled = false;
        status.Text = "Preparing and verifying the installer…"; title.Text = "Installing Fusion"; install.Content = "Installing…";
        try {
          string engine = await Task.Run(() => Program.Extract(value => Dispatcher.Invoke(new Action(() => progress.Value = value))));
          progress.IsIndeterminate = true; status.Text = "Installing files and shortcuts. This may take a moment.";
          string arguments = "/S /currentuser " + (desktop.IsChecked == true ? "" : "--no-desktop-shortcut ") + "/D=" + target;
          int code = await Task.Run(() => Program.Run(engine, arguments));
          if (code != 0) throw new IOException("Setup could not finish (code " + code + "). Close Fusion and try again.");
          if (!File.Exists(Path.Combine(target, "Fusion Launcher.exe"))) throw new IOException("Fusion was not found in the selected folder. Try setup again.");
          progress.IsIndeterminate = false; progress.Value = 100; done = true; Result = 0; title.Text = "Fusion is ready"; subtitle.Text = "Installed and ready to open."; status.Text = "Your worlds and settings stay with you when Fusion updates."; install.Content = "Launch Fusion  →";
        } catch (Exception error) { Result = 1; progress.IsIndeterminate = false; progress.Value = 0; status.Text = error.Message; title.Text = "Let's try again"; install.Content = "Retry install"; browse.IsEnabled = folder.IsEnabled = desktop.IsEnabled = true; }
        finally { installing = false; install.IsEnabled = close.IsEnabled = true; }
      };
    }
#if QA
    internal int TestInstall(string destination) {
      System.Threading.SynchronizationContext.SetSynchronizationContext(new System.Windows.Threading.DispatcherSynchronizationContext(Dispatcher));
      folder.Text = destination; desktop.IsChecked = false;
      install.RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
      var frame = new System.Windows.Threading.DispatcherFrame();
      var timer = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(50) };
      timer.Tick += (s,e) => { if (!installing) { timer.Stop(); frame.Continue = false; } };
      timer.Start(); System.Windows.Threading.Dispatcher.PushFrame(frame);
      File.WriteAllText(Path.Combine(destination, "result.txt"), title.Text + "\n" + status.Text + "\n" + install.Content);
      return Result;
    }
#endif
    static string ExistingLocation() {
      using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall")) {
        if (key == null) return null;
        foreach (string name in key.GetSubKeyNames()) using (var child = key.OpenSubKey(name)) if ((string)child.GetValue("DisplayName") == "Fusion Launcher") return child.GetValue("InstallLocation") as string;
      }
      return null;
    }
  }
}
