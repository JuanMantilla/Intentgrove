@echo off
setlocal
where.exe node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js is missing from PATH. Install the project's Node.js prerequisite first.
  exit /b 1
)
node.exe "%~dp0scripts\build-windows.mjs" %*
exit /b %ERRORLEVEL%
