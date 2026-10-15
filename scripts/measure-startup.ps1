param([string]$Executable, [string]$Label, [int]$Runs = 2)
$ErrorActionPreference = 'Stop'
$measurements = @()
for ($run = 0; $run -lt $Runs; $run++) {
  $env:FUSION_TEST_DATA = Join-Path $env:TEMP ('fusion-startup-' + [guid]::NewGuid().ToString())
  $existing = @(Get-Process -Name 'Fusion Launcher' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
  $timer = [Diagnostics.Stopwatch]::StartNew()
  Start-Process -FilePath $Executable
  $visible = $null
  while (-not $visible -and $timer.Elapsed.TotalSeconds -lt 60) {
    Start-Sleep -Milliseconds 50
    $visible = Get-Process -Name 'Fusion Launcher' -ErrorAction SilentlyContinue | Where-Object { $_.Id -notin $existing -and $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -eq 'Fusion Launcher' } | Select-Object -First 1
  }
  $timer.Stop()
  if (-not $visible) { throw 'No launcher window appeared within 60 seconds.' }
  $measurements += [math]::Round($timer.Elapsed.TotalMilliseconds)
  $null = $visible.CloseMainWindow()
  $null = $visible.WaitForExit(10000)
}
Remove-Item Env:FUSION_TEST_DATA
@{ label = $Label; milliseconds = $measurements; metric = 'time to visible native launcher window' } | ConvertTo-Json -Compress
