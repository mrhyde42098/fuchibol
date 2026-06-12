# Fuchibol - servidor en tu PC (un clic)
# Uso:
#   .\scripts\fuchibol-home.ps1              # inicia y abre navegador
#   .\scripts\fuchibol-home.ps1 -Quick       # sin recompilar si ya hay build
#   .\scripts\fuchibol-home.ps1 -Rebuild     # fuerza build
#   .\scripts\fuchibol-home.ps1 -Stop        # detiene el servidor
#   .\scripts\fuchibol-home.ps1 -Tunnel       # URL pública temporal (cloudflare)
#   .\scripts\fuchibol-home.ps1 -Status       # estado del puerto 4000

param(
  [switch]$Quick,
  [switch]$Rebuild,
  [switch]$Stop,
  [switch]$Tunnel,
  [switch]$Status,
  [switch]$NoBrowser,
  [int]$Port = 4000
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $Root 'logs'
$PidFile = Join-Path $LogDir 'fuchibol-server.pid'
$TunnelLog = Join-Path $LogDir 'tunnel.log'

function Write-Banner([string]$Text, [string]$Color = 'Cyan') {
  Write-Host ''
  Write-Host "  FUCHIBOL - $Text" -ForegroundColor $Color
  Write-Host ''
}

function Test-Node {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Host 'Node.js no está instalado.' -ForegroundColor Red
    Write-Host 'Descárgalo en https://nodejs.org (versión LTS) y vuelve a ejecutar.' -ForegroundColor Yellow
    exit 1
  }
  $ver = & node -v
  Write-Host "Node $ver" -ForegroundColor DarkGray
}

function Get-LanIp {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.PrefixOrigin -ne 'WellKnown' -and
      $_.IPAddress -notmatch '^127\.' -and
      $_.IPAddress -notmatch '^169\.254\.'
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
  if ($ip) { return $ip }
  return '127.0.0.1'
}

function Ensure-HomeEnv {
  $envPath = Join-Path $Root 'backend\.env'
  $example = Join-Path $Root 'backend\.env.example'
  if (-not (Test-Path $envPath)) {
    Copy-Item $example $envPath
    Write-Host 'Creado backend\.env desde plantilla.' -ForegroundColor Yellow
  }

  $lines = Get-Content $envPath
  $map = @{}
  foreach ($line in $lines) {
    if ($line -match '^\s*([^#=]+)=(.*)$') {
      $map[$Matches[1].Trim()] = $Matches[2].Trim()
    }
  }

  if (-not $map['TOKEN_SECRET'] -or $map['TOKEN_SECRET'].Length -lt 32 -or $map['TOKEN_SECRET'] -eq 'change-me-to-a-random-64-char-secret-in-production') {
    $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    $map['TOKEN_SECRET'] = $secret
    Write-Host 'TOKEN_SECRET generado automáticamente para uso en casa.' -ForegroundColor DarkGray
  }

  $map['NODE_ENV'] = 'production'
  $map['SERVE_FRONTEND'] = 'true'
  $map['PORT'] = "$Port"
  $map['IPTV_MIRROR_ENABLED'] = 'true'
  $map['THESPORTSDB_ENABLED'] = 'true'
  $map['THESPORTSDB_MINIMAL_MODE'] = 'true'
  $map['ESPN_AGENDA_ENABLED'] = 'true'
  $map['FUTBOL_LIBRE_ENABLED'] = 'true'
  $map['STREAM_AUDIT_ENABLED'] = 'true'

  $out = @()
  $written = @{}
  foreach ($line in $lines) {
    if ($line -match '^\s*([^#=]+)=') {
      $key = $Matches[1].Trim()
      if ($map.ContainsKey($key)) {
        $out += "$key=$($map[$key])"
        $written[$key] = $true
      } else {
        $out += $line
      }
    } else {
      $out += $line
    }
  }
  foreach ($key in $map.Keys) {
    if (-not $written[$key]) { $out += "$key=$($map[$key])" }
  }
  Set-Content -Path $envPath -Value $out -Encoding UTF8
}

