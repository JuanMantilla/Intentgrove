# Windows build

Run from an ordinary PowerShell terminal in the repository:

```powershell
.\build-windows.cmd --preflight
.\build-windows.cmd --no-bundle
```

The second command produces an unsigned x64 **release executable** in a new
`artifacts/windows/<build>/` folder. Open `Intentgrove.exe` there to run it.
The folder also contains `README.txt`, `SHA256SUMS.txt`, `build-info.json` and
per-command logs. Executable-only builds use a disposable application identifier,
keeping their application data separate from the regular application.
Windows editing, Save and Save As remain disabled in the current source.

To create the installer after completing the existing F007W desktop gate:

```powershell
.\build-windows.cmd
```

This produces both `Intentgrove.exe` and `Intentgrove_<version>_x64-setup.exe`
in the reported folder. The setup file is the file to open **when application
installation is separately authorized**. The builder never runs it. Construction
does not verify installation, upgrade, uninstall or release readiness.

The default command currently refuses installer construction because
[T012 and T024](../specs/013-windows-desktop/tasks.md) are incomplete. Finish and
record the actual Windows desktop checks in the existing feature evidence:
WebView2 origin/CSP/navigation, Ctrl shortcuts, dialogs/drop/cancel, links,
Find/search, refresh, session/recents, Alt+F4/window close, cancellation and
process/worker termination at 100%, 150% and 200% scaling. Only mark these tasks
complete when their evidence passes; there is no build-script override.
Editing has additional native acceptance gates and does not become enabled by
constructing a read-only installer. Current Mac verification remains separate;
Linux is unsupported.

Prerequisites are existing Node.js/npm, Rust **1.88.0** with the
`x86_64-pc-windows-msvc` target, Visual Studio C++ x64 Build Tools, and a Windows
SDK. Preflight discovers installed tooling and prints precise missing components;
it does not install them. Missing Rust can be obtained from [rustup](https://rustup.rs/)
and C++/SDK components from [Visual Studio](https://visualstudio.microsoft.com/downloads/).

The builder uses `npm.cmd`, never changes PowerShell execution policy, and reuses
valid installed dependencies. Missing/incomplete dependencies are restored with
`npm.cmd ci --no-audit --no-fund`; `--restore` forces that locked restoration.
It runs frontend tests, production build, worker-bundle verification and locked
all-target Cargo check. Installer builds also run the full and serial Windows
native suites. Use `--verify-native` to run those suites with `--no-bundle`.
Every failure stops delivery with a nonzero exit and retained logs.

The locked Tauri CLI downloads missing official NSIS build tools into the
project target cache (`useLocalToolsDir`); installer construction may therefore
need network access. It uses unsigned **currentUser NSIS**, no associations and
`webviewInstallMode: skip`, without an updater or acceptance harness.
See [Tauri's Windows installer documentation](https://v2.tauri.app/distribute/windows-installer/).

Runtime requirements: Windows 11 x64, local NTFS documents and a usable installed
Microsoft Edge WebView2 runtime. Neither the builder nor the app/installer
downloads WebView2. A host without it must obtain the runtime separately from
[Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/).
The builder inspects PE imports and refuses unknown companion DLLs instead of
claiming a single executable is portable. Frontend and browser-worker assets are
embedded; Windows system/UCRT DLLs must not be copied into the output folder.

Builder regression checks (no app installation):

```powershell
node.exe --test scripts/windows-builder-checks.mjs
```
