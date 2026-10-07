@echo off
setlocal
cd /d "%~dp0..\..\.."
node qa\runs\qa0003-close-repair-20261005\observe-repaired-close.mjs
pause
