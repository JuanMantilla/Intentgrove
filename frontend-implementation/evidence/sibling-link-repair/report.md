# Two-file continuity repair

USER-AUTHORIZED IMPLEMENT: senior-frontend-developer, scoped sibling-link fix requested 2026-10-05. Canonical feature remains specs/013-windows-desktop (installed Spec Kit prerequisite check PASS). FR-001/FR-003/FR-006/FR-011 apply. Seven existing approval hashes still match; no visual redesign or native-contract change.

## Diagnosis and implementation

User clarified that first.md was opened with Ctrl+O after selecting a folder. That creates an explicit single-file grant; native assets.rs correctly refuses sibling access. App.tsx previously presented the generic blocked-target notice, hiding the distinction. EN/ES copy now explains selecting the file from its folder tree.

A related frontend defect was reproduced before implementation: after Ctrl+O, clicking the same file in the already selected folder tree completed a successful root-bound read, but openDocument deduplicated by file identity and retained the old explicit grant. The second link still resolved through explicit-first, never root-first. The regression failed at the expected Second heading; baseline-grant.txt preserves the failure.

App.tsx:1499-1527 now replaces a clean explicit tab's native grant only after a successful tree read. It retains one tab, tab position, stable checkpoint key, reading-position/anchor/zoom maps, and visit history. Native link/asset commands, checkpoints and refresh then use the returned root-bound file ID. No normalization grants access. Dirty/active edits and pending recoveries retain their owning grant. Opening a file only through Ctrl+O remains single-file scoped. No backend files, native permissions, dependency versions, Mac lifecycle/harness restriction or editing gates changed in this frontend pass.

## Actual verification

PASS: pre-fix regression demonstrates retained-grant failure; final focused command npm.cmd test -- tests/ui/workspace.test.tsx tests/ui/session.test.tsx tests/ui/markdown.test.tsx tests/ui/recovery.test.tsx tests/ui/edit-flow.test.tsx: 5 files/54 tests. Tests cover single-file refusal, tree rebinding without duplicate tab, opening the second file, stable checkpoint/active keys and final close checkpoint, pending recovery and active recovered draft protections. Earlier test-setup failures are retained separately, not product defects.

PASS: npm.cmd test: 40 files/280 tests. PASS: node scripts/build-windows.mjs --no-bundle: build-time 279 tests (the additional active-draft test was added afterward and is included in the final 280), TypeScript/production frontend, worker bundle, locked Windows all-target/release and PE dependency checks. Source did not change after the candidate build; only test coverage was extended. PASS: git diff --check; seven approval hashes unchanged.

NOT TESTED: native picker/link/two-tab restart integration, physical keyboard/VoiceOver and native Mac regression. Dedicated native helper list_windows returns pipe error 2; no alternate automation or policy bypass used. Component tests use mocked native grants and do not prove actual picker/checkpoint integration. Existing normal-close native PASS belongs to the earlier candidate and is not assigned to this new executable. User-assisted native retest requested; acceptance PENDING.

Candidate: C:\Users\jsman\projects\personal\Intentgrove\artifacts\windows\2026-10-06T00-21-45-964Z-72a87848\Intentgrove.exe
SHA256: d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0
Unsigned, isolated app data, no bundle/install/signing/publication/commit. Earlier close repair and all unrelated changes/failure evidence preserved. Linux remains unsupported.

## Native retest

Open this exact candidate. Use Open folder on qa/runs/qa0003-close-repair-20261005/fixtures/café workspace. Click first.md in the left folder tree, then Read second. Confirm two tabs, normal close and restoration of both on reopening. No scale change needed. To exercise the repaired transition, open first.md using Ctrl+O while the folder is selected; its sibling remains blocked until clicking first.md in the tree. After that the same clean tab uses the verified root grant and its local link can open second.md. Source/edit/recovery and native access guarantees stay protected.

## User-assisted native retest result

User confirms on the exact requested candidate: the link opens from the folder tree, Ctrl+O displays the new single-file restriction guidance, and both tabs return after restart. USER_ASSISTED PASS for folder-tree sibling navigation, explicit-file boundary and two-tab normal-restart continuity. [Raw user evidence](user-native-retest.json). Native desktop automation remains unavailable; no new process/worker observation, DPI matrix or Mac result inferred. T038 completed at this scoped acceptance boundary; T036/T037 and broader platform gates remain open. Prior PENDING entries above preserve the state before this reply.