# QA-0032 native listing identity repair — 2026-10-11

USER-AUTHORIZED IMPLEMENT; COMPLETE_IN_SCOPE; acceptance PENDING. Native-listed unopened Reveal now requires owning snapshot/generation/parent/name and matching native identity. Menu freezes snapshot or opened-file grant at entry; narrow frontend contract implemented. Seven source/test paths changed; prior edits retained.

PASS: macOS library142 (5 existing ignored), final4 native policy tests/9 filesystem combinations, affected mocked UI126/8 suites, types/frontend build, isolated offline debug build/signature, input integrity/diff checks. Actual macOS before/after-menu unopened mutations reject/dismiss safely; root/explicit grants verified. Final candidate fresh/explorer replacement/root-tab/explicit-tab Finder selections verified. Windows build/runtime and both File Explorer menus NOT TESTED; broader visuals/AT/full suite/independent QA pending. No application draft/save/document-write commands; disposable fixture mutations only. Normal post-validation OS races and native-ID reuse limits remain.

Source a9e99252a54cbbaf3c325654966b7cb0da0cc283f05707e5cdc868388a820761; executable 1420e39092814e9fba00d135a5110b6f36389cadfc1aa6c040faef05ef389893. Handoff /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0032-20261011/implementation-handoff.md; contract /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0032-20261011/frontend-contract-handoff.md. Candidate quit; installed app/prior QA preserved. QA-0032 stays OPEN; no acceptance/DONE_ACCEPTED/cleanup/install/release/commit. Next: independent QA RETEST on exact final candidate, then user acceptance; Windows host continuation separately.

---

# Reveal local files — 2026-10-11

USER-AUTHORIZED IMPLEMENT complete in scope; acceptance PENDING. Both file/tab context menus use native grant resolution, absolute-local-path gating and graceful errors. macOS NSURL/NSWorkspace selects Finder file; Windows Shell API preserves platform conventions; Linux remains unsupported. No dependency/security/install/release/commit/cleanup changes. Prior work retained.

PASS: 32 scoped mocked UI tests, 140 macOS native library tests (5 existing ignored), TypeScript/isolated frontend build, diff check. Real production Cocoa bridge selected exact disposable special-character Finder path; missing target rejected. NOT TESTED: packaged menu-to-Finder UX, Windows native build/runtime, full UI suite, AT. Evidence/report: /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-file-20261011/report.md. Next: review implementation; isolated native menu smoke tests and Windows host verification. No DONE_ACCEPTED.

---

# QA-0030 Option B filename repair — 2026-10-11

USER-AUTHORIZED IMPLEMENT; COMPLETE_IN_SCOPE; acceptance PENDING. UI/native no longer trim input and reject approved prototype competing extensions; terminal .md/.MD/repeated normalization, dotted .md basenames and byte limits retained. EN/ES associated error copy updated. Native handoff corrected; original approvals/QA evidence preserved.

PASS: focused frontend77, native creation11 (real root/token filesystem routes), types/frontend build, isolated debug native build/signature, Chrome mocked matrix/keyboard/editor, bounded native error/normalization/picker cancellation and input/diff checks. Packaged real create BLOCKED: both native picker Open buttons disabled (QA-0029). Windows/Linux, screen reader/IME, narrow/Spanish and full-suite regression NOT TESTED. Installed app untouched; no grant bypass/install/dependency/protection/publish/commit/delete/cleanup.

Source 5692bf02f092a6ab1095d39379a7e72d6eb257323cc54489990e81393a8c8eac; native executable 21fe15dbee88e554c9589419dd828d41a8dece1135688cef2c833af64b586dc5. Handoff: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0030-20261011-handoff.md. Exact changed paths/provenance/checks/candidate there. Next: independent QA RETEST after permitted picker remediation; QA-0030 stays OPEN. Earlier state preserved below.

---

# New Markdown native — 2026-10-11

Bounded native authorization recorded; Option B/prior approvals retained. Creation/destination/menu and typed contracts implemented; macOS native135+19 tests/build,32 focused mocks/source types PASS. Aggregate Cargo tests FAIL (standalone refresh imports). Windows metadata/runtime and final frontend/native UI integration BLOCKED/NOT RUN; shipped editing gates retained. Report and exact frontend handoff: /Users/juanmantilla/projects/personal/md-reader/os-engineering/new-markdown-20261011/report.md and /Users/juanmantilla/projects/personal/md-reader/os-engineering/new-markdown-20261011/frontend-handoff.md. Final snapshot v11/coverage under same task evidence directory; accidental native formatting churn disclosed. Acceptance pending; no DONE_ACCEPTED/cleanup/install/release/commit. Next: frontend macOS integration; Windows continuation normal-user proof.

---

# Intentgrove — approved individual-file links, 2026-10-10

F001 scoped repair approved: user “I approve it, please implement anything necessary”; exact statement/reviewed hashes in os-engineering/individual-links-20261010/native-approval/approval.json. Source fix already complete; no new application edits. Earlier frontend546/native125 tests remain valid for unchanged source inputs. Nonpersistent Spec Kit F001 override confirmed; global013 unchanged.

PASS: isolated production-code app build; normal macOS arm64 Intentgrove.app plus XPC/diagram helpers; deep strict ad-hoc signature and production asset/native QA-boundary checks. Bundle: src-tauri/target/release/bundle/macos/Intentgrove.app. Report/logs/hashes: os-engineering/individual-links-20261010/native-approval/.

BLOCKED native GUI: Computer Use refused access to Intentgrove Links Test. Disposable fixtures prepared; no bypass or real workspace access. No installed app replacement/quit, defaults, OS protections, dependencies, release credentials/notarization/publication/commit/push/cleanup. User approval recorded; unavailable native UX not certified. Next: authorize tool access to isolated test app, then verify fixture links/history/drafts/permission continuation. Normal bundle ready for user-controlled update after safe quit.
