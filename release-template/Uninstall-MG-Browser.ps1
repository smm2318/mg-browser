# MG Browser — Uninstaller (Windows)
# Removes the app and shortcuts. Your profile data is kept unless you answer Y.

$target = Join-Path $env:LOCALAPPDATA 'Programs\MG Browser'
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'

$running = Get-Process -Name 'MG-Browser' -ErrorAction SilentlyContinue
if ($running) {
  Write-Host 'Please close MG Browser first.' -ForegroundColor Yellow
  exit 1
}

foreach ($link in @((Join-Path $desktop 'MG Browser.lnk'), (Join-Path $startMenu 'MG Browser.lnk'))) {
  if (Test-Path $link) { Remove-Item $link -Force }
}

if (Test-Path $target) {
  Remove-Item $target -Recurse -Force
  Write-Host 'MG Browser removed.' -ForegroundColor Green
} else {
  Write-Host 'MG Browser is not installed in the default location.' -ForegroundColor Yellow
}

$removeData = Read-Host 'Also delete your history, settings and password vault? (y/N)'
if ($removeData -eq 'y' -or $removeData -eq 'Y') {
  $data = Join-Path $env:APPDATA 'MG Browser'
  if (Test-Path $data) {
    Remove-Item $data -Recurse -Force
    Write-Host 'Profile data deleted.' -ForegroundColor Green
  }
}
