' control-panel.vbs
' 조작 화면(control-panel.ps1)을 콘솔 창 없이 실행합니다. 더블클릭하세요.
Set sh = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\control-panel.ps1"""
sh.Run cmd, 0, False
