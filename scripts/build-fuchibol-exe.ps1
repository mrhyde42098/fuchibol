# Genera UN solo Fuchibol.exe en la raiz del proyecto
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$iconDst = Join-Path $Root 'desktop\icon.png'
if (-not (Test-Path $iconDst)) {
  Write-Host 'Generando icono...' -ForegroundColor DarkGray
  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap 256, 256
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(10, 17, 40))
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 102, 255))
  $g.FillEllipse($brush, 64, 64, 128, 128)
  $g.Dispose()
  $bmp.Save($iconDst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Write-Host 'Cerrando Fuchibol si esta abierto...' -ForegroundColor DarkGray
Get-Process -Name 'Fuchibol' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host 'Instalando Electron (solo la primera vez)...' -ForegroundColor Cyan
npm install --prefix desktop
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host 'Compilando Fuchibol.exe...' -ForegroundColor Cyan
npm run build --prefix desktop
if ($LASTEXITCODE -ne 0) { exit 1 }

$built = Join-Path $Root 'release\Fuchibol.exe'
$dest = Join-Path $Root 'Fuchibol.exe'
if (-not (Test-Path $built)) {
  Write-Host 'No se encontro release\Fuchibol.exe' -ForegroundColor Red
  exit 1
}

Copy-Item $built $dest -Force
Remove-Item (Join-Path $Root 'Fuchibol-nuevo.exe') -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Listo — un solo ejecutable:' -ForegroundColor Green
Write-Host "  $dest" -ForegroundColor Green
Write-Host ''
Write-Host 'Doble clic para abrir. Minimizar = bandeja del sistema.' -ForegroundColor Yellow
