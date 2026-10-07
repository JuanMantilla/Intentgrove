@echo off
setlocal
cd /d "%~dp0..\..\.."
echo Launching the isolated QA-0003 diagnostic candidate. No installation.
echo Try Alt+F4, then title-bar Close if it stays open. Reply with what happened.
start "" /wait "artifacts\windows\2026-10-05T23-16-13-666Z-69dbf0b3\Intentgrove.exe" 1>"qa\runs\qa0003-close-repair-20261005\evidence\diagnostic-host-stdout.txt" 2>"qa\runs\qa0003-close-repair-20261005\evidence\diagnostic-host-stderr.txt"
echo EXIT=%ERRORLEVEL% >"qa\runs\qa0003-close-repair-20261005\evidence\diagnostic-host-exit.txt"
echo Candidate exited. Logs retained.
pause
