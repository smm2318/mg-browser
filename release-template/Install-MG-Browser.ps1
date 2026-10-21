# MG Browser — Installer / shortcut creator (Windows)
# Run:  powershell -ExecutionPolicy Bypass -File .\Install-MG-Browser.ps1
# Copies the portable build into %LOCALAPPDATA%\Programs\MG Browser and
# creates Desktop + Start Menu shortcuts with the MG icon.

$ErrorActionPreference = 'Stop'

$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $source 'MG-Browser.exe'
if (-not (Test-Path $exe)) {
  Write-Host 'MG-Browser.exe was not found next to this script.' -ForegroundColor Red
  Write-Host 'Run this script from the extracted release folder.' -ForegroundColor Yellow
  exit 1
}

$target = Join-Path $env:LOCALAPPDATA 'Programs\MG Browser'
Write-Host "Installing MG Browser to $target" -ForegroundColor Cyan

if (Test-Path $target) {
  $running = Get-Process -Name 'MG-Browser' -ErrorAction SilentlyContinue
  if ($running) {
    Write-Host 'MG Browser is running. Please close it and try again.' -ForegroundColor Yellow
    exit 1
  }
  Remove-Item $target -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $target | Out-Null

# Copy the portable folder (excluding the installer script itself)
Get-ChildItem $source -Force | Where-Object {
  $_.Name -ne 'Install-MG-Browser.ps1' -and $_.Name -ne 'Uninstall-MG-Browser.ps1'
} | ForEach-Object {
  Copy-Item $_.FullName -Destination $target -Recurse -Force
}

# Clear the "downloaded from the internet" mark so SmartScreen stops warning
try {
  Get-ChildItem $target -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
} catch { }

$installedExe = Join-Path $target 'MG-Browser.exe'
$shell = New-Object -ComObject WScript.Shell

$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'

$shortcut = $shell.CreateShortcut((Join-Path $desktop 'MG Browser.lnk'))
$shortcut.TargetPath = $installedExe
$shortcut.WorkingDirectory = $target
$shortcut.IconLocation = "$installedExe,0"
$shortcut.Description = 'MG Browser — modern web browser'
$shortcut.Save()

$startShortcut = $shell.CreateShortcut((Join-Path $startMenu 'MG Browser.lnk'))
$startShortcut.TargetPath = $installedExe
$startShortcut.WorkingDirectory = $target
$startShortcut.IconLocation = "$installedExe,0"
$startShortcut.Description = 'MG Browser — modern web browser'
$startShortcut.Save()

Write-Host ''
Write-Host 'MG Browser installed.' -ForegroundColor Green
Write-Host "  App:      $installedExe"
Write-Host '  Shortcuts: Desktop + Start Menu'
Write-Host ''
$launch = Read-Host 'Launch MG Browser now? (y/N)'
if ($launch -eq 'y' -or $launch -eq 'Y') {
  Start-Process $installedExe
}
