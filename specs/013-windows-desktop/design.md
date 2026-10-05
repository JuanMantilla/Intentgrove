# Windows experience delta — F007W

Status: proposed; reuse the existing application interface and selected visual direction. No new layout or artwork.

| Area | Windows behavior | Acceptance |
| --- | --- | --- |
| Commands | Ctrl+O, Ctrl+Shift+O, Ctrl+F, Ctrl+W, Ctrl+S using the existing corresponding actions; show Ctrl hints | No shortcut fires while incompatible modal/editor state owns it; Mac Cmd behavior retained |
| Window | Framework native Windows controls; Alt+F4 follows the existing guarded close flow | Cancel retains window/buffer; confirmed final close exits |
| Labels | EN/ES use “this device” / “este dispositivo” where Mac-specific storage text appears | No Mac claim in Windows storage/recovery dialogs |
| Read-only milestone | Editing controls and Save shortcuts unavailable with clear explanatory text | No silent success; reading remains available |
| Images | Visible image-unavailable explanation until isolated decoding is implemented | No unsafe raw-image fallback |
| Native entry | File/folder dialogs and drop feed existing pending-selection confirmation | Scope cannot expand without user selection |
| Scaling | Retain responsive layouts and focus indication at 100/150/200% | Core actions visible at 640×480 logical minimum |

No Explorer association registration, tray behavior, global shortcuts or redesign. Future approved cross-feature visual integrations continue in their own canonical work; this port does not claim to implement them.
