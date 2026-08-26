param(
  [Parameter(Mandatory=$true)][string]$Vrew,
  [Parameter(Mandatory=$true)][string]$Script,
  [Parameter(Mandatory=$true)][string]$Out,
  [int]$CaptionSize = 110
)
# inject-pause v3 (2026-08-23)
# Rebuilds a Vrew project so that one script line = one clip, restores the
# caption text from the script, and inserts <n> silence words.
#
# v3 fixes a silent failure seen with v2 on Windows PowerShell 5.1:
# only a fraction of the requested pauses were actually written
# (9.eu: 104 requested -> 59 written) and nothing reported it.
# Changes vs v2:
#   1. marker parsing is done ONCE up front with an explicit Regex object
#      (no reliance on the automatic $Matches variable inside the loop)
#   2. the per-word "already there" counter is an explicitly typed local
#      that is reset for every word
#   3. every number is written with InvariantCulture (a comma decimal
#      separator would silently produce broken json)
#   4. the result is re-parsed and the pause count is compared with the
#      expected count - a mismatch throws instead of shipping a bad file
#
# v3.1 (2026-08-25): image is now chosen per SCRIPT BLOCK (blank-line separated),
# not per line. The old rule ("image of the clip the line's first word came
# from") made the picture flip in the middle of a scene whenever Vrew's own
# clip split did not line up with the script. Now every line of one block
# shows the same image - the one most of that block's words came from.
# ASCII only on purpose: a .ps1 without a BOM is read with the system ANSI
# codepage by Windows PowerShell 5.1, so non-ascii text here is unsafe.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$INV = [System.Globalization.CultureInfo]::InvariantCulture
function New-Id { $c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; -join (1..10 | ForEach-Object { $c[(Get-Random -Maximum $c.Length)] }) }
function Esc([string]$s) { $s.Replace('\','\\').Replace('"','\"') }
function Num($v) { if ($null -eq $v) { return '0' }; return ([double]$v).ToString($INV) }

# ---------------------------------------------------------------- unpack
$tmp = Join-Path $env:TEMP ('vrewinj_' + [guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($tmp)
[System.IO.File]::Copy($Vrew, (Join-Path $tmp 'in.zip'), $true)
$ex = Join-Path $tmp 'ex'
[System.IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $tmp 'in.zip'), $ex)
$raw = [System.IO.File]::ReadAllText((Join-Path $ex 'project.json'), [System.Text.Encoding]::UTF8)
$j = $raw | ConvertFrom-Json

# ------------------------------------------------- read + parse the script
$allLines = @([System.IO.File]::ReadAllLines($Script, [System.Text.Encoding]::UTF8))
$lines = New-Object System.Collections.ArrayList
$blockOf = New-Object System.Collections.ArrayList
[int]$blk = 0
[bool]$prevBlank = $true
foreach ($ln in $allLines) {
  if ($ln.Trim() -eq '') { $prevBlank = $true; continue }
  if ($prevBlank) { $blk++ ; $prevBlank = $false }
  [void]$lines.Add($ln)
  [void]$blockOf.Add($blk)
}

$rx = New-Object System.Text.RegularExpressions.Regex('^(.*?)<([0-9]+)>$')
$plan = New-Object System.Collections.ArrayList   # one entry per line
$tokTotal = 0
$wantTotal = 0
foreach ($line in $lines) {
  $bares = New-Object System.Collections.ArrayList
  $wants = New-Object System.Collections.ArrayList
  foreach ($t in @(($line -split '\s+') | Where-Object { $_ -ne '' })) {
    $mm = $rx.Match($t)
    if ($mm.Success) {
      [void]$bares.Add($mm.Groups[1].Value)
      [void]$wants.Add([int]$mm.Groups[2].Value)
      $wantTotal += [int]$mm.Groups[2].Value
    } else {
      [void]$bares.Add($t)
      [void]$wants.Add(0)
    }
    $tokTotal++
  }
  [void]$plan.Add(@{ bares=$bares; wants=$wants })
}
Write-Host ("[i] script lines {0} in {1} blocks, markers request {2} pauses, vrew clips {3}" -f $lines.Count, $blk, $wantTotal, $j.transcript.clips.Count)

# ------------------------------------------------------ flatten the words
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
Write-Host ("[i] words in file {0}, tokens in script {1}" -f $spokenTotal, $tokTotal)
if ($spokenTotal -ne $tokTotal) { throw ("FAIL: word count mismatch {0} vs {1} - script does not match this vrew" -f $spokenTotal, $tokTotal) }

# -------------------------------------------------------- silence sample
$best = $null
foreach ($e in $stream) {
  $w = $e.w
  if ($w.type -ne 1) { continue }
  if ($null -eq $w.assetIds -or @($w.assetIds).Count -eq 0) { continue }
  $as = $j.props.assets.($w.assetIds[0]); if (-not $as) { continue }
  $tr = $j.props.tracks.($as.trackIds[0]); if (-not $tr) { continue }
  if ($null -eq $best -or [math]::Abs([double]$w.duration - 0.98) -lt [math]::Abs($best.dur - 0.98)) {
    $best = @{ media=$tr.mediaId; sin=$tr.sourceIn; sout=$tr.sourceOut; dur=[double]$w.duration }
  }
}
if (-not $best) { throw 'FAIL: silence source not found' }
Write-Host ("[i] silence src: {0} {1}~{2} ({3}s)" -f $best.media, (Num $best.sin), (Num $best.sout), (Num $best.dur))

function PauseJson($id, $dur, $odur, $ostart, $assetId) {
  return ('{"id":"' + $id + '","text":"","playbackRate":1,"duration":' + (Num $dur) +
          ',"aligned":false,"type":1,"originalDuration":' + (Num $odur) +
          ',"originalStartTime":' + (Num $ostart) + ',"truncatedWords":[],"assetIds":["' + $assetId + '"]}')
}

# ------------------------------------------------------------- rebuild
$sceneId = $j.transcript.clips[0].sceneId
$newAssets = ''; $newTracks = ''
$clipData = New-Object System.Collections.ArrayList
[int]$si = 0
[int]$warn = 0
[int]$inserted = 0
[int]$expected = 0
$report = New-Object System.Collections.ArrayList

for ($li = 0; $li -lt $plan.Count; $li++) {
  $bares = $plan[$li].bares
  $wants = $plan[$li].wants
  $wordJsons = New-Object System.Collections.ArrayList
  $capParts  = New-Object System.Collections.ArrayList
  $imgSeq = New-Object System.Collections.ArrayList
  $bgmA = $null
  [int]$linePause = 0

  for ($ti = 0; $ti -lt $bares.Count; $ti++) {
    [string]$bare = $bares[$ti]
    [int]$want = $wants[$ti]

    # any pause sitting in front of the next spoken word: keep it as is
    while ($si -lt $stream.Count -and $stream[$si].w.type -eq 1) {
      $pw = $stream[$si].w
      [void]$wordJsons.Add((PauseJson $pw.id $pw.duration $pw.originalDuration $pw.originalStartTime $pw.assetIds[0]))
      $linePause++
      $si++
    }
    if ($si -ge $stream.Count) { throw ('FAIL: stream exhausted at line {0} token {1}' -f ($li+1), ($ti+1)) }

    $e = $stream[$si]; $w = $e.w
    $cmpA = $bare -replace "[',.!?]", ''
    $cmpB = $w.text -replace "[',.!?]", ''
    if ($cmpA -ne $cmpB) { Write-Host ("[!] line {0}: '{1}' vs '{2}'" -f ($li+1), $bare, $w.text) -ForegroundColor Yellow; $warn++ }
    if ($e.img) { [void]$imgSeq.Add($e.img) }
    if (-not $bgmA) { $bgmA = $e.bgm }
    [void]$capParts.Add($bare)
    [void]$wordJsons.Add(('{"id":"' + $w.id + '","text":"' + (Esc $bare) + '","playbackRate":1,"duration":' + (Num $w.duration) +
                          ',"aligned":false,"type":0,"originalDuration":' + (Num $w.originalDuration) +
                          ',"originalStartTime":' + (Num $w.originalStartTime) + ',"truncatedWords":[],"assetIds":["' + $w.assetIds[0] + '"]}'))
    $si++

    # pauses that already follow this word
    [int]$have = 0
    while ($si -lt $stream.Count -and $stream[$si].w.type -eq 1) {
      $pw = $stream[$si].w
      [void]$wordJsons.Add((PauseJson $pw.id $pw.duration $pw.originalDuration $pw.originalStartTime $pw.assetIds[0]))
      $have++
      $linePause++
      $si++
    }
    # top up to what the marker asked for
    while ($have -lt $want) {
      $wid = New-Id; $aid = [guid]::NewGuid().ToString(); $tid = New-Id
      [void]$wordJsons.Add((PauseJson $wid $best.dur $best.dur $best.sin $aid))
      $newAssets += '"' + $aid + '":{"trackIds":["' + $tid + '"],"role":"main"},'
      $newTracks += '"' + $tid + '":{"trackId":"' + $tid + '","mediaId":"' + $best.media + '","volume":1,"sourceIn":' + (Num $best.sin) + ',"sourceOut":' + (Num $best.sout) + ',"loop":false,"playbackRate":1,"type":"ttsClip"},'
      $have++
      $linePause++
      $inserted++
    }
    if ($want -gt $have) { $expected += $want } else { $expected += $have }
  }

  [void]$wordJsons.Add(('{"id":"' + (New-Id) + '","text":"","playbackRate":1,"duration":0,"aligned":false,"type":2,"originalDuration":0,"originalStartTime":0,"truncatedWords":[],"assetIds":[]}'))
  [void]$clipData.Add(@{ words=($wordJsons -join ','); cap=(Esc (($capParts -join ' '))); bgm=$bgmA; imgs=$imgSeq; block=$blockOf[$li] })
  [void]$report.Add(('    line {0,2}: pauses {1}' -f ($li+1), $linePause))
}

# ---- one image per script block: the one most of the block's words came from
$blockSeq = @{}
foreach ($cd in $clipData) {
  $b = [string]$cd.block
  if (-not $blockSeq.ContainsKey($b)) { $blockSeq[$b] = New-Object System.Collections.ArrayList }
  foreach ($id in $cd.imgs) { [void]$blockSeq[$b].Add($id) }
}
$blockImg = @{}
foreach ($b in @($blockSeq.Keys)) {
  $seq = $blockSeq[$b]
  $bestId = $null; [int]$bestN = -1
  $doneIds = New-Object System.Collections.ArrayList
  foreach ($id in $seq) {
    if ($doneIds.Contains($id)) { continue }
    [void]$doneIds.Add($id)
    [int]$n = 0
    foreach ($x in $seq) { if ($x -eq $id) { $n++ } }
    if ($n -gt $bestN) { $bestN = $n; $bestId = $id }
  }
  $blockImg[$b] = $bestId
}
$usedImgs = New-Object System.Collections.ArrayList
$clipJsons = New-Object System.Collections.ArrayList
foreach ($cd in $clipData) {
  $imgA = $blockImg[[string]$cd.block]
  if ($imgA -and -not $usedImgs.Contains($imgA)) { [void]$usedImgs.Add($imgA) }
  $aids = @(); if ($imgA) { $aids += ('"' + $imgA + '"') }; if ($cd.bgm) { $aids += ('"' + $cd.bgm + '"') }
  [void]$clipJsons.Add('{"sceneId":"' + $sceneId + '","words":[' + $cd.words + '],"captionMode":"MANUAL","captions":[{"text":[{"insert":"' + $cd.cap + '\n"}]},{"text":[{"insert":"\n"}]}],"assetIds":[' + ($aids -join ',') + '],"dirty":{"blankDeleted":false,"caption":false,"video":false},"translationModified":{"result":false,"source":false},"id":"' + (New-Id) + '"}')
}

# any silence left over after the last word
while ($si -lt $stream.Count -and $stream[$si].w.type -eq 1) { $si++ }
Write-Host ("[i] rebuilt clips: {0}, pauses inserted: {1}, images used: {2}" -f $clipJsons.Count, $inserted, $usedImgs.Count)

# ------------------------------------------------------------ splice json
$s1 = $raw.IndexOf('"clips":[')
$s2 = $raw.IndexOf('],"sceneNames"', $s1)
if ($s1 -lt 0 -or $s2 -lt 0) { throw 'FAIL: clips array not found' }
$out2 = $raw.Substring(0, $s1 + 9) + ($clipJsons -join ',') + $raw.Substring($s2)
if ($newAssets) { $x = $out2.IndexOf('"assets":{'); $out2 = $out2.Substring(0, $x + 10) + $newAssets + $out2.Substring($x + 10) }
if ($newTracks) { $x = $out2.IndexOf('"tracks":{'); $out2 = $out2.Substring(0, $x + 10) + $newTracks + $out2.Substring($x + 10) }

# ---------------------------------------------------------- caption size
$rxFont = '("quillStyle":\{"font":"[^"]*","size":")(\d+)(")'
$mf = [regex]::Match($out2, $rxFont)
if ($mf.Success -and $mf.Groups[2].Value -ne ([string]$CaptionSize)) {
  $out2 = [regex]::Replace($out2, $rxFont, ('${1}' + $CaptionSize + '${3}'), 1)
  Write-Host ("[i] caption font: {0} -> {1}" -f $mf.Groups[2].Value, $CaptionSize)
}

# ------------------------------------------------------------- integrity
$blank = $out2 -replace '("integrity":")[0-9a-f]{64}"', '$1"'
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = -join ($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($blank)) | ForEach-Object { $_.ToString('x2') })
$final = $blank -replace '("integrity":")"', ('${1}' + $hash + '"')

# ----------------------------------------------------------- self check
$chk = $final | ConvertFrom-Json
[int]$pc = 0
foreach ($c in $chk.transcript.clips) { foreach ($w in $c.words) { if ($w.type -eq 1) { $pc++ } } }
Write-Host ("[i] verify: clips {0}, pauses {1} (expected {2})" -f $chk.transcript.clips.Count, $pc, $expected)
if ($chk.transcript.clips.Count -ne $lines.Count) {
  throw ('FAIL: clip count {0} but script has {1} lines' -f $chk.transcript.clips.Count, $lines.Count)
}
if ($pc -ne $expected) {
  foreach ($r in $report) { Write-Host $r -ForegroundColor DarkGray }
  throw ('FAIL: pause count {0} but {1} expected - nothing was written' -f $pc, $expected)
}

# ------------------------------------------------------------- repack
if ([System.IO.File]::Exists($Out)) { [System.IO.File]::Delete($Out) }
$bz = Join-Path $tmp 'out.zip'
$fs = [System.IO.File]::Open($bz, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
$e1 = $zip.CreateEntry('project.json', [System.IO.Compression.CompressionLevel]::Optimal)
$w1 = New-Object System.IO.StreamWriter($e1.Open(), (New-Object System.Text.UTF8Encoding($false)))
$w1.Write($final); $w1.Flush(); $w1.Dispose()
foreach ($f in Get-ChildItem (Join-Path $ex 'media') | Sort-Object Name) {
  $e2 = $zip.CreateEntry(('media/' + $f.Name), [System.IO.Compression.CompressionLevel]::Optimal)
  $s3 = $e2.Open(); $bb = [System.IO.File]::ReadAllBytes($f.FullName); $s3.Write($bb, 0, $bb.Length); $s3.Flush(); $s3.Dispose()
}
$zip.Dispose(); $fs.Dispose()
[System.IO.File]::Copy($bz, $Out, $true)
[System.IO.Directory]::Delete($tmp, $true)
Write-Host ("[OK] done: {0}" -f $Out) -ForegroundColor Green
if ($warn -gt 0) { Write-Host ("[!] warnings: {0}" -f $warn) -ForegroundColor Yellow }
