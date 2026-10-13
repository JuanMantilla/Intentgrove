# Coverage — PARTIAL_CAPTURE

Generated from [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/manifest.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/manifest.json).

Discovered inventory: **133**. Captured with best-effort JPEG evidence: **81**; blocked: **28**; not attempted: **17**; not applicable: **7**.

Acquisition records: 94; accepted images: 80 (55 native, 25 browser preview); rejected records: 14. Unique files: 93. Lossless PNG originals: **0**. Captured counts describe visually verified states, not fulfillment of the lossless/full-native-window requirement.

## Why partial

All available screenshot exports returned JPEG bytes (signature checked). An early PNG filename assumption and invalid PNG-header dimension readings were corrected by byte-preserving rename and AppKit decode; no JPEG-to-PNG conversion was substituted. Acquisition stopped after this export blocker was confirmed. The 17 not-attempted states are disclosed rather than marked captured or assigned invented app failures.

The isolated native bundle is version0.1.0 and predates the latest Margin Projects header close control. Its image/diagram helpers are absent. Browser evidence runs the actual current renderer in the existing test harness with mocked native operations; it does not prove native behavior.

Native coordinate/drag/scroll actions repeatedly failed with noWindowsAvailable / ScreenCaptureKit -3811 or -3812. Separate native menus could not be captured. HTML child views were blank or stale after raising their parent. One rejected HTML capture contains body content plus an unsupported-file warning; it is retained as a failure, not silently accepted.

## Representative combinations

| Runtime | Theme / language | Sizes and areas |
|---|---|---|
| Native isolated Tauri | dark EN; light EN; light ES | Baseline main window1280×820 independently measured; settings800×720; zoomed wide workspace; welcome, readers, editing, dialogs, storage, layouts |
| Browser preview | dark EN; light ES |1280×800 app viewport;640×480 Spanish layout; Projects controls, menus, find/search, reader |

Pixel dimensions belong to each image and are decoder-measured in the manifest. Native window bounds are separate snapshots in window-metadata.json and window-metadata-final.json. Historical wide bounds and native viewport dimensions were not independently measured at capture time. Some wide frames differ in pixel scale; do not equate image pixels with window points. Browser viewport/DPR measurements are per record where available. No stitched composites or detail crops were created.

Windows, Linux, Retina/high DPI, Safari/Edge, native narrow-window behavior, and the full theme × language × size product were not tested. No claims of functional correctness or accessibility compliance.

## Area counts

| Area | Captured | Blocked | Not attempted | Not applicable |
|---|---:|---:|---:|---:|
| document | 26 | 10 | 11 | 0 |
| not-applicable | 0 | 0 | 0 | 5 |
| search | 4 | 1 | 2 | 2 |
| settings | 8 | 3 | 0 | 0 |
| shell | 27 | 11 | 4 | 0 |
| storage | 6 | 1 | 0 | 0 |
| variants | 10 | 2 | 0 | 0 |

## Outstanding inventory

