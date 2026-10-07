@echo off
setlocal
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64 >nul
if errorlevel 1 exit /b 1
set "CARGO_HOME=%CD%\.cache\cargo-f007w"
set "CARGO_NET_OFFLINE=true"
set "TEMP=%CD%\.cache\f007w-native-temp"
set "TMP=%TEMP%"
cargo +1.88.0 check --manifest-path src-tauri/Cargo.toml --locked --all-targets --target x86_64-pc-windows-msvc
exit /b %ERRORLEVEL%
