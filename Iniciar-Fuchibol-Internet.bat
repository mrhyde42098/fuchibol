@echo off
chcp 65001 >nul
title Fuchibol — Internet
cd /d "%~dp0"
echo.
echo  FUCHIBOL — Modo internet (URL publica temporal)
echo  Requiere conexion a internet. La URL cambia cada vez.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fuchibol-home.ps1" -Quick -Tunnel
if errorlevel 1 pause
