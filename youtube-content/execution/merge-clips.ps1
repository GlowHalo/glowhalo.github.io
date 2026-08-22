param(
  [Parameter(Mandatory=$true)][string]$Vrew,
  [Parameter(Mandatory=$true)][string]$Script,
  [Parameter(Mandatory=$true)][string]$Out
)
# === merge-clips.ps1 (2026-08-22) ===
# 목적: AI 이미지 생성 "전에" Vrew가 잘게 쪼갠 클립(22개)을
#       대본의 장면 블록(빈 줄 구분, 14개) 단위로 병합한다.
#       → 이후 [AI 이미지 자동삽입]을 누르면 장면당 1장씩, 딱 14장만 생성된다(크레딧 낭비 0).
# 사용 후 순서: 이 스크립트로 병합 → Vrew에서 열어 이미지 생성 → 저장 → inject-pause(무음)로 최종 조립
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function New-Id { $c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; -join (1..10 | ForEach-Object { $c[(Get-Random -Maximum $c.Length)] }) }
function Esc([string]$s) { $s.Replace('\','\\').Replace('"','\"') }

$tmp = Join-Path $env:TEMP ('vrewmrg_' + [guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($tmp)
[System.IO.File]::Copy($Vrew, (Join-Path $tmp 'in.zip'), $true)
$ex = Join-Path $tmp 'ex'
[System.IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $tmp 'in.zip'), $ex)
$raw = [System.IO.File]::ReadAllText((Join-Path $ex 'project.json'), [System.Text.Encoding]::UTF8)
$j = $raw | ConvertFrom-Json

# ---- 대본을 "빈 줄 기준 블록"으로 묶기 ----
$allLines = @([System.IO.File]::ReadAllLines($Script, [System.Text.Encoding]::UTF8))
$blocks = New-Object System.Collections.ArrayList
$cur = New-Object System.Collections.ArrayList
foreach ($l in $allLines) {
  if ($l.Trim() -eq '') { if ($cur.Count -gt 0) { [void]$blocks.Add(@($cur)); $cur.Clear() } }
  else { [void]$cur.Add($l.Trim()) }
}
if ($cur.Count -gt 0) { [void]$blocks.Add(@($cur)) }
Write-Host ("[i] script blocks {0}, vrew clips {1}" -f $blocks.Count, $j.transcript.clips.Count)

# ---- 블록별 토큰 수 + 자막 텍스트(마커 제거) ----
$blockTok = @(); $blockCap = @()
$tokTotal = 0
foreach ($b in $blocks) {
  $n = 0; $parts = New-Object System.Collections.ArrayList
  foreach ($line in $b) {
    foreach ($tk in @(($line -split '\s+') | Where-Object { $_ -ne '' })) {
      $bare = $tk; if ($tk -match '^(.*?)<(\d+)>$') { $bare = $Matches[1] }
      [void]$parts.Add($bare); $n++
    }
  }
  $blockTok += $n; $blockCap += ($parts -join ' '); $tokTotal += $n
}

# ---- 전체 단어 스트림 (type 0/1, 클립별 asset 기억) ----
$stream = New-Object System.Collections.ArrayList
foreach ($c in $j.transcript.clips) {
  foreach ($w in $c.words) {
    if ($w.type -eq 2) { continue }
    [void]$stream.Add(@{ w=$w; aids=$c.assetIds })
  }
}
$spokenTotal = @($stream | Where-Object { $_.w.type -eq 0 }).Count
Write-Host ("[i] words in file {0}, tokens in script {1}" -f $spokenTotal, $tokTotal)
if ($spokenTotal -ne $tokTotal) { throw ("FAIL: word count mismatch {0} vs {1} - script does not match this vrew" -f $spokenTotal, $tokTotal) }

# ---- 블록 단위로 클립 재구성 ----
$sceneId = $j.transcript.clips[0].sceneId
$clipJsons = New-Object System.Collections.ArrayList
$si = 0
for ($bi = 0; $bi -lt $blocks.Count; $bi++) {
  $need = $blockTok[$bi]; $got = 0
  $wordJsons = New-Object System.Collections.ArrayList
  $aidSet = New-Object System.Collections.ArrayList
  while ($got -lt $need) {
    if ($si -ge $stream.Count) { throw 'FAIL: stream exhausted' }
    $e = $stream[$si]; $w = $e.w
    foreach ($a in $e.aids) { if (-not $aidSet.Contains($a)) { [void]$aidSet.Add($a) } }
    $txt = ''; if ($w.type -eq 0) { $txt = Esc $w.text; $got++ }
    [void]$wordJsons.Add(('{"id":"'+$w.id+'","text":"'+$txt+'","playbackRate":1,"duration":'+$w.duration+',"aligned":false,"type":'+$w.type+',"originalDuration":'+$w.originalDuration+',"originalStartTime":'+$w.originalStartTime+',"truncatedWords":[],"assetIds":["'+$w.assetIds[0]+'"]}'))
    $si++
  }
  # 블록 끝에 붙은 무음도 흡수
  while ($si -lt $stream.Count -and $stream[$si].w.type -eq 1) {
    $pw = $stream[$si].w
    [void]$wordJsons.Add(('{"id":"'+$pw.id+'","text":"","playbackRate":1,"duration":'+$pw.duration+',"aligned":false,"type":1,"originalDuration":'+$pw.originalDuration+',"originalStartTime":'+$pw.originalStartTime+',"truncatedWords":[],"assetIds":["'+$pw.assetIds[0]+'"]}'))
    $si++
  }
  [void]$wordJsons.Add(('{"id":"'+(New-Id)+'","text":"","playbackRate":1,"duration":0,"aligned":false,"type":2,"originalDuration":0,"originalStartTime":0,"truncatedWords":[],"assetIds":[]}'))
  $aids = @(); foreach ($a in $aidSet) { $aids += ('"'+$a+'"') }
  $capText = Esc $blockCap[$bi]
  $clip = '{"sceneId":"'+$sceneId+'","words":['+($wordJsons -join ',')+'],"captionMode":"MANUAL","captions":[{"text":[{"insert":"'+$capText+'\n"}]},{"text":[{"insert":"\n"}]}],"assetIds":['+($aids -join ',')+'],"dirty":{"blankDeleted":false,"caption":false,"video":false},"translationModified":{"result":false,"source":false},"id":"'+(New-Id)+'"}'
  [void]$clipJsons.Add($clip)
}
Write-Host ("[i] merged clips: {0} -> {1}" -f $j.transcript.clips.Count, $clipJsons.Count) -ForegroundColor Cyan

# ---- clips 배열 교체 ----
$s1 = $raw.IndexOf('"clips":[')
$s2 = $raw.IndexOf('],"sceneNames"', $s1)
if ($s1 -lt 0 -or $s2 -lt 0) { throw 'FAIL: clips array not found' }
$out2 = $raw.Substring(0, $s1+9) + ($clipJsons -join ',') + $raw.Substring($s2)

# ---- 무결성 + 재포장 ----
$blank = $out2 -replace '("integrity":")[0-9a-f]{64}"','$1"'
$sha=[System.Security.Cryptography.SHA256]::Create()
$hash = -join ($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($blank)) | ForEach-Object { $_.ToString('x2') })
$final = $blank -replace '("integrity":")"', ('${1}'+$hash+'"')
$chk = $final | ConvertFrom-Json
Write-Host ("[i] verify: clips {0}" -f $chk.transcript.clips.Count)

if ([System.IO.File]::Exists($Out)) { [System.IO.File]::Delete($Out) }
$bz = Join-Path $tmp 'out.zip'
$fs=[System.IO.File]::Open($bz,[System.IO.FileMode]::Create)
$zip=New-Object System.IO.Compression.ZipArchive($fs,[System.IO.Compression.ZipArchiveMode]::Create)
$e1=$zip.CreateEntry('project.json',[System.IO.Compression.CompressionLevel]::Optimal)
$w1=New-Object System.IO.StreamWriter($e1.Open(),(New-Object System.Text.UTF8Encoding($false)))
$w1.Write($final); $w1.Flush(); $w1.Dispose()
foreach ($f in Get-ChildItem (Join-Path $ex 'media') | Sort-Object Name) {
  $e2=$zip.CreateEntry(('media/'+$f.Name),[System.IO.Compression.CompressionLevel]::Optimal)
  $s3=$e2.Open(); $bb=[System.IO.File]::ReadAllBytes($f.FullName); $s3.Write($bb,0,$bb.Length); $s3.Flush(); $s3.Dispose()
}
$zip.Dispose(); $fs.Dispose()
[System.IO.File]::Copy($bz, $Out, $true)
[System.IO.Directory]::Delete($tmp, $true)
Write-Host ("[OK] merged: {0}" -f $Out) -ForegroundColor Green
