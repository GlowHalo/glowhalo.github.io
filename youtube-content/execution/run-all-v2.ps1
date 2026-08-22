$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
Write-Host ''
Write-Host '=== Vrew 무음 자동삽입 (v2) ===' -ForegroundColor Cyan
Write-Host ("폴더: {0}" -f $base)
Write-Host ''
$masters = @(Get-ChildItem -LiteralPath $base -Filter '*_대본.txt' -File | Sort-Object Name)
if ($masters.Count -eq 0) { Write-Host '[!] *_대본.txt 파일이 없습니다.' -ForegroundColor Yellow; return }
$done=0; $skip=0; $fail=0; $none=0
foreach ($m in $masters) {
  $name = $m.BaseName -replace '_대본$',''
  $vrew = Join-Path $base ($name + '.vrew')
  $out  = Join-Path $base ($name + '_완성.vrew')
  Write-Host ("--- [{0}] ---" -f $name) -ForegroundColor Cyan
  if (-not (Test-Path -LiteralPath $vrew)) { Write-Host ("[ ] {0}.vrew 없음 - 건너뜀" -f $name) -ForegroundColor DarkGray; $none++; Write-Host ''; continue }
  if (Test-Path -LiteralPath $out) {
    $ot = (Get-Item -LiteralPath $out).LastWriteTime
    if ($ot -gt (Get-Item -LiteralPath $vrew).LastWriteTime -and $ot -gt $m.LastWriteTime) {
      Write-Host '[=] 이미 최신 - 건너뜀 (원본/대본 수정 시 자동 재생성)' -ForegroundColor DarkGray
      $skip++; Write-Host ''; continue
    }
  }
  try { & (Join-Path $base 'inject-pause-v2.ps1') -Vrew $vrew -Script $m.FullName -Out $out; $done++ }
  catch { Write-Host ("[X] 실패: {0}" -f $_.Exception.Message) -ForegroundColor Red; $fail++ }
  Write-Host ''
}
Write-Host ("완료 {0}건, 최신 {1}건, vrew없음 {2}건, 실패 {3}건" -f $done, $skip, $none, $fail) -ForegroundColor Green
