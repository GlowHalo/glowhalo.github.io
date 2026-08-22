$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
Write-Host ''
Write-Host '=== Vrew 클립 병합 (이미지 생성 전) ===' -ForegroundColor Cyan
Write-Host ("폴더: {0}" -f $base)
Write-Host ''
$raws = @(Get-ChildItem -LiteralPath $base -Filter '*_raw.vrew' -File | Sort-Object Name)
if ($raws.Count -eq 0) {
  Write-Host '[!] *_raw.vrew 파일이 없습니다.' -ForegroundColor Yellow
  Write-Host '    Vrew 3단계에서 [AI 이미지] 토글을 끄고 만든 초안을' -ForegroundColor Yellow
  Write-Host '    <회차이름>_raw.vrew 로 저장한 뒤 다시 실행하세요.' -ForegroundColor Yellow
  return
}
$done=0; $skip=0; $fail=0
foreach ($r in $raws) {
  $name = $r.BaseName -replace '_raw$',''
  $SUF = [string]([char]0xB300) + [string]([char]0xBCF8)
  $script = Join-Path $base ($name + '_' + $SUF + '.txt')
  $out    = Join-Path $base ($name + '_' + [string]([char]0xBCD1) + [string]([char]0xD569) + '.vrew')  # _병합
  Write-Host ("--- [{0}] ---" -f $name) -ForegroundColor Cyan
  if (-not (Test-Path -LiteralPath $script)) { Write-Host ("[!] {0}: script txt not found - skip" -f $name) -ForegroundColor Yellow; $skip++; Write-Host ''; continue }
  if (Test-Path -LiteralPath $out) {
    $ot = (Get-Item -LiteralPath $out).LastWriteTime
    if ($ot -gt $r.LastWriteTime -and $ot -gt (Get-Item -LiteralPath $script).LastWriteTime) {
      Write-Host '[=] 이미 최신 - 건너뜀' -ForegroundColor DarkGray; $skip++; Write-Host ''; continue
    }
  }
  try { & (Join-Path $base 'merge-clips.ps1') -Vrew $r.FullName -Script $script -Out $out; $done++ }
  catch { Write-Host ("[X] 실패: {0}" -f $_.Exception.Message) -ForegroundColor Red; $fail++ }
  Write-Host ''
}
Write-Host ("완료 {0}건, 건너뜀 {1}건, 실패 {2}건" -f $done, $skip, $fail) -ForegroundColor Green
