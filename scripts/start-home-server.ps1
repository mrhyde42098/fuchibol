# Fuchibol - servidor local (PC como host)
# Uso: .\scripts\start-home-server.ps1
# Abre http://localhost:4000 en el navegador

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $Root

if (-not (Test-Path 'backend\.env')) {
  Copy-Item 'backend\.env.example' 'backend\.env'
  Write-Host 'Creado backend\.env - revisa TOKEN_SECRET si expones la red local.'
}

$env:NODE_ENV = 'production'
$env:SERVE_FRONTEND = 'true'
$env:PUBLIC_BASE_URL = 'http://localhost:4000'
$env:PORT = '4000'

Write-Host 'Compilando backend y frontend...'
npm run build --prefix backend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build --prefix frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$portInUse = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portInUse) {
  $pidToStop = $portInUse.OwningProcess
  Write-Host "Puerto 4000 ocupado (PID $pidToStop). Liberando..."
  Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

Write-Host ''
Write-Host 'Fuchibol listo en http://localhost:4000'
Write-Host 'Desde otros dispositivos en tu red: http://TU-IP-LOCAL:4000'
Write-Host 'Presiona Ctrl+C para detener'
Write-Host ''

Set-Location backend
npm run start