| ID / state | Status | Route | Limitation |
|---|---|---|---|
| UI-007 Projects close hover current source | blocked | Open isolated bundle, use shell navigation or named menu/control: Projects close hover current source | No supported pointer-hover API; coordinate native actions repeatedly fail with ScreenCaptureKit -3811/-3812. Native bundle lacks current Margin close button. |
| UI-009 Projects narrow width | blocked | Open isolated bundle, use shell navigation or named menu/control: Projects narrow width | Native resize/drag coordinate actions unavailable; no safe verified resize route. |
| UI-010 Projects wide width | blocked | Open isolated bundle, use shell navigation or named menu/control: Projects wide width | Native resize/drag coordinate actions unavailable; no safe verified resize route. |
| UI-014 empty folder | not attempted | Open folder > fixtures/empty-folder. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-021 back history contextual dialog | not attempted | Open two disposable files; context click Back to inspect its history UI. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-024 folder context menu | not attempted | Open fixtures/project; context click deep folder in Projects tree. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-030 narrow desktop layout | not attempted | Resize isolated native window using supported bounds; record actual native bounds independently. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-032 native application menu | blocked | Open isolated bundle, use shell navigation or named menu/control: native application menu | Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents. |
| UI-033 native File menu | blocked | Open isolated bundle, use shell navigation or named menu/control: native File menu | Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents. |
| UI-034 native Edit menu | blocked | Open isolated bundle, use shell navigation or named menu/control: native Edit menu | Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents. |
| UI-035 native View menu | blocked | Open isolated bundle, use shell navigation or named menu/control: native View menu | Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents. |
| UI-036 native Go menu | blocked | Open isolated bundle, use shell navigation or named menu/control: native Go menu | Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents. |
| UI-037 native Window menu | blocked | Open isolated bundle, use shell navigation or named menu/control: native Window menu | Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents. |
| UI-038 native Help menu | blocked | Open isolated bundle, use shell navigation or named menu/control: native Help menu | Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents. |
| UI-043 long document scroll | not attempted | Open 01-visual-reference.md; scroll through Sections01–25 and lower images/code. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-052 editor context menu | not attempted | Open 02-second-document.md; Edit section Second document; context click editor paragraph. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-053 editor selected text | not attempted | Edit Second document; select garden in the editable paragraph. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-057 pending section confirmation | not attempted | Modify disposable Second document paragraph; click Edit section Secondary heading; cancel prompt. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-060 replace existing confirmation | blocked | Open disposable fixture, use document toolbar or state trigger: replace existing confirmation | Native Save As dialog remained Save-disabled with chosen filename; did not submit or replace fixture. |
| UI-061 image fit | blocked | Open disposable fixture, use document toolbar or state trigger: image fit | Isolated bundle lacks image decoder helper. |
| UI-062 image actual size | blocked | Open disposable fixture, use document toolbar or state trigger: image actual size | Isolated bundle lacks image decoder helper. |
| UI-063 image zoom | blocked | Open disposable fixture, use document toolbar or state trigger: image zoom | Isolated bundle lacks image decoder helper. |
| UI-064 HTML native preview | blocked | Open native HTML; dismiss banner; allow child repaint; capture without raising parent window. | Native embedded child preview captures blank after raising parent; repeated relevant retry failed. A retained failure C46 contains body plus unsupported-file warning, not the intended baseline state. |
| UI-065 HTML details | blocked | Open disposable fixture, use document toolbar or state trigger: HTML details | Embedded native HTML capture unreliable; child frame blank in repeated captures. |
| UI-066 unsupported file details | blocked | With Documents/images-only filter disabled in isolated Settings, Projects > 07-unsupported.xyz. | Native screenshot showed preceding HTML child with warning instead of unsupported details; retained rejected C46. |
| UI-068 corrupt image error | blocked | Projects > disposable 09-corrupt-image.png. | Image decoder helper missing from isolated bundle; corruption-specific behavior not reached. |
| UI-069 blocked resource notice | blocked | Open disposable fixture, use document toolbar or state trigger: blocked resource notice | No verified safe blocked-resource fixture in isolated runtime; missing native helpers prevent reliable distinction. |
| UI-075 large file over limit | not attempted | Use safe fixture beyond backend large-source limit; Open file; do not damage any existing file. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-076 conflict banner | not attempted | Edit disposable fixture; safely change same fixture on disk; await external-change notification. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-077 inspect disk version | not attempted | From disposable-file conflict banner, activate inspect disk version. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-078 discard conflict confirmation | not attempted | From disposable-file conflict banner, activate discard/reload then cancel. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-079 recovery offer | not attempted | Keep a draft of disposable fixture, restart isolated bundle, inspect recovery offer without deleting. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-080 restore session dialog | not attempted | Save disposable fixtures; quit/relaunch isolated bundle; inspect session restore offer. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-081 restored session | not attempted | Accept non-destructive restore of isolated synthetic session, verify tabs/tree. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-086 folder search options expanded | not applicable | Open Search folder; mode buttons and grouped results display directly. | Current src/app/FolderSearchPanel.tsx lines189–258 has always-visible mode controls and headings/list groups; no expand/collapse control. |
| UI-087 folder search result expanded | not applicable | Open Search folder; mode buttons and grouped results display directly. | Current src/app/FolderSearchPanel.tsx lines189–258 has always-visible mode controls and headings/list groups; no expand/collapse control. |
| UI-088 folder search subfolder scope | not attempted | Project tree deep-folder context menu > Search folder; run orchard query. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-089 folder search scroll | not attempted | Run orchard in project root; scroll grouped results to bottom. | Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow. |
| UI-090 folder search loading and stop | blocked | Open disposable project folder > Search folder > named query/scope: folder search loading and stop | Search completed before settled capture; no reliable transient capture hook. |
| UI-093 language dropdown | blocked | Click global Language selector while welcome visible. | Native popup capture omits the expanded popup. |
| UI-095 font dropdown | blocked | Open Settings and select control/section: font dropdown | Native popup is separate capture surface; screenshot API omits popup/unavailable while menu is open. |
| UI-101 settings persistence warning | blocked | Open Settings and select control/section: settings persistence warning | No supported safe fault-injection fixture; not induced by changing real storage. |
| UI-102 storage inventory empty | blocked | Projects footer > Manage… > named inventory/confirmation: storage inventory empty | Initial empty profile storage screen was not captured before fixtures were opened. Returning to empty would require clearing isolated stored session/recovery data; user prohibited confirming destructive actions. No reset performed. |
| UI-119 tooltip hover | blocked | Use relevant app navigation: tooltip hover | No documented hover API and native coordinate actions fail. |
| UI-120 loading transient | blocked | Use relevant app navigation: loading transient | No reliable capture timing hook; settled captures only. |
| UI-121 separate onboarding wizard | not applicable | Use relevant app navigation: separate onboarding wizard | No distinct implemented UI found in scoped shell/reader inventory. |
| UI-122 whole-document source editor | not applicable | Use relevant app navigation: whole-document source editor | No distinct implemented UI found in scoped shell/reader inventory. |
| UI-123 split preview mode | not applicable | Use relevant app navigation: split preview mode | No distinct implemented UI found in scoped shell/reader inventory. |
| UI-124 account and authentication | not applicable | Use relevant app navigation: account and authentication | No distinct implemented UI found in scoped shell/reader inventory. |
| UI-125 remote AI chat | not applicable | Use relevant app navigation: remote AI chat | No distinct implemented UI found in scoped shell/reader inventory. |
| UI-127 native Open folder dialog | blocked | Open folder; Cmd+Shift+G; set full fixtures/project directory without trailing slash; Return. | Picker screenshot is an inactive/stale-looking frame with grey Open despite AX enabled; retained failed attempt. |
| UI-131 editor block formatting menu | blocked | Open http://127.0.0.1:5187/tests/fixtures/redesign-preview.html?layout=margin&theme=dark&locale=en&longTree=1&search=1&editor=1; ES light; edit Editing target; click block type summary. | Control reached in browser but toolbar/menu absent from original; rejected C94. |

## Reconciliation and preservation

All 94 referenced originals exist, have bytes, and decoded in AppKit. All accepted captures have reproduction steps. All ten labeled contact sheets map to accepted originals. Original bytes are SHA256-hashed in the manifest. One exact-byte redundant pair (find empty vs cleared) is retained for different triggers. Multiple inventory states may intentionally cite one original; these do not inflate screenshot counts.

One early failed Spanish capture was overwritten by a filename collision before numbered-attempt naming began. The failure record explicitly discloses that its original raw frame is unavailable. No replacement image was fabricated. Remaining failed originals are retained.

Source files, user profile, hooks, and prior dirty work were preserved. Vite used installed dependencies and automatically optimized its local cache; no dependencies were installed, and no application bundle rebuilt. Disposable fixture02 was saved after the documented garden edit; its current content is the handoff baseline. No destructive confirmation was accepted, no cleanup ran, and no commits/push/deploy occurred.
