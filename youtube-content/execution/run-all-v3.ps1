$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
Write-Host ''
Write-Host '=== Vrew pause injection (v3) ===' -ForegroundColor Cyan
Write-Host ("folder: {0}" -f $base)
Write-Host ''
$SUF     = [string]([char]0xB300) + [string]([char]0xBCF8)   # script suffix
$MERGED  = [string]([char]0xBCD1) + [string]([char]0xD569)   # merged suffix
$DONESUF = [string]([char]0xC644) + [string]([char]0xC131)   # done suffix
$inj = Join-Path $base 'inject-pause-v3.ps1'
if (-not (Test-Path -LiteralPath $inj)) { Write-Host '[!] inject-pause-v3.ps1 missing' -ForegroundColor Red; return }
$injTime = (Get-Item -LiteralPath $inj).LastWriteTime
# natural order: 1.a, 2.b, ... 9.i, 10.j  (plain name sort would put 10 right after 1)
$rxNum = New-Object System.Text.RegularExpressions.Regex('^([0-9]+)')
$masters = @(Get-ChildItem -LiteralPath $base -Filter ('*_' + $SUF + '.txt') -File)
$masters = @($masters | Sort-Object @{Expression={ $mm = $rxNum.Match($_.Name); if ($mm.Success) { [int]$mm.Groups[1].Value } else { 99999 } }}, @{Expression={ $_.Name }})
if ($masters.Count -eq 0) { Write-Host '[!] no script txt found' -ForegroundColor Yellow; return }
$done=0; $skip=0; $fail=0; $none=0
$failed = New-Object System.Collections.ArrayList
$log = New-Object System.Collections.ArrayList
[void]$log.Add('run-all-v3 result log')
foreach ($m in $masters) {
  $name = $m.BaseName -replace ('_' + $SUF + '$'),''
  $out  = Join-Path $base ($name + '_' + $DONESUF + '.vrew')
  Write-Host ("--- [{0}] ---" -f $name) -ForegroundColor Cyan
  # prefer <name>.vrew, fall back to <name>_merged.vrew
  $vrew = Join-Path $base ($name + '.vrew')
  if (-not (Test-Path -LiteralPath $vrew)) {
    $alt = Join-Path $base ($name + '_' + $MERGED + '.vrew')
    if (Test-Path -LiteralPath $alt) { $vrew = $alt; Write-Host '    (using merged file)' -ForegroundColor DarkGray }
  }
  if (-not (Test-Path -LiteralPath $vrew)) {
    Write-Host ("[ ] {0}.vrew not found - skip" -f $name) -ForegroundColor DarkGray
    [void]$log.Add(('{0} : NO-VREW' -f $name))
    $none++; Write-Host ''; continue
  }
  if (Test-Path -LiteralPath $out) {
    $ot = (Get-Item -LiteralPath $out).LastWriteTime
    if ($ot -gt (Get-Item -LiteralPath $vrew).LastWriteTime -and $ot -gt $m.LastWriteTime -and $ot -gt $injTime) {
      Write-Host '[=] up to date - skip' -ForegroundColor DarkGray
      [void]$log.Add(('{0} : UPTODATE' -f $name))
      $skip++; Write-Host ''; continue
    }
  }
  try {
    $outText = & $inj -Vrew $vrew -Script $m.FullName -Out $out 6>&1 | Out-String
    Write-Host $outText.TrimEnd()
    $vline = ''; $iline = ''
    foreach ($ln in ($outText -split "`n")) {
      if ($ln -match 'verify:') { $vline = $ln.Trim() }
      if ($ln -match 'images used') { $iline = $ln.Trim() }
    }
    [void]$log.Add(('{0} : OK   {1}   {2}' -f $name, $vline, $iline))
    $done++
  }
  catch {
    Write-Host ("[X] failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
    [void]$log.Add(('{0} : FAILED  {1}' -f $name, $_.Exception.Message))
    $fail++; [void]$failed.Add($name)
  }
  Write-Host ''
}
Write-Host ("done {0}, uptodate {1}, no-vrew {2}, failed {3}" -f $done, $skip, $none, $fail) -ForegroundColor Green
if ($fail -gt 0) { Write-Host ("[X] check these: {0}" -f ($failed -join ', ')) -ForegroundColor Red }
[void]$log.Add(('summary: done {0}, uptodate {1}, no-vrew {2}, failed {3}' -f $done, $skip, $none, $fail))
[void]$log.Add(('finished at ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')))
$logPath = Join-Path $base '_last-run.txt'
[System.IO.File]::WriteAllLines($logPath, [string[]]$log, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("[i] log written: {0}" -f $logPath) -ForegroundColor DarkGray
