@echo off
REM ============================================================================
REM  wl_songs_scraper - weekly worship song download
REM
REM  Run by Windows Task Scheduler three times a week:
REM      Friday   15:00   first attempt
REM      Saturday 10:00   retry, only if Friday found songs still missing files
REM      Saturday 14:00   last retry, same condition
REM
REM  The --skip-if-complete flag makes the Saturday runs a no-op when Friday
REM  already got everything, so there is no cost to having them.
REM
REM  Exit codes: 0 = done or nothing to do, 3 = still incomplete, 1 = error.
REM  A log is appended to wl_songs_scraper\logs\YYYY-MM.log
REM ============================================================================

setlocal

REM Project root = the folder above this script.
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."

REM Log file per month, so it stays readable and never needs rotating.
set "LOGDIR=%SCRIPT_DIR%logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
for /f "tokens=1-2 delims=-" %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM"') do set "STAMP=%%a-%%b"
set "LOG=%LOGDIR%\%STAMP%.log"

echo. >> "%LOG%"
echo ================================================== >> "%LOG%"
powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'" >> "%LOG%"

call npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/download.ts --sunday --skip-if-complete >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"

if "%RC%"=="0" echo RESULT: complete >> "%LOG%"
if "%RC%"=="3" echo RESULT: incomplete - some songs still have no files >> "%LOG%"
if "%RC%"=="1" echo RESULT: ERROR - see above >> "%LOG%"

popd
endlocal & exit /b %RC%
