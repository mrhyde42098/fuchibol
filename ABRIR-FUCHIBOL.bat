@echo off
chcp 65001 >nul
title Fuchibol
cd /d "%~dp0"
echo.
echo  FUCHIBOL - Iniciando servidor...
echo  Luego abre: http://localhost:4000
echo  (Funciona en Chrome, Edge y Brave)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-home-server.ps1"
if errorlevel 1 pause
