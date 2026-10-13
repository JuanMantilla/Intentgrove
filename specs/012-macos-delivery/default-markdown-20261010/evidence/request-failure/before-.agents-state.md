# Intentgrove — every-launch default check, 2026-10-10

Active F005/default-markdown-20261010, IMPLEMENT handoff. User explicitly requested checking each opening and asking when not default, superseding permanent response suppression. Authority: every-launch-amendment.md; original reviewed hashes unchanged. Global Spec Kit013 unchanged.

T-D03-R1 complete: native startup ignores old answered preference, queries current defaults on every eligible fresh process launch, skips already-default, retains one prompt per process and explicit consent. Only native policy/tests and canonical records changed. No settings/session/draft format changes or preference resets.

Evidence: amendment/every-launch-report.md and evidence/every-launch/. Native121PASS/5ignored; mocked external-switch/adapter/script checks PASS; final build/strict ad-hoc signature/disabled CLI-script PASS. Previous full integration harness failure remains historical. Actual external-switch/relaunch UI NOT TESTED; user observed prior script reporting already-default.

Rebuilt app: src-tauri/target/release/bundle/macos/Intentgrove.app. /Applications copy remains older. Next: quit running copy and open rebuilt bundle; already-default should stay silent. T-D06–T-D07 isolated native matrix remains open. No real default writes, install, dependencies, privilege changes, release, commit/push.
