# Create a desktop shortcut with the MG icon for the personal build.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $root 'MG-Browser.exe'
$icon = Join-Path $root 'MG-Browser.ico'

if (-not (Test-Path $exe)) {
  Write-Host 'MG-Browser.exe was not found next to this script.' -ForegroundColor Red
  exit 1
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path $desktop 'MG Browser (Personal).lnk'))
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = $root
if (Test-Path $icon) { $shortcut.IconLocation = "$icon,0" }
$shortcut.Description = 'MG Browser — personal test build'
$shortcut.Save()

Write-Host 'Shortcut created on the Desktop: MG Browser (Personal)' -ForegroundColor Green
