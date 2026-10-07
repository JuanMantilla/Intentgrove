@echo off
setlocal
cd /d "%~dp0..\..\.."
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64 >nul
if errorlevel 1 exit /b 1
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "CARGO_HOME=%CD%\.cache\cargo-f007w"
set "CARGO_NET_OFFLINE=true"
set "TEMP=%CD%\.cache\f007w-native-temp"
set "TMP=%TEMP%"
cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --target x86_64-pc-windows-msvc --lib session:: -- --test-threads=1 >qa\runs\qa0003-close-repair-20261005\evidence\native-session.txt 2>&1
echo SESSION=%ERRORLEVEL% >qa\runs\qa0003-close-repair-20261005\evidence\native-exits.txt
cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --target x86_64-pc-windows-msvc --lib recovery:: -- --test-threads=1 >qa\runs\qa0003-close-repair-20261005\evidence\native-recovery.txt 2>&1
echo RECOVERY=%ERRORLEVEL% >>qa\runs\qa0003-close-repair-20261005\evidence\native-exits.txt
cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --target x86_64-pc-windows-msvc --test windows_scoped -- --test-threads=1 >qa\runs\qa0003-close-repair-20261005\evidence\native-windows-scoped.txt 2>&1
echo SCOPED=%ERRORLEVEL% >>qa\runs\qa0003-close-repair-20261005\evidence\native-exits.txt
type qa\runs\qa0003-close-repair-20261005\evidence\native-exits.txt
