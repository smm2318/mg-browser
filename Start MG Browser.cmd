@echo off
setlocal
set "APP=%~dp0release\MG-Browser-win-x64\MG-Browser.exe"
if not exist "%APP%" (
  echo MG Browser build not found at:
  echo   %APP%
  echo.
  echo Build it first with:  node scripts\package-win.js
  pause
  exit /b 1
)
start "" "%APP%"
