# control-panel.ps1
# Claude 자동 허용 매크로 조작 화면 (현황 표시 + 시작/정지 + 자리비움 모드)
# 이 창이 직접 감시·클릭을 수행합니다. 창을 닫으면 완전히 종료됩니다.
# 실행: control-panel.vbs 더블클릭  (또는 powershell -ExecutionPolicy Bypass -File control-panel.ps1)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$UIA = [System.Windows.Automation.AutomationElement]
$CT  = [System.Windows.Automation.ControlType]
$TS  = [System.Windows.Automation.TreeScope]

# --- 설정 --------------------------------------------------------------
$script:alwaysPatterns = @('항상 허용', '항상허용', 'Always allow', 'Allow always')
$script:oncePatterns   = @('한 번만 허용', '한번만 허용', '한 번 허용', 'Allow once', 'Allow for this chat')
$script:waitPrefix     = "입력 대기 중 "     # 사이드바에서 응답 대기 세션 식별용
$pollMs                = 800
$script:sweepIntervalSec = 10                # 자리비움: 한 바퀴 순회 후 다음 순회까지 대기(초)
# ----------------------------------------------------------------------

# 마우스 클릭 폴백용 Win32
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

# 콘솔 숨기기 + 폼 전면화용 Win32
if (-not ([System.Management.Automation.PSTypeName]'WinApi').Type) {
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinApi {
    [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
}
# 이 스크립트 자신의 콘솔 창 숨기기 (SW_HIDE = 0)
$__con = [WinApi]::GetConsoleWindow()
if ($__con -ne [IntPtr]::Zero) { [void][WinApi]::ShowWindow($__con, 0) }

# --- 공용 함수 ---------------------------------------------------------
function Matches-Any([string]$name, [string[]]$patterns) {
    if ([string]::IsNullOrWhiteSpace($name)) { return $false }
    foreach ($p in $patterns) { if ($name -like "*$p*") { return $true } }
    return $false
}

function Invoke-Button($btn) {
    $ip = $null
    if ($btn.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$ip)) {
        try { $ip.Invoke(); return $true } catch {}
    }
    try {
        $r = $btn.Current.BoundingRectangle
        if ($r.Width -gt 0 -and $r.Height -gt 0) {
            [Mouse]::Click([int]($r.X + $r.Width/2), [int]($r.Y + $r.Height/2))
            return $true
        }
    } catch {}
    return $false
}

# 현재 화면에서 허용 버튼 스캔 후 클릭 → 클릭한 라벨 or $null
function Scan-AndClick($w) {
    $buttons = $w.FindAll($TS::Descendants, $script:btnCond)
    $target = $null
    foreach ($b in $buttons) { if (Matches-Any $b.Current.Name $script:alwaysPatterns) { $target = $b; break } }
    if ($null -eq $target) {
        foreach ($b in $buttons) { if (Matches-Any $b.Current.Name $script:oncePatterns) { $target = $b; break } }
    }
    if ($null -ne $target) {
        $label = $target.Current.Name
        if (Invoke-Button $target) { return $label }
    }
    return $null
}

# 클릭 1건 기록(횟수+로그)
function Record-Click($label, $prefix) {
    $script:clickCount++
    $countLbl.Text = "자동 클릭: $($script:clickCount)회"
    $logBox.Items.Insert(0, ("{0}  {1}{2}" -f (Get-Date -Format 'HH:mm:ss'), $prefix, $label))
    while ($logBox.Items.Count -gt 200) { $logBox.Items.RemoveAt(200) }
}

# ===== 자리비움 모드: '입력 대기 중' 세션만 순회 =====

# 사이드바 컨테이너(dframe-sidebar). 접혀 있으면 펼침 시도 후 null(다음 틱 재시도)
function Get-Sidebar($w) {
    $c = New-Object System.Windows.Automation.PropertyCondition($UIA::ClassNameProperty, 'dframe-sidebar')
    $sb = $w.FindFirst($TS::Descendants, $c)
    if ($null -ne $sb) { return $sb }
    foreach ($b in $w.FindAll($TS::Descendants, $script:btnCond)) {
        if ($b.Current.Name -like '*Expand sidebar*') { [void](Invoke-Button $b); break }
    }
    return $null
}

# 사이드바에서 '입력 대기 중' 세션 제목 목록(문자열) 반환
function Get-WaitingTitles($sidebar) {
    $titles = @()
    if ($null -eq $sidebar) { return $titles }
    foreach ($b in $sidebar.FindAll($TS::Descendants, $script:btnCond)) {
        $nm = $b.Current.Name
        if (-not [string]::IsNullOrWhiteSpace($nm) -and $nm.StartsWith($script:waitPrefix)) {
            $titles += $nm.Substring($script:waitPrefix.Length)
        }
    }
    return $titles
}

# 제목으로 대기 세션 전환(전환 시점에 새로 찾음 → 스테일 요소 방지)
function Switch-ToWaiting($sidebar, $title) {
    $target = $script:waitPrefix + $title
    foreach ($b in $sidebar.FindAll($TS::Descendants, $script:btnCond)) {
        if ($b.Current.Name -eq $target) { [void](Invoke-Button $b); return }
    }
}

function Reset-Away {
    $script:awayStep = 'collect'
    $script:awayWaitUntil = Get-Date
    $script:awayCandidates = @()
    $script:awayIndex = 0
}

# 자리비움 한 단계(틱당 1스텝 → UI 안 멈춤)
function Away-Step($w) {
    if ((Get-Date) -lt $script:awayWaitUntil) { return }
    switch ($script:awayStep) {
        'collect' {
            $sb = Get-Sidebar $w
            if ($null -eq $sb) { $script:awayWaitUntil = (Get-Date).AddMilliseconds(1500); return }
            $script:awayCandidates = @(Get-WaitingTitles $sb)
            $script:awayIndex = 0
            $sweepLbl.Text = "입력 대기 세션: $($script:awayCandidates.Count)개"
            if ($script:awayCandidates.Count -eq 0) { $script:awayStep = 'rest' } else { $script:awayStep = 'switch' }
        }
        'switch' {
            if ($script:awayIndex -ge $script:awayCandidates.Count) { $script:awayStep = 'rest'; return }
            $title = $script:awayCandidates[$script:awayIndex]
            $sb = Get-Sidebar $w
            if ($null -ne $sb) { Switch-ToWaiting $sb $title }
            $sweepLbl.Text = "확인 중: $title"
            $script:awayWaitUntil = (Get-Date).AddMilliseconds(900)   # 렌더 대기
            $script:awayStep = 'scan'
        }
        'scan' {
            $label = Scan-AndClick $w
            if ($label) {
                Record-Click $label "[자리비움] "
                $script:awayWaitUntil = (Get-Date).AddMilliseconds(900)
            }
            $script:awayIndex++
            $script:awayStep = 'switch'
        }
        'rest' {
            $sweepLbl.Text = "대기 중… $($script:sweepIntervalSec)초 후 다시 순회"
            $script:awayWaitUntil = (Get-Date).AddSeconds($script:sweepIntervalSec)
            $script:awayStep = 'collect'
        }
    }
}

# 이미 백그라운드로 돌고 있는 auto-allow.ps1 인스턴스 정리 (중복 클릭 방지)
try {
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*auto-allow.ps1*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
} catch {}

$script:root    = $UIA::RootElement
$script:winCond = New-Object System.Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Window)
$script:btnCond = New-Object System.Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Button)
$script:clickCount = 0
$script:cooldownUntil = Get-Date

