# CF54 installation recovery verification — 2026-10-08

PASS for the authorized existing-installation removal/restoration journey. VERIFY mode; macOS 27.0.1 (26A434), native arm64. Current user owns the task-installed bundle. Original CF54 and external-environment procedure reviewed; current request supersedes the prior exclusion for this journey only. Older-package upgrades remain excluded.

Installed/restored app: `/Applications/Intentgrove.app`, identifier `com.juanmantilla.markdownworkspace`, version 0.1.0, main SHA256 `b7b0f872414fe5cf0e2f6205ef0bd5a234878fa5d5873a2bffe0ccf0162eb053`. All 13 files match the original production-provenance manifest before and after; bundle inode retained. Strict signature verification PASS. This is the historical tested installation, not the newer uninstalled `34405daf…` candidate.

| Check | Result and evidence |
|---|---|
| Ownership/current state | PASS — ownership.json, before-removal.json; original install recorded no existing Applications bundle |
| Normal quit/process cleanup | PASS — CUA Cmd-Q returned App quit; no main/helper process before removal |
| Recoverable removal | PASS — native Foundation NSFileManager Trash API; removal.json records exact returned Trash path and installed path absence |
| Absence and data preservation | PASS — removed.json; no main/helper processes; all 76 app-support files, native preference plist, 14 document fixtures and 53 private-backup files unchanged |
| Recover exact tested installation | PASS — restore.py verifies every bundle hash and data manifest before same-filesystem rename; restoration.json, restored-before-launch.json prove every tracked hash and original inode restored |
| Normal launch/session/settings | PASS — CUA exact installed-path launch; restored-reader-ui.txt/restored-settings-ui.txt show both tabs and Spanish/Roboto/18px/1.6/760/System settings |
| Final identity/path/state | PASS — final-running.json, final-process-path.json; PID 67336 main executable mapped from Applications, package signature/hash unchanged |
| Original F005 SC-001 ten install/launch trials | NOT APPLICABLE — withdrawn by explicit user instruction; no repetition requirement remains |

Private backup preserved at `/Users/juanmantilla/Intentgrove Backups/before-fresh-acceptance-20261008-093538`; all 53 file hashes unchanged. No old profile was restored. Drafts/save-backups and all tracked documents remain byte-identical. Fresh profile stays in place. No permanent deletion, Trash emptying, admin use, security bypass or product-source changes.

Before screenshot failed ScreenCaptureKit -3811 and Finder binding failed cgWindowNotFound; AX records support the observed state, not screenshot-based visual certification. Native Trash API used rather than claiming Finder removal/Put Back gestures. Swift first-run SDK module compilation was stopped before execution; retained sample and still-installed snapshot show no removal in that attempt. Objective-C calls the same Foundation API successfully.

After successful initial two-tab recovery/settings verification, a follow-up Cmd-W closed the clean reader tab. Reopened via visited history; final-reader-ui.txt confirms both documents again with find selected. The final tab order differs. Only session/workspace journal bytes and the OS-native `NSWindow Frame GoToSheet` geometry preference changed during these normal interactions; product settings stayed equal. No source content was edited. Incidental menu/picker interactions were dismissed.

No notarization/Gatekeeper certification follows from local launch. Earlier Gatekeeper rejection remains historical evidence; no new assessment or trust modification performed. Overall acceptance remains incomplete because other findings/gates retain their status. SC-001 withdrawn. The newer candidate is a different artifact; no new CF54 requirement implied. Broader runtime evidence retains its original scope.

Scope update: [SC-001 withdrawal](../../../../docs/macos-sc001-withdrawal-20261008.md). CF54 requested journey complete.


## Newer-build testing disposition — 2026-10-08

User: “I will test that, remove that as well.” Newer34405daf build installation acceptance is assigned to the user and removed from remaining agent work/completion gates. No further agent installation or retest is required for CF54. This is a scope/ownership disposition, not an unperformed test PASS. CF54 complete/PASS; SC-001 withdrawn; historical build identities preserved. Other findings unchanged. See docs/macos-newer-build-user-testing-20261008.md.
