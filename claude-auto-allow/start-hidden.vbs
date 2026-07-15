' start-hidden.vbs
' auto-allow.ps1 을 창 없이(백그라운드) 실행합니다. 더블클릭하면 됩니다.
' 중지하려면 작업 관리자에서 powershell.exe 프로세스를 끝내세요.
Set sh = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\auto-allow.ps1"""
sh.Run cmd, 0, False
