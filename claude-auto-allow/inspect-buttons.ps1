# inspect-buttons.ps1
# Claude Desktop 창 안의 버튼 이름을 모두 출력합니다.
# 권한 팝업이 "떠 있는 상태"에서 실행하면 실제 버튼 레이블을 확인할 수 있습니다.
# 실행: 우클릭 > PowerShell로 실행  또는  powershell -ExecutionPolicy Bypass -File inspect-buttons.ps1

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$UIA = [System.Windows.Automation.AutomationElement]
$CT  = [System.Windows.Automation.ControlType]
$TS  = [System.Windows.Automation.TreeScope]

$claudePids = @((Get-Process -Name 'Claude' -ErrorAction SilentlyContinue).Id)
if ($claudePids.Count -eq 0) {
    Write-Host "Claude 프로세스를 찾지 못했습니다. Claude Desktop이 실행 중인지 확인하세요." -ForegroundColor Red
    return
}

$root = $UIA::RootElement
$winCond = New-Object System.Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Window)
$windows = $root.FindAll($TS::Children, $winCond)

$btnCond = New-Object System.Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, $CT::Button)

foreach ($w in $windows) {
    if ($claudePids -notcontains $w.Current.ProcessId) { continue }
    Write-Host ""
    Write-Host ("=== 창: '{0}' (pid {1}) ===" -f $w.Current.Name, $w.Current.ProcessId) -ForegroundColor Cyan
    $buttons = $w.FindAll($TS::Descendants, $btnCond)
    Write-Host ("버튼 개수: {0}" -f $buttons.Count)
    foreach ($b in $buttons) {
        $n = $b.Current.Name
        if ([string]::IsNullOrWhiteSpace($n)) { $n = "(이름 없음)" }
        Write-Host ("  [버튼] {0}" -f $n) -ForegroundColor Yellow
    }
}
Write-Host ""
Write-Host "위 목록에서 '항상 허용' / '한 번만 허용' 에 해당하는 정확한 텍스트를 확인하세요." -ForegroundColor Green
