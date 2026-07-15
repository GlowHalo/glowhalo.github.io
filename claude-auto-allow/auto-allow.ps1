# auto-allow.ps1
# Claude Desktop 권한 팝업이 뜨면 "항상 허용"을, 없으면 "한 번만 허용"을 자동 클릭합니다.
# 버튼을 "텍스트"로 찾으므로 창 위치/해상도와 무관하게 동작합니다.
#
# 실행:   powershell -ExecutionPolicy Bypass -File auto-allow.ps1
# 중지:   창에서 Ctrl+C  (백그라운드로 돌릴 때는 start-hidden.vbs 참고)

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$UIA = [System.Windows.Automation.AutomationElement]
$CT  = [System.Windows.Automation.ControlType]
$TS  = [System.Windows.Automation.TreeScope]

# --- 설정 --------------------------------------------------------------
# 우선순위 1: "항상 허용" 계열. 이게 있으면 먼저 클릭.
$alwaysPatterns = @('항상 허용', '항상허용', 'Always allow', 'Allow always')
# 우선순위 2: "한 번만 허용" 계열. 항상 허용이 없을 때만 클릭.
$oncePatterns   = @('한 번만 허용', '한번만 허용', '한 번 허용', 'Allow once', 'Allow for this chat')
$pollMs         = 700     # 몇 ms 간격으로 팝업을 검사할지
$cooldownMs     = 1200    # 한 번 클릭한 뒤 잠깐 쉬는 시간(중복 클릭 방지)
# ----------------------------------------------------------------------

function Matches-Any([string]$name, [string[]]$patterns) {
    if ([string]::IsNullOrWhiteSpace($name)) { return $false }
    foreach ($p in $patterns) {
        if ($name -like "*$p*") { return $true }
    }
    return $false
}

function Invoke-Button($btn) {
    # 1) InvokePattern으로 클릭 시도
    $ip = $null
    if ($btn.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$ip)) {
        try { $ip.Invoke(); return $true } catch {}
    }
    # 2) 실패 시 마우스 클릭 폴백 (버튼 중앙 좌표)
    try {
        $r = $btn.Current.BoundingRectangle
        if ($r.Width -gt 0 -and $r.Height -gt 0) {
            $x = [int]($r.X + $r.Width / 2)
            $y = [int]($r.Y + $r.Height / 2)
            [Mouse]::Click($x, $y)
            return $true
        }
    } catch {}
    return $false
}

# 마우스 클릭 폴백용 Win32 호출
if (-not ([System.Management.Automation.PSTypeName]'Mouse').Type) {
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Mouse {
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern void mouse_event(uint f, uint dx, uint dy, uint d, int e);
    const uint LEFTDOWN = 0x02, LEFTUP = 0x04;
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        mouse_event(LEFTDOWN, 0, 0, 0, 0);
        mouse_event(LEFTUP, 0, 0, 0, 0);
    }
}
"@
}

$root    = $UIA::RootElement
$winCond = New-Object System.Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Window)
$btnCond = New-Object System.Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Button)

Write-Host "Claude 자동 허용 매크로 시작. (Ctrl+C 로 중지)" -ForegroundColor Green

while ($true) {
    try {
        $claudePids = @((Get-Process -Name 'Claude' -ErrorAction SilentlyContinue).Id)
        if ($claudePids.Count -gt 0) {
            $windows = $root.FindAll($TS::Children, $winCond)
            foreach ($w in $windows) {
                if ($claudePids -notcontains $w.Current.ProcessId) { continue }

                $buttons = $w.FindAll($TS::Descendants, $btnCond)
                $target  = $null

                # 1순위: 항상 허용
                foreach ($b in $buttons) {
                    if (Matches-Any $b.Current.Name $alwaysPatterns) { $target = $b; break }
                }
                # 2순위: 한 번만 허용
                if ($null -eq $target) {
                    foreach ($b in $buttons) {
                        if (Matches-Any $b.Current.Name $oncePatterns) { $target = $b; break }
                    }
                }

                if ($null -ne $target) {
                    $label = $target.Current.Name
                    if (Invoke-Button $target) {
                        Write-Host ("[{0}] 클릭: {1}" -f (Get-Date -Format 'HH:mm:ss'), $label) -ForegroundColor Cyan
                        Start-Sleep -Milliseconds $cooldownMs
                    }
                }
            }
        }
    } catch {
        # 창이 닫히는 도중 등 일시적 오류는 무시
    }
    Start-Sleep -Milliseconds $pollMs
}
