# Compatibilidad — redirige al lanzador nuevo
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $here 'fuchibol-home.ps1') @args
