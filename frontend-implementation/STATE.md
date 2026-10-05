# Frontend implementation state — 2026-10-05

Primary skill: senior-frontend-developer, IMPLEMENT. All current design proposals approved; option D retained. User explicitly requested only remaining gaps, scoped frontend changes/tests/local builds.

Full design IMPLEMENTATION: PARTIAL. Completed this pass: cause-aware menu dismissal; folder Expand/Collapse; root-tab contexts; guarded batch close; Projects Reload/Copy; neutral timed manual reload footer/retained result; pending-start/stale search cancellation. Existing D/history/zoom/loading/source Save/recovery retained.

Evidence: `plan.md`, `report.md`, `evidence/approved-gap-pass/`. Baseline 255 tests; final current suite 269 tests PASS, build/worker PASS; nine WKWebView states/204 mocked checks PASS. Native grants/durable Save/restart, physical input, IME/VoiceOver NOT TESTED; user acceptance PENDING.

Global Spec Kit feature F007W preserved; F006 selected for task/verification maintenance only through supported NO_PERSIST override. Concurrent native/Windows and shared platform edits preserved and explicitly separated in change-review evidence.

Remaining: IR-01 rich source/history/checkpoint engine; IR-02 HTML/resources; IR-03 metadata/default handler; IR-04 Settings/preference ownership; IR-05 OS Go/subtree search. Exact next step: reconcile these technical/native contracts in owning canonical features, implement integrations, then run disposable packaged macOS acceptance. No repeated design approval needed. No commit, push, deploy or publish.
