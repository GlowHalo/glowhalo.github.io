$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$base = $PSScriptRoot
Write-Host ''
Write-Host '=== Vrew clip merge (before image generation) ===' -ForegroundColor Cyan
Write-Host ("folder: {0}" -f $base)
Write-Host ''
# natural order: 1.a, 2.b, ... 9.i, 10.j  (plain name sort would put 10 right after 1)
$rxNum = New-Object System.Text.RegularExpressions.Regex('^([0-9]+)')
$raws = @(Get-ChildItem -LiteralPath $base -Filter '*_raw.vrew' -File)
$raws = @($raws | Sort-Object @{Expression={ $mm = $rxNum.Match($_.Name); if ($mm.Success) { [int]$mm.Groups[1].Value } else { 99999 } }}, @{Expression={ $_.Name }})
if ($raws.Count -eq 0) {
  Write-Host '[!] no *_raw.vrew found.' -ForegroundColor Yellow
  Write-Host '    Turn OFF [AI image] on Vrew step 3, then save the draft as <name>_raw.vrew' -ForegroundColor Yellow
  return
}
$SUF    = [string]([char]0xB300) + [string]([char]0xBCF8)   # script suffix
$OUTSUF = [string]([char]0xBCD1) + [string]([char]0xD569)   # merged suffix
$done=0; $skip=0; $fail=0
foreach ($r in $raws) {
  $name = $r.BaseName -replace '_raw$',''
  $script = Join-Path $base ($name + '_' + $SUF + '.txt')
  $out    = Join-Path $base ($name + '_' + $OUTSUF + '.vrew')
  Write-Host ("--- [{0}] ---" -f $name) -ForegroundColor Cyan
  if (-not (Test-Path -LiteralPath $script)) {
    Write-Host ("[!] {0}: script txt not found - skip" -f $name) -ForegroundColor Yellow
    $skip++; Write-Host ''; continue
  }
  if (Test-Path -LiteralPath $out) {
    # HARD GUARD: never overwrite a merged file that already holds generated images
    $hasImg = $false
    try {
      $za = [System.IO.Compression.ZipFile]::OpenRead($out)
      foreach ($en in $za.Entries) { if ($en.FullName -match '\.(png|jpg|jpeg|webp)$') { $hasImg = $true; break } }
      $za.Dispose()
    } catch { }
    if ($hasImg) {
      Write-Host '[!] merged file already has generated images - SKIP (protecting credits)' -ForegroundColor Yellow
      $skip++; Write-Host ''; continue
    }
    $ot = (Get-Item -LiteralPath $out).LastWriteTime
    if ($ot -gt $r.LastWriteTime -and $ot -gt (Get-Item -LiteralPath $script).LastWriteTime) {
      Write-Host '[=] up to date - skip' -ForegroundColor DarkGray
      $skip++; Write-Host ''; continue
    }
  }
  try { & (Join-Path $base 'merge-clips.ps1') -Vrew $r.FullName -Script $script -Out $out; $done++ }
  catch { Write-Host ("[X] failed: {0}" -f $_.Exception.Message) -ForegroundColor Red; $fail++ }
  Write-Host ''
}
Write-Host ("done {0}, skipped {1}, failed {2}" -f $done, $skip, $fail) -ForegroundColor Green
