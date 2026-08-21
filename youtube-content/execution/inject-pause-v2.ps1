param(
  [Parameter(Mandatory=$true)][string]$Vrew,
  [Parameter(Mandatory=$true)][string]$Script,
  [Parameter(Mandatory=$true)][string]$Out
)
# === v2 (2026-08-21) ===
# 변경점: 최종 자막/단어 텍스트를 .vrew(붙여넣기)가 아니라 "대본(_대본.txt)"에서 가져온다.
#  → 붙여넣기를 짧게(장면당 1문장, 종결부호를 쉼표로) 써서 Vrew 이미지 생성을 줄여도,
#    최종 영상 자막은 대본 원문대로 복원된다. (단어 수·순서는 그대로 일치해야 함)
# v1 대비 실제 코드 차이는 딱 3곳: (A) 경고 비교시 구두점 무시, (B) 자막 파트에 $bare 사용, (C) 단어 json text에 $bare 사용.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function New-Id { $c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; -join (1..10 | ForEach-Object { $c[(Get-Random -Maximum $c.Length)] }) }
function Esc([string]$s) { $s.Replace('\','\\').Replace('"','\"') }

$tmp = Join-Path $env:TEMP ('vrewinj_' + [guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($tmp)
[System.IO.File]::Copy($Vrew, (Join-Path $tmp 'in.zip'), $true)
$ex = Join-Path $tmp 'ex'
[System.IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $tmp 'in.zip'), $ex)
$raw = [System.IO.File]::ReadAllText((Join-Path $ex 'project.json'), [System.Text.Encoding]::UTF8)
$j = $raw | ConvertFrom-Json

# ---- 대본 읽기 ----
$allLines = @([System.IO.File]::ReadAllLines($Script, [System.Text.Encoding]::UTF8))
$lines = @($allLines | Where-Object { $_.Trim() -ne '' })
Write-Host ("[i] script lines {0}, vrew clips {1}" -f $lines.Count, $j.transcript.clips.Count)

# ---- 전체 단어 스트림 (type 0/1 만, 순서대로 / 클립별 이미지 asset 기억) ----
$stream = New-Object System.Collections.ArrayList
foreach ($c in $j.transcript.clips) {
  $imgAsset = $null; $bgmAsset = $null
  foreach ($x in $c.assetIds) {
    $as = $j.props.assets.$x; if (-not $as) { continue }
    foreach ($t in $as.trackIds) {
      $tt = $j.props.tracks.$t
      if ($tt.type -eq 'image') { $imgAsset = $x }
      elseif ($tt.type -eq 'bgm') { $bgmAsset = $x }
    }
  }
  foreach ($w in $c.words) {
    if ($w.type -eq 2) { continue }
    [void]$stream.Add(@{ w=$w; img=$imgAsset; bgm=$bgmAsset })
  }
}
$spokenTotal = @($stream | Where-Object { $_.w.type -eq 0 }).Count
$tokTotal = 0; foreach ($l in $lines) { $tokTotal += @(($l -split '\s+') | Where-Object { $_ -ne '' }).Count }
Write-Host ("[i] words in file {0}, tokens in script {1}" -f $spokenTotal, $tokTotal)
if ($spokenTotal -ne $tokTotal) { throw ("FAIL: word count mismatch {0} vs {1} - script does not match this vrew" -f $spokenTotal, $tokTotal) }

# ---- 침묵 원본 ----
$best = $null
foreach ($e in $stream) { $w=$e.w
  if ($w.type -ne 1 -or $w.assetIds.Count -eq 0) { continue }
  $t = $j.props.assets.($w.assetIds[0]).trackIds[0]; $tr = $j.props.tracks.$t
  if (-not $tr) { continue }
  if ($null -eq $best -or [math]::Abs($w.duration-0.98) -lt [math]::Abs($best.dur-0.98)) {
    $best = @{ media=$tr.mediaId; sin=$tr.sourceIn; sout=$tr.sourceOut; dur=$w.duration } } }
if (-not $best) { throw 'FAIL: silence source not found' }
Write-Host ("[i] silence src: {0} {1}~{2} ({3}s)" -f $best.media,$best.sin,$best.sout,$best.dur)

# ---- 34클립 재구성 ----
$sceneId = $j.transcript.clips[0].sceneId
$newAssets=''; $newTracks=''; $clipJsons = New-Object System.Collections.ArrayList
$si = 0; $warn = 0
foreach ($line in $lines) {
  $toks = @(($line -split '\s+') | Where-Object { $_ -ne '' })
  $wordJsons = New-Object System.Collections.ArrayList
  $imgA = $null; $bgmA = $null; $capParts = New-Object System.Collections.ArrayList
  foreach ($tk in $toks) {
    $n=0; $bare=$tk
    if ($tk -match '^(.*?)<(\d+)>$') { $bare=$Matches[1]; $n=[int]$Matches[2] }
    # 스트림에서 다음 말단어까지 진행 (중간의 기존 무음은 그대로 흡수)
    while ($si -lt $stream.Count -and $stream[$si].w.type -eq 1) {
      $w=$stream[$si].w
      [void]$wordJsons.Add(('{"id":"'+$w.id+'","text":"","playbackRate":1,"duration":'+$w.duration+',"aligned":false,"type":1,"originalDuration":'+$w.originalDuration+',"originalStartTime":'+$w.originalStartTime+',"truncatedWords":[],"assetIds":["'+$w.assetIds[0]+'"]}'))
      $si++
    }
    if ($si -ge $stream.Count) { throw 'FAIL: stream exhausted' }
    $e = $stream[$si]; $w = $e.w
    # (A) 경고는 구두점 무시하고 글자만 비교 (붙여넣기 쉼표 vs 대본 !? 로 인한 노이즈 방지)
    $cmpA = $bare -replace "[',.!?]",''; $cmpB = $w.text -replace "[',.!?]",''
    if ($cmpA -ne $cmpB) { Write-Host ("[!] '{0}' vs '{1}'" -f $bare, $w.text) -ForegroundColor Yellow; $warn++ }
    if (-not $imgA) { $imgA = $e.img }
    if (-not $bgmA) { $bgmA = $e.bgm }
    # (B) 자막 텍스트는 대본($bare) 기준으로 복원
    [void]$capParts.Add($bare)
    # (C) 단어 json 텍스트도 대본($bare) 기준 (타이밍·assetId는 .vrew 유지)
    [void]$wordJsons.Add(('{"id":"'+$w.id+'","text":"'+(Esc $bare)+'","playbackRate":1,"duration":'+$w.duration+',"aligned":false,"type":0,"originalDuration":'+$w.originalDuration+',"originalStartTime":'+$w.originalStartTime+',"truncatedWords":[],"assetIds":["'+$w.assetIds[0]+'"]}'))
    $si++
    # 뒤따르는 기존 무음 흡수 후 부족분 채우기
    $have=0
    while ($si -lt $stream.Count -and $stream[$si].w.type -eq 1) {
      $pw=$stream[$si].w; $have++
      [void]$wordJsons.Add(('{"id":"'+$pw.id+'","text":"","playbackRate":1,"duration":'+$pw.duration+',"aligned":false,"type":1,"originalDuration":'+$pw.originalDuration+',"originalStartTime":'+$pw.originalStartTime+',"truncatedWords":[],"assetIds":["'+$pw.assetIds[0]+'"]}'))
      $si++
    }
    for ($k=$have; $k -lt $n; $k++) {
      $wid=New-Id; $aid=[guid]::NewGuid().ToString(); $tid=New-Id
      [void]$wordJsons.Add(('{"id":"'+$wid+'","text":"","playbackRate":1,"duration":'+$best.dur+',"aligned":false,"type":1,"originalDuration":'+$best.dur+',"originalStartTime":'+$best.sin+',"truncatedWords":[],"assetIds":["'+$aid+'"]}'))
      $newAssets += '"'+$aid+'":{"trackIds":["'+$tid+'"],"role":"main"},'
      $newTracks += '"'+$tid+'":{"trackId":"'+$tid+'","mediaId":"'+$best.media+'","volume":1,"sourceIn":'+$best.sin+',"sourceOut":'+$best.sout+',"loop":false,"playbackRate":1,"type":"ttsClip"},'
    }
  }
  [void]$wordJsons.Add(('{"id":"'+(New-Id)+'","text":"","playbackRate":1,"duration":0,"aligned":false,"type":2,"originalDuration":0,"originalStartTime":0,"truncatedWords":[],"assetIds":[]}'))
  $capText = Esc (($capParts -join ' '))
  $aids = @(); if ($imgA) { $aids += ('"'+$imgA+'"') }; if ($bgmA) { $aids += ('"'+$bgmA+'"') }
  $clip = '{"sceneId":"'+$sceneId+'","words":['+($wordJsons -join ',')+'],"captionMode":"MANUAL","captions":[{"text":[{"insert":"'+$capText+'\n"}]},{"text":[{"insert":"\n"}]}],"assetIds":['+($aids -join ',')+'],"dirty":{"blankDeleted":false,"caption":false,"video":false},"translationModified":{"result":false,"source":false},"id":"'+(New-Id)+'"}'
  [void]$clipJsons.Add($clip)
}
# 남은 꼬리 무음 흡수 확인
while ($si -lt $stream.Count -and $stream[$si].w.type -eq 1) { $si++ }
Write-Host ("[i] rebuilt clips: {0}" -f $clipJsons.Count)

# ---- clips 배열 교체 ----
$s1 = $raw.IndexOf('"clips":[')
$s2 = $raw.IndexOf('],"sceneNames"', $s1)
if ($s1 -lt 0 -or $s2 -lt 0) { throw 'FAIL: clips array not found' }
$out2 = $raw.Substring(0, $s1+9) + ($clipJsons -join ',') + $raw.Substring($s2)
if ($newAssets) { $x=$out2.IndexOf('"assets":{'); $out2 = $out2.Substring(0,$x+10) + $newAssets + $out2.Substring($x+10) }
if ($newTracks) { $x=$out2.IndexOf('"tracks":{'); $out2 = $out2.Substring(0,$x+10) + $newTracks + $out2.Substring($x+10) }

# ---- 자막 크기 110 ----
$rxFont = '("quillStyle":\{"font":"[^"]*","size":")(\d+)(")'
$mf = [regex]::Match($out2, $rxFont)
if ($mf.Success -and $mf.Groups[2].Value -ne '110') {
  $out2 = [regex]::Replace($out2, $rxFont, '${1}110${3}', 1)
  Write-Host ("[i] caption font: {0} -> 110" -f $mf.Groups[2].Value)
}

# ---- 무결성 + 재포장 ----
$blank = $out2 -replace '("integrity":")[0-9a-f]{64}"','$1"'
$sha=[System.Security.Cryptography.SHA256]::Create()
$hash = -join ($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($blank)) | ForEach-Object { $_.ToString('x2') })
$final = $blank -replace '("integrity":")"', ('${1}'+$hash+'"')
$chk = $final | ConvertFrom-Json
$pc=0; foreach($c in $chk.transcript.clips){foreach($w in $c.words){if($w.type -eq 1){$pc++}}}
Write-Host ("[i] verify: clips {0}, pauses {1}" -f $chk.transcript.clips.Count, $pc)

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
Write-Host ("[OK] done: {0}" -f $Out) -ForegroundColor Green
if ($warn -gt 0) { Write-Host ("[!] warnings: {0}" -f $warn) -ForegroundColor Yellow }
