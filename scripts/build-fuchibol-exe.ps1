# Genera Fuchibol.exe (panel grafico Electron) en release/
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$iconSrc = Join-Path $Root 'frontend\public\brand\fuchibol-mark.svg'
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

Write-Host 'Instalando Electron (solo la primera vez)...' -ForegroundColor Cyan
npm install --prefix desktop
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host 'Compilando Fuchibol.exe...' -ForegroundColor Cyan
npm run build --prefix desktop
if ($LASTEXITCODE -ne 0) { exit 1 }

$exe = Join-Path $Root 'release\Fuchibol.exe'
if (Test-Path $exe) {
  $dest = Join-Path $Root 'Fuchibol.exe'
  try {
    Copy-Item $exe $dest -Force
  } catch {
    $dest = Join-Path $Root 'Fuchibol-nuevo.exe'
    Copy-Item $exe $dest -Force
    Write-Host 'Fuchibol.exe estaba abierto — guardado como Fuchibol-nuevo.exe' -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host 'Listo:' -ForegroundColor Green
  Write-Host "  $exe" -ForegroundColor Green
  Write-Host "  $dest" -ForegroundColor Green
  Write-Host ''
  Write-Host 'Abre el .exe desde la carpeta que tiene backend/ y frontend/.' -ForegroundColor Yellow
} else {
  Write-Host 'No se encontro release\Fuchibol.exe' -ForegroundColor Red
  exit 1
}
