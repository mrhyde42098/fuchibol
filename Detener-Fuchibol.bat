@echo off
chcp 65001 >nul
title Fuchibol — Detener
cd /d "%~dp0"

if exist "Fuchibol.exe" (
  "%~dp0Fuchibol.exe" --stop
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fuchibol-home.ps1" -Stop
)

echo.
pause
