$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
Write-Host ''
Write-Host '=== Vrew pause injection (v2) ===' -ForegroundColor Cyan
Write-Host ("folder: {0}" -f $base)
Write-Host ''
$SUF     = [string]([char]0xB300) + [string]([char]0xBCF8)   # script suffix
$MERGED  = [string]([char]0xBCD1) + [string]([char]0xD569)   # merged suffix
$DONESUF = [string]([char]0xC644) + [string]([char]0xC131)   # done suffix
$masters = @(Get-ChildItem -LiteralPath $base -Filter ('*_' + $SUF + '.txt') -File | Sort-Object Name)
if ($masters.Count -eq 0) { Write-Host '[!] no script txt found' -ForegroundColor Yellow; return }
$done=0; $skip=0; $fail=0; $none=0
foreach ($m in $masters) {
  $name = $m.BaseName -replace ('_' + $SUF + '$'),''
  $out  = Join-Path $base ($name + '_' + $DONESUF + '.vrew')
  Write-Host ("--- [{0}] ---" -f $name) -ForegroundColor Cyan
  # prefer <name>.vrew, fall back to <name>_merged.vrew (image generation is often saved there)
  $vrew = Join-Path $base ($name + '.vrew')
  if (-not (Test-Path -LiteralPath $vrew)) {
    $alt = Join-Path $base ($name + '_' + $MERGED + '.vrew')
    if (Test-Path -LiteralPath $alt) {
      $vrew = $alt
      Write-Host '    (using merged file)' -ForegroundColor DarkGray
    }
  }
  if (-not (Test-Path -LiteralPath $vrew)) {
    Write-Host ("[ ] {0}.vrew not found - skip" -f $name) -ForegroundColor DarkGray
    $none++; Write-Host ''; continue
  }
  if (Test-Path -LiteralPath $out) {
    $ot = (Get-Item -LiteralPath $out).LastWriteTime
    if ($ot -gt (Get-Item -LiteralPath $vrew).LastWriteTime -and $ot -gt $m.LastWriteTime) {
      Write-Host '[=] up to date - skip' -ForegroundColor DarkGray
      $skip++; Write-Host ''; continue
    }
  }
  try { & (Join-Path $base 'inject-pause-v2.ps1') -Vrew $vrew -Script $m.FullName -Out $out; $done++ }
  catch { Write-Host ("[X] failed: {0}" -f $_.Exception.Message) -ForegroundColor Red; $fail++ }
  Write-Host ''
}
Write-Host ("done {0}, uptodate {1}, no-vrew {2}, failed {3}" -f $done, $skip, $none, $fail) -ForegroundColor Green