# 자리비움 상태
$script:awayMode = $false
$script:awayStep = 'collect'
$script:awayWaitUntil = Get-Date
$script:awayCandidates = @()
$script:awayIndex = 0

# ---------------- GUI ----------------
$form = New-Object System.Windows.Forms.Form
$form.Text = "Claude 자동 허용"
$form.Size = New-Object System.Drawing.Size(400, 500)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font("맑은 고딕", 9)

$titleLbl = New-Object System.Windows.Forms.Label
$titleLbl.Text = "Claude Desktop 권한 팝업 자동 허용"
$titleLbl.Location = New-Object System.Drawing.Point(16, 14)
$titleLbl.Size = New-Object System.Drawing.Size(360, 20)
$titleLbl.Font = New-Object System.Drawing.Font("맑은 고딕", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($titleLbl)

# 상태 표시
$statusLbl = New-Object System.Windows.Forms.Label
$statusLbl.Location = New-Object System.Drawing.Point(16, 46)
$statusLbl.Size = New-Object System.Drawing.Size(360, 30)
$statusLbl.Font = New-Object System.Drawing.Font("맑은 고딕", 13, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($statusLbl)

# 클릭 횟수
$countLbl = New-Object System.Windows.Forms.Label
$countLbl.Location = New-Object System.Drawing.Point(16, 80)
$countLbl.Size = New-Object System.Drawing.Size(360, 20)
$countLbl.Text = "자동 클릭: 0회"
$form.Controls.Add($countLbl)

# 시작 / 정지 버튼
$startBtn = New-Object System.Windows.Forms.Button
$startBtn.Text = "▶ 시작"
$startBtn.Location = New-Object System.Drawing.Point(16, 108)
$startBtn.Size = New-Object System.Drawing.Size(175, 40)
$startBtn.BackColor = [System.Drawing.Color]::FromArgb(46, 160, 67)
$startBtn.ForeColor = [System.Drawing.Color]::White
$startBtn.FlatStyle = "Flat"
$form.Controls.Add($startBtn)

$stopBtn = New-Object System.Windows.Forms.Button
$stopBtn.Text = "■ 정지"
$stopBtn.Location = New-Object System.Drawing.Point(201, 108)
$stopBtn.Size = New-Object System.Drawing.Size(175, 40)
$stopBtn.BackColor = [System.Drawing.Color]::FromArgb(207, 55, 55)
$stopBtn.ForeColor = [System.Drawing.Color]::White
$stopBtn.FlatStyle = "Flat"
$form.Controls.Add($stopBtn)

# 자리비움 모드 토글
$awayChk = New-Object System.Windows.Forms.CheckBox
$awayChk.Text = "자리비움 모드 — '입력 대기 중' 세션 순회하며 허용"
$awayChk.Location = New-Object System.Drawing.Point(16, 158)
$awayChk.Size = New-Object System.Drawing.Size(360, 22)
$form.Controls.Add($awayChk)

# 순회 상태 표시 (자리비움일 때만)
$sweepLbl = New-Object System.Windows.Forms.Label
$sweepLbl.Location = New-Object System.Drawing.Point(16, 184)
$sweepLbl.Size = New-Object System.Drawing.Size(360, 18)
$sweepLbl.ForeColor = [System.Drawing.Color]::FromArgb(76, 111, 255)
$sweepLbl.Visible = $false
$form.Controls.Add($sweepLbl)

# 로그
$logLbl = New-Object System.Windows.Forms.Label
$logLbl.Text = "클릭 기록"
$logLbl.Location = New-Object System.Drawing.Point(16, 208)
$logLbl.Size = New-Object System.Drawing.Size(360, 18)
$form.Controls.Add($logLbl)

$logBox = New-Object System.Windows.Forms.ListBox
$logBox.Location = New-Object System.Drawing.Point(16, 228)
$logBox.Size = New-Object System.Drawing.Size(360, 224)
$form.Controls.Add($logBox)

# ---------------- 동작 ----------------
$script:running = $false

function Update-StatusLabel {
    if (-not $script:running) {
        $statusLbl.Text = "■ 정지됨"
        $statusLbl.ForeColor = [System.Drawing.Color]::Gray
        return
    }
    if ($script:awayMode) {
        $statusLbl.Text = "● 자리비움 순회 중"
        $statusLbl.ForeColor = [System.Drawing.Color]::FromArgb(76, 111, 255)
    } else {
        $statusLbl.Text = "● 감시 중"
        $statusLbl.ForeColor = [System.Drawing.Color]::FromArgb(46, 160, 67)
    }
}

function Set-State([bool]$on) {
    $script:running = $on
    if ($on -and $script:awayMode) { Reset-Away }
    $startBtn.Enabled = -not $on
    $stopBtn.Enabled = $on
    Update-StatusLabel
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $pollMs
$timer.Add_Tick({
    if (-not $script:running) { return }
    try {
        $pids = @((Get-Process -Name 'Claude' -ErrorAction SilentlyContinue).Id)
        if ($pids.Count -eq 0) { return }
        if ($script:awayMode) {
            $w = $null
            foreach ($ww in $script:root.FindAll($TS::Children, $script:winCond)) {
                if ($pids -contains $ww.Current.ProcessId) { $w = $ww; break }
            }
            if ($null -ne $w) { Away-Step $w }
        } else {
            if ((Get-Date) -lt $script:cooldownUntil) { return }
            foreach ($w in $script:root.FindAll($TS::Children, $script:winCond)) {
                if ($pids -notcontains $w.Current.ProcessId) { continue }
                $label = Scan-AndClick $w
                if ($label) {
                    Record-Click $label ''
                    $script:cooldownUntil = (Get-Date).AddMilliseconds(1300)
                    break
                }
            }
        }
    } catch {}
})

$startBtn.Add_Click({ Set-State $true })
$stopBtn.Add_Click({ Set-State $false })
$awayChk.Add_CheckedChanged({
    $script:awayMode = $awayChk.Checked
    $sweepLbl.Visible = $script:awayMode
    if ($script:running -and $script:awayMode) { Reset-Away }
    Update-StatusLabel
})
$form.Add_FormClosing({ $timer.Stop() })

# 창이 표시될 때 강제로 보이게 + 전면으로 (Hidden 시작 상태 무력화)
$form.Add_Shown({
    $form.WindowState = 'Normal'
    [void][WinApi]::ShowWindow($form.Handle, 5)   # SW_SHOW
    [void][WinApi]::SetForegroundWindow($form.Handle)
    $form.Activate()
    $form.TopMost = $true
    $form.TopMost = $false
})

# 시작 시 자동 감시 ON
Set-State $true
$timer.Start()

[void]$form.ShowDialog()
$timer.Stop()
$timer.Dispose()
