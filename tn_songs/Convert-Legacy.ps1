<#
    tn_songs/Convert-Legacy.ps1

    One-off: save every legacy .ppt in the song library as .pptx, using the
    copy of PowerPoint already on this machine.

    Why this exists: 54 of the 99 files in the library are the pre-2007 binary
    .ppt format, and 25 distinct songs exist ONLY in that format. Nothing
    modern can read them - but PowerPoint can read its own old format, so no
    new software is needed.

    Safety:
      * Originals are never modified, moved or deleted.
      * A .pptx that already exists is skipped, so re-running is free.
      * PowerPoint is opened invisibly and closed again at the end.

    Usage (from the project root):
        powershell -ExecutionPolicy Bypass -File .\tn_songs\Convert-Legacy.ps1
        powershell -ExecutionPolicy Bypass -File .\tn_songs\Convert-Legacy.ps1 -WhatIf
#>

param(
    [string]$Root = "C:\Users\serve\OneDrive\MEDIA SHARE\THAI NGUYEN FELLOWSHIP\Thai Nguyen Worship Songs",
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Root)) { throw "Song library not found: $Root" }

$legacy = Get-ChildItem -Path $Root -Filter *.ppt -Recurse -File |
          Where-Object { $_.Extension -eq '.ppt' }   # -Filter *.ppt also matches .pptx

if (-not $legacy) { Write-Host "No .ppt files found - nothing to convert."; return }

Write-Host "Found $($legacy.Count) legacy .ppt file(s)."

# Decide what actually needs doing before opening PowerPoint at all.
$todo = @()
foreach ($f in $legacy) {
    $target = [IO.Path]::ChangeExtension($f.FullName, '.pptx')
    if (Test-Path $target) {
        Write-Host "  skip    $($f.Name)  (.pptx already exists)"
    } else {
        $todo += [pscustomobject]@{ Source = $f.FullName; Target = $target; Name = $f.Name }
    }
}

if (-not $todo) { Write-Host "`nEverything already converted."; return }
Write-Host "`n$($todo.Count) file(s) to convert.`n"

if ($WhatIf) {
    $todo | ForEach-Object { Write-Host "  would convert  $($_.Name)" }
    return
}

# ppSaveAsOpenXMLPresentation = 24
$ppSaveAsOpenXMLPresentation = 24
$msoFalse = 0

$ppt = New-Object -ComObject PowerPoint.Application
$converted = 0
$failed = @()

try {
    foreach ($item in $todo) {
        try {
            # ReadOnly and WithWindow:$false - the original is never written to
            # and nothing flashes up on screen.
            $pres = $ppt.Presentations.Open($item.Source, $true, $false, $msoFalse)
            $pres.SaveAs($item.Target, $ppSaveAsOpenXMLPresentation)
            $pres.Close()
            $converted++
            Write-Host "  ok      $($item.Name)"
        } catch {
            $failed += [pscustomobject]@{ Name = $item.Name; Error = $_.Exception.Message }
            Write-Host "  FAILED  $($item.Name)  -  $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} finally {
    try { $ppt.Quit() } catch { }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [GC]::Collect()
}

Write-Host ""
Write-Host "converted  $converted"
if ($failed) {
    Write-Host "failed     $($failed.Count)" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "   $($_.Name): $($_.Error)" }
}
Write-Host "`nOriginal .ppt files were not touched."
