$md-release-engineer

Run only for the approved F005 macos-delivery slice after earlier v1 features have
verified evidence. Read AGENTS.md, active release spec/plan and aggregate results.
Record actual macOS/CPU/SDK versions, target, minimum OS and signing decision.

Prepare the approved local .app/.dmg and checksums with all assets bundled. Verify
Finder install/copy/launch/Open With, disk image ejection, native menus, Cmd shortcuts,
Dock reopen, window-close/app-quit behavior, session/draft safety, launch behavior
and absence of development-tool dependencies or test-driver endpoints.

Separate local/ad-hoc signing from Developer ID/notarized download readiness. Record
actual Gatekeeper/signature/first-launch evidence; do not disable OS protections.
Use disposable fixtures and label unavailable tests NOT TESTED. Windows/Ubuntu and
untested Mac architectures are deferred, not implicitly passed.

No upload, publication, paid account, notarization submission, credentials export,
security bypass, commit or push. Write release-verification, third-party notices,
known limitations and exact local artifact paths. Stop for distribution approval.