function Stop-FuchibolServer {
  param([switch]$Quiet)
  $stopped = $false
  if (Test-Path $PidFile) {
    $savedPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($savedPid -match '^\d+$') {
      Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
      $stopped = $true
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    $stopped = $true
  }
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  if (-not $Quiet) {
    if ($stopped) {
      Write-Banner 'Servidor detenido' 'Green'
    } else {
      Write-Host 'No habia servidor activo en el puerto 4000.' -ForegroundColor Yellow
    }
  }
}

function Test-ServerHealth([string]$BaseUrl, [int]$TimeoutSec = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 4
      if ($r.status -eq 'ok') { return $true }
    } catch { }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Build-IfNeeded {
  $backendDist = Join-Path $Root 'backend\dist\index.js'
  $frontendDist = Join-Path $Root 'frontend\dist\index.html'
  $needsBuild = $Rebuild -or -not (Test-Path $backendDist) -or -not (Test-Path $frontendDist)
  if ($Quick -and -not $Rebuild) { $needsBuild = $false }
  if (-not $needsBuild) {
    Write-Host "Build existente - omitiendo compilacion (-Quick)." -ForegroundColor DarkGray
    return
  }
  Write-Host 'Compilando backend y frontend...' -ForegroundColor Cyan
  Push-Location $Root
  try {
    npm run build --prefix backend
    if ($LASTEXITCODE -ne 0) { throw 'Falló build del backend' }
    npm run build --prefix frontend
    if ($LASTEXITCODE -ne 0) { throw 'Falló build del frontend' }
  } finally {
    Pop-Location
  }
}

function Start-FuchibolServer([string]$PublicBaseUrl) {
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  Stop-FuchibolServer -Quiet | Out-Null
  Start-Sleep -Seconds 1

  $env:NODE_ENV = 'production'
  $env:SERVE_FRONTEND = 'true'
  $env:PUBLIC_BASE_URL = $PublicBaseUrl
  $env:PORT = "$Port"
  $env:IPTV_MIRROR_ENABLED = 'true'
  $env:THESPORTSDB_ENABLED = 'true'
  $env:ESPN_AGENDA_ENABLED = 'true'
  $env:FUTBOL_LIBRE_ENABLED = 'true'

  $serverLog = Join-Path $LogDir 'server.log'
  $serverErr = Join-Path $LogDir 'server-error.log'
  $backendDir = Join-Path $Root 'backend'
  $proc = Start-Process -FilePath 'node' -ArgumentList 'dist/index.js' `
    -WorkingDirectory $backendDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $serverLog -RedirectStandardError $serverErr

  Set-Content -Path $PidFile -Value $proc.Id -Encoding ASCII
  Write-Host "Servidor iniciado (PID $($proc.Id))" -ForegroundColor Green
  return $proc
}

function Start-CloudflareTunnel {
  $cf = Get-Command cloudflared -ErrorAction SilentlyContinue
  $cfPath = $null
  if ($cf) {
    $cfPath = $cf.Source
  } else {
    $localCf = Join-Path $Root 'tools\cloudflared.exe'
    if (-not (Test-Path $localCf)) {
      Write-Host 'Descargando cloudflared (túnel gratis)...' -ForegroundColor Cyan
      New-Item -ItemType Directory -Force -Path (Join-Path $Root 'tools') | Out-Null
      $url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
      Invoke-WebRequest -Uri $url -OutFile $localCf -UseBasicParsing
    }
    $cfPath = $localCf
  }

  $tunnelErr = Join-Path $LogDir 'tunnel-error.log'
  if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force }
  $tunnelProc = Start-Process -FilePath $cfPath -ArgumentList 'tunnel', '--url', "http://127.0.0.1:$Port" `
    -PassThru -WindowStyle Hidden -RedirectStandardOutput $TunnelLog -RedirectStandardError $tunnelErr

  $deadline = (Get-Date).AddSeconds(45)
  $publicUrl = $null
  while ((Get-Date) -lt $deadline -and -not $publicUrl) {
    Start-Sleep -Seconds 2
    if (-not (Test-Path $TunnelLog)) { continue }
    $log = Get-Content $TunnelLog -Raw -ErrorAction SilentlyContinue
    if ($log -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
      $publicUrl = $Matches[1]
    }
  }

  if (-not $publicUrl) {
    Write-Host 'No se pudo obtener URL del túnel. Revisa logs\tunnel.log' -ForegroundColor Red
    return $null
  }

  Set-Content -Path (Join-Path $LogDir 'tunnel.url') -Value $publicUrl -Encoding UTF8
  Write-Host "URL pública: $publicUrl" -ForegroundColor Magenta
  return $publicUrl
}

function Show-Toast([string]$Title, [string]$Message) {
  try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $safeTitle = [System.Security.SecurityElement]::Escape($Title)
    $safeMsg = [System.Security.SecurityElement]::Escape($Message)
    $q = '"'
    $xml = '<toast><visual><binding template=' + $q + 'ToastText02' + $q + '><text id=' + $q + '1' + $q + '>' + $safeTitle + '</text><text id=' + $q + '2' + $q + '>' + $safeMsg + '</text></binding></visual></toast>'
    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
    $doc.LoadXml($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Fuchibol').Show((New-Object Windows.UI.Notifications.ToastNotification $doc))
  } catch { }
}

# --- Main ---
Set-Location $Root
Test-Node

if ($Status) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Write-Host "ACTIVO - PID $($conn.OwningProcess) en http://localhost:$Port" -ForegroundColor Green
    $tunnelUrl = Join-Path $LogDir 'tunnel.url'
    if (Test-Path $tunnelUrl) {
      Write-Host "Internet: $(Get-Content $tunnelUrl)" -ForegroundColor Magenta
    }
  } else {
    Write-Host 'INACTIVO' -ForegroundColor Yellow
  }
  exit 0
}

