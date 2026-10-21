# MG Browser — remove the "downloaded from the internet" mark (Windows SmartScreen)
# Run from the extracted release folder:
#   powershell -ExecutionPolicy Bypass -File .\Unblock-MG-Browser.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host 'Removing the Mark-of-the-Web from MG Browser files…' -ForegroundColor Cyan
Get-ChildItem $root -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
  try { Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue } catch { }
}

$exe = Join-Path $root 'MG-Browser.exe'
if (Test-Path $exe) {
  Write-Host ''
  Write-Host 'Done. MG Browser is no longer marked as downloaded.' -ForegroundColor Green
  Write-Host 'You can now run:'
  Write-Host "  $exe"
  Write-Host ''
  $launch = Read-Host 'Launch MG Browser now? (y/N)'
  if ($launch -eq 'y' -or $launch -eq 'Y') { Start-Process $exe }
} else {
  Write-Host 'MG-Browser.exe was not found next to this script.' -ForegroundColor Yellow
}
