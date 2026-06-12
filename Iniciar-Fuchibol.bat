@echo off
chcp 65001 >nul
title Fuchibol
cd /d "%~dp0"

if exist "Fuchibol.exe" (
  start "" "%~dp0Fuchibol.exe"
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fuchibol-home.ps1" -Quick
if errorlevel 1 pause
