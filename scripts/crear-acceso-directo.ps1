# Crea acceso directo en el Escritorio
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Desktop = [Environment]::GetFolderPath('Desktop')
$Wsh = New-Object -ComObject WScript.Shell

$bat = Join-Path $Root 'Iniciar-Fuchibol.bat'
$exe = Join-Path $Root 'Fuchibol.exe'
$target = if (Test-Path $exe) { $exe } else { $bat }

$lnk = Join-Path $Desktop 'Fuchibol.lnk'
$sc = $Wsh.CreateShortcut($lnk)
$sc.TargetPath = $target
$sc.WorkingDirectory = $Root
$sc.Description = 'Abrir Fuchibol — deportes en vivo'
$sc.IconLocation = Join-Path $Root 'frontend\public\brand\fuchibol-mark.svg'
$sc.Save()

Write-Host "Acceso directo creado: $lnk" -ForegroundColor Green
