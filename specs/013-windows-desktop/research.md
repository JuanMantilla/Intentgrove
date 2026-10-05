# Windows port research — F007W

Date: 2026-10-05. OBSERVED code findings come from CodeGraph current-source exploration followed by narrow line searches. Windows mechanisms below are proposals, not execution evidence.

## Reuse the existing stack

Decision: retain Tauri/Rust/React and the selected interface. Add only a proposed target-specific windows-sys 0.61.2 direct binding dependency; it already occurs in the lockfile but is not yet a declared app dependency. Exact NT API binding availability must be confirmed before implementing the adapter; missing bindings require a reviewed narrow FFI declaration, not another incidental dependency.

Rationale: framework-native Windows hosting exists; current failures are in native mechanisms rather than the shared UI. Alternatives: a separate Electron app or backend rewrite would duplicate policy and increase scope without resolving security/data-preservation requirements.

Observed: `scope.rs:6–7,45–53,88–109,128–183,190–202` directly uses Unix descriptors, Darwin st_flags and local-mount flags. `document.rs:9–10,85`, `listing.rs:6` and `large_source.rs:10,87–90,290–295` use Unix reads/metadata. `editing.rs:411–456` performs descriptor-relative stage/rename/link publication. `recovery.rs:77–101,133–173`, `session.rs:268–327` and `recents.rs:134–170` assume Unix mode/ownership, flock and directory sync. The entire native crate needs target-specific implementations, not only scope.rs.

## Scoped Windows access

Decision: prototype retained root handles with directory-handle-relative NtCreateFile and OBJ_DONT_REPARSE. Validate each component, its attributes and the final handle before content access. Inspect metadata-only access and recall flags before requesting data. Own non-inheritable handles through RAII. Reject network/device/drive-relative paths, alternate streams and unknown locality. Initial filesystem is local NTFS only.

Rationale: Microsoft documents RootDirectory-relative names and reparse refusal. CreateFileW OPEN_REPARSE_POINT alone does not establish parent containment. Alternatives: canonicalize-then-open is susceptible to replacement; full-path opens plus held ancestors require a different verified sharing/race contract. Neither is accepted as a security proof without Windows experiments.

Sources: [NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile), [OBJECT_ATTRIBUTES](https://learn.microsoft.com/en-us/windows/win32/api/ntdef/ns-ntdef-_object_attributes), [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew), [handle attributes](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex).

Decision: reject all reparse points initially, including hydrated cloud-managed files that retain reparse tags. Screen enumeration attributes including RECALL_ON_OPEN before child access; handle-only checks after open cannot prove recall did not occur. Refuse unknown recall states. Avoid a promise that the application controls all OS/provider network traffic.

Sources: [attribute constants](https://learn.microsoft.com/en-us/windows/win32/fileio/file-attribute-constants), [cloud placeholder classification](https://learn.microsoft.com/en-us/windows/win32/api/cfapi/nf-cfapi-cfgetplaceholderstatefromattributetag). Exact pre-open/handle behavior is a Windows spike gate.

## Private storage and safe writes

Decision: preserve shared schemas, composition/conflict rules and recovery semantics; implement Windows handle locking, private current-user storage verification and staged publication separately. Use framework-resolved local app data. No Unix chmod/flock/directory-fsync emulation. Never promise equivalent power-loss durability without evidence.

Rationale: existing modes, locks and replacement calls are OS-specific. Windows sharing modes influence refresh and replacement, so document reader/writer handle ownership before choosing commit operations. ReplaceFileW is a candidate requiring investigation; it is not a version-conditional compare-and-swap. Alternatives: deleting the destination before renaming or direct in-place truncation risk user data and are rejected.

## Desktop and images

Observed: `App.tsx:2406` rejects keyboard events without metaKey; EN/ES catalog uses “this Mac” / “este Mac” for storage. `lib.rs:38–40,285–287` scopes native menu-state commands/menu installation to macOS. `image.rs:18–24,59–107` calls XPC externs directly while `build.rs:37–65` links the implementation only on macOS. `lib.rs:320–333` already has shared drop and close handling; retain it and verify final-window exit on Windows.

Decision: reuse frontend layout and bridge shapes; implement Windows modifier/lifecycle differences at composition boundaries. Images explicitly unavailable until a separate isolated-worker design is reviewed. Alternatives: decode directly in the UI/main process or render original bytes in the webview would weaken the existing approved isolation boundary.

## Packaging and target matrix

Decision: Windows 11 x64 / MSVC first; proposed NSIS currentUser package through a Windows platform override. No associations, signing or publication. Runtime prerequisite initially WebView2 already present; embedded offline installation can be proposed separately if needed. Do not silently accept the bundler's network bootstrapper.

Rationale: Tauri documents Windows platform config merging and per-user NSIS mode without administrator installation. “both” requires administrator access even for its per-user choice. Windows 10/ARM64 are outside the initial evidence matrix.

Sources: [Tauri platform configuration](https://v2.tauri.app/reference/config/#platform-specific-configuration), [NSIS installation mode](https://v2.tauri.app/reference/config/#nsisinstallermode), [Windows installer and WebView2 choices](https://v2.tauri.app/distribute/windows-installer/), [build prerequisites](https://v2.tauri.app/start/prerequisites/).

## Tooling outcome

Spec Kit CLI entrypoint is broken: its shebang points to a missing uv interpreter. No installation/repair attempted. Installed Spec Kit 1.0.11 repository shell scripts successfully created feature 013 and resolved/copied templates. No extension hook configuration exists. Git remains main; feature state is `specs/013-windows-desktop`. Native Windows execution is unavailable in this session.
