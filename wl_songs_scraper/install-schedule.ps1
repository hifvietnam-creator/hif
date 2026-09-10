# =============================================================================
#  Register the three scheduled tasks for the worship song downloader.
#
#  Run ONCE, from an elevated PowerShell (Run as Administrator):
#      powershell -ExecutionPolicy Bypass -File .\wl_songs_scraper\install-schedule.ps1
#
#  Creates:
#      WL Songs - Friday      Fri 15:00
#      WL Songs - Saturday AM Sat 10:00
#      WL Songs - Saturday PM Sat 14:00
#
#  The Saturday tasks are not conditional in the scheduler — they always fire,
#  and the script itself exits immediately when Friday already finished. Putting
#  the decision in the script rather than the schedule means it can be checked
#  by running the command by hand, and there is no scheduler state to get out of
#  step with what is actually on disk.
#
#  To remove them:  .\install-schedule.ps1 -Uninstall
# =============================================================================

param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner    = Join-Path $scriptDir 'run-weekly.cmd'

$tasks = @(
  @{ Name = 'WL Songs - Friday';       Day = 'Friday';   Time = '15:00' },
  @{ Name = 'WL Songs - Saturday AM';  Day = 'Saturday'; Time = '10:00' },
  @{ Name = 'WL Songs - Saturday PM';  Day = 'Saturday'; Time = '14:00' }
)

if ($Uninstall) {
  foreach ($t in $tasks) {
    if (Get-ScheduledTask -TaskName $t.Name -ErrorAction SilentlyContinue) {
      Unregister-ScheduledTask -TaskName $t.Name -Confirm:$false
      Write-Host "removed  $($t.Name)"
    }
  }
  return
}

if (-not (Test-Path $runner)) { throw "Cannot find $runner" }

foreach ($t in $tasks) {
  if (Get-ScheduledTask -TaskName $t.Name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $t.Name -Confirm:$false
  }

  $action  = New-ScheduledTaskAction -Execute $runner
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $t.Day -At $t.Time

  # RunOnlyIfNetworkAvailable: no point waking up with no route to PCO.
  # StartWhenAvailable: if the machine was asleep at 15:00, run on wake.
  $settings = New-ScheduledTaskSettingsSet `
      -RunOnlyIfNetworkAvailable `
      -StartWhenAvailable `
      -DontStopIfGoingOnBatteries `
      -AllowStartIfOnBatteries `
      -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

  Register-ScheduledTask -TaskName $t.Name -Action $action -Trigger $trigger `
      -Settings $settings -Description 'Downloads the coming Sunday''s song charts from Planning Center into the worship leader''s folder.' | Out-Null

  Write-Host "created  $($t.Name)  -  $($t.Day) $($t.Time)"
}

Write-Host ''
Write-Host 'Done. Check them with:  Get-ScheduledTask -TaskName "WL Songs*"'
Write-Host 'Test one now with:      Start-ScheduledTask -TaskName "WL Songs - Friday"'
Write-Host 'Logs:                   wl_songs_scraper\logs\'
