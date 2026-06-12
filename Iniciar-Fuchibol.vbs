' Inicia Fuchibol sin ventana de consola (como un .exe)
Set sh = CreateObject("WScript.Shell")
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

exe = root & "\Fuchibol.exe"
If CreateObject("Scripting.FileSystemObject").FileExists(exe) Then
  sh.Run """" & exe & """", 0, False
Else
  sh.Run "powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & root & "\scripts\fuchibol-home.ps1"" -Quick", 0, False
End If
