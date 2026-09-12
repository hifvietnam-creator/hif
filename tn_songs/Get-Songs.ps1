<#
    tn_songs/Get-Songs.ps1

    Downloads the week's worship videos as mp4 into the Thai Nguyen SONGS
    folder for that Sunday.

        THAI NGUYEN FELLOWSHIP\2026\SONGS\September 13\

    Input is a plain text file - paste Elga's message into it, one song per
    line, title and link separated by a comma, a tab, or a pipe:

        Holy Forever | https://www.youtube.com/watch?v=xxxxxxxxxxx
        Goodness of God, https://youtu.be/yyyyyyyyyyy

    A line with only a URL is accepted too; the video's own title is used.
    Blank lines and lines starting with # are ignored.

    Files are named after the SONG, not YouTube's title, so the folder reads
    as a set list rather than a pile of downloads.

    Usage (from the project root):
        powershell -ExecutionPolicy Bypass -File .\tn_songs\Get-Songs.ps1 -Songs .\songs.txt
        powershell -ExecutionPolicy Bypass -File .\tn_songs\Get-Songs.ps1 -Songs .\songs.txt -Date 2026-09-13
        powershell -ExecutionPolicy Bypass -File .\tn_songs\Get-Songs.ps1 -Songs .\songs.txt -WhatIf
#>

param(
    [Parameter(Mandatory = $true)][string]$Songs,
    [string]$Date,
    [string]$Root = "C:\Users\serve\OneDrive\MEDIA SHARE\THAI NGUYEN FELLOWSHIP",
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

# -- The coming Sunday, in local time -----------------------------------------
# Built from local date parts. Converting to UTC first would roll a Saturday
# evening back a day here (UTC+7) and file the songs under the wrong Sunday.
function Get-UpcomingSunday {
    $today = (Get-Date).Date
    $delta = (7 - [int]$today.DayOfWeek) % 7
    return $today.AddDays($delta)
}

if ($Date) {
    $sunday = [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null)
} else {
    $sunday = Get-UpcomingSunday
}

# "September 13" - zero-padded, matching the majority of existing folders.
$folderName = '{0} {1:d2}' -f $sunday.ToString('MMMM'), $sunday.Day
$dest = Join-Path (Join-Path (Join-Path $Root $sunday.Year) 'SONGS') $folderName

Write-Host ""
Write-Host "Sunday : $($sunday.ToString('dddd, dd MMMM yyyy'))"
Write-Host "Folder : $dest"
Write-Host ""

# -- yt-dlp -------------------------------------------------------------------
$ytdlp = Get-Command yt-dlp -ErrorAction SilentlyContinue
if (-not $ytdlp) {
    throw "yt-dlp is not installed. Run:  winget install yt-dlp.yt-dlp ; winget install yt-dlp.FFmpeg"
}

# -- Parse the song list ------------------------------------------------------
if (-not (Test-Path $Songs)) { throw "Song list not found: $Songs" }

$entries = @()
foreach ($line in Get-Content $Songs) {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith('#')) { continue }

    $url = $null; $title = $null
    if ($t -match '^(.*?)[\|,\t]\s*(https?://\S+)\s*$') {
        $title = $Matches[1].Trim()
        $url   = $Matches[2].Trim()
    } elseif ($t -match '^(https?://\S+)$') {
        $url = $Matches[1].Trim()
    } else {
        Write-Host "  ignored (no link): $t" -ForegroundColor Yellow
        continue
    }
    $entries += [pscustomobject]@{ Title = $title; Url = $url }
}

if (-not $entries) { throw "No song links found in $Songs" }
Write-Host "$($entries.Count) song(s) to fetch."
Write-Host ""

if ($WhatIf) {
    foreach ($e in $entries) {
        $shown = if ($e.Title) { $e.Title } else { '(youtube title)' }
        Write-Host ("  would fetch  {0,-34} {1}" -f $shown, $e.Url)
    }
    Write-Host "`nNothing downloaded (-WhatIf)."
    return
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$ok = 0; $skipped = 0; $failed = @()

foreach ($e in $entries) {
    # Windows forbids these in a filename.
    $safe = if ($e.Title) { ($e.Title -replace '[<>:"/\\|?*]', '_').Trim() } else { $null }

    if ($safe) {
        $existing = Get-ChildItem -Path $dest -Filter "$safe.*" -File -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "  have    $safe$($existing[0].Extension)"
            $skipped++
            continue
        }
    }

    $outTemplate = if ($safe) { Join-Path $dest "$safe.%(ext)s" } else { Join-Path $dest "%(title)s.%(ext)s" }

    $label = if ($safe) { $safe } else { $e.Url }
    Write-Host "  fetch   $label"

    # bv*+ba/b  = best video + best audio, merged; falls back to a pre-merged
    # stream if ffmpeg is missing. --merge-output-format mp4 is what makes the
    # result a single mp4 rather than an mkv.
    & yt-dlp `
        --no-playlist `
        --no-warnings `
        --quiet --progress `
        -f "bv*+ba/b" `
        --merge-output-format mp4 `
        -o $outTemplate `
        $e.Url

    if ($LASTEXITCODE -eq 0) {
        $ok++
    } else {
        $failed += $e
        Write-Host "  FAILED  $($e.Url)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "downloaded  $ok"
if ($skipped) { Write-Host "already had $skipped" }
if ($failed)  {
    Write-Host "failed      $($failed.Count)" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "   $($_.Url)" }
}
Write-Host ""
Write-Host "Folder: $dest"
Get-ChildItem $dest -File | Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1MB,1)}} | Format-Table -AutoSize