if ($Stop) {
  Stop-FuchibolServer
  exit 0
}

Write-Banner 'Servidor en tu PC'
Ensure-HomeEnv
Build-IfNeeded

$lanIp = Get-LanIp
$localUrl = "http://localhost:$Port"
$lanUrl = "http://${lanIp}:$Port"
$publicBase = $lanUrl

Start-FuchibolServer -PublicBaseUrl $publicBase | Out-Null

Write-Host 'Esperando que el servidor responda...' -ForegroundColor DarkGray
if (-not (Test-ServerHealth $localUrl)) {
  Write-Host 'El servidor no respondió a tiempo. Revisa logs\server.log' -ForegroundColor Red
  exit 1
}

$tunnelPublic = $null
if ($Tunnel) {
  $tunnelPublic = Start-CloudflareTunnel
  if ($tunnelPublic) {
  $publicBase = $tunnelPublic
    # Reiniciar con URL pública para que los streams usen el túnel
    Start-FuchibolServer -PublicBaseUrl $publicBase | Out-Null
    if (-not (Test-ServerHealth $localUrl)) {
      Write-Host 'Error al reiniciar con URL del túnel.' -ForegroundColor Red
      exit 1
    }
  }
}

Write-Host ''
Write-Host '  En este PC:     ' -NoNewline; Write-Host $localUrl -ForegroundColor Green
Write-Host '  En tu celular:  ' -NoNewline; Write-Host $lanUrl -ForegroundColor Green -NoNewline
Write-Host '  (misma WiFi)'
if ($tunnelPublic) {
  Write-Host '  Desde internet: ' -NoNewline; Write-Host $tunnelPublic -ForegroundColor Magenta
}
Write-Host ''
Write-Host '  Para apagar: ejecuta Detener-Fuchibol.bat o cierra esta ventana.' -ForegroundColor DarkGray
Write-Host ''

$urlFile = Join-Path $LogDir 'urls.txt'
@(
  "local=$localUrl"
  "lan=$lanUrl"
  "public=$tunnelPublic"
  "updated=$(Get-Date -Format o)"
) | Set-Content $urlFile -Encoding UTF8

Show-Toast 'Fuchibol listo' $localUrl

if (-not $NoBrowser) {
  Start-Process $localUrl
}

if ($Tunnel -and $tunnelPublic -and -not $NoBrowser) {
  Start-Sleep -Seconds 1
  Start-Process $tunnelPublic
}

# Mantener ventana abierta si se lanzó desde consola (no desde VBS)
if ($Host.Name -eq 'ConsoleHost') {
  Write-Host "Servidor en segundo plano. Puedes cerrar esta ventana." -ForegroundColor Yellow
  Write-Host "Para apagar usa Detener-Fuchibol.bat" -ForegroundColor Yellow
}
