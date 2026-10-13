# macOS final-source acceptance — 2026-10-08 UTC

**PARTIAL / NOT RELEASE ACCEPTED.** Final-source native ledger: **30 PASS, 2 FAIL, 10 BLOCKED, 0 NOT_RUN (42 cases)**, derived from [coverage.json](coverage.json), rendered in [coverage.md](coverage.md). Blocked cases were attempted or assessed; they are not completed acceptance. This is role-separated same-session QA, not independent-person certification. QA kept application source read-only; QA-0009 required an explicit return to frontend IMPLEMENT, fresh candidate/package builds, and a new ledger. Earlier-source coverage remains [superseded](coverage-superseded-settings-fix.json), not inherited.

## Build and environment

Host macOS27.0.1 (26A434), arm64, 8 cores/16GiB, Node20.19.6, Rust1.88.0, CommandLineTools. [Host](evidence/host.json). HEAD7e00d3316ce46563cafb46ba928498fcb0d82880 plus dirty source inputs. [101-input production manifest](../../../os-engineering/evidence/macos-finish-20261008/source-manifest.json) SHA256270f687f2698fbf02605f90efda17b153bcbf913bcce020d3307fd95d9bf6e6c matches after native QA; [freeze verification](evidence/source-freeze-final-verification.json). Test files are separately pinned in [test manifest](evidence/final-test-inputs.json), [archive](evidence/final-test-inputs.tar.gz) and final dirty patch. No commit was made.

Native candidate `Intentgrove Final Acceptance 20261008.app`, isolated identifier `com.juanmantilla.intentgrove.finalacceptance20261008`, executable SHA2560df8de2e35e1f938dcb738e04e02178a51fdfdcfcf970983a6732c8902a63fac. Production executable SHA2567885115fc30e33e5b451ab614c93770c0b2a3c950a882f36a1d3cad43cfa7491. Same application source, different identifier/product config and binary. NF42 explicitly blocks exact-production-identifier runtime; no result is promoted across that distinction. Disposable documents/data only. Native fixture directory `/private/tmp/intentgrove-finish-20261008/fixtures`. [Fixture hashes](evidence/rich-fixture-manifest.json).

## Results and limits

Native Settings/Go menus, Command shortcuts, first/second Escape, preference commit/document Escape, Finder cold/warm exact-bundle opening, dirty Close/Quit Cancel/Save, file bytes, conflict-refused Save retaining draft, preferences/session/draft recovery, scoped search/open/scope changes, image refresh/reopen/recovery/security neighbors, reading metadata/highlight/reference/footnotes/duplicate-heading targets and hostile per-block fallback passed. Real screenshots and AX trees 08–50 were captured and visually inspected at the relevant cases. Reference navigation was finally exercised from a folder grant; explicit-file sibling refusal remains security evidence. Failed Save exercised conflict refusal, not direct permission-error injection. No request-level network observation is claimed by placeholder/image tests.

Native QA found QA-0009 document-focus Escape failure, retained screenshot07 and negative test. After frontend fix, candidate03 cases10–12 passed and production packaging was rebuilt. Finder warm attempt49 selected a historical duplicate-ID bundle; it is excluded. Exact Other picker attempt50 pins the current path/process. Historical bundles are preserved with directory rename mapping.

Valid Mermaid and malformed diagram-specific error behavior FAIL: both remain source fences. The unchanged-CSP packaged isolation probe did not execute the child. Removing it at1005ms is not native-bridge/resource/network denial or busy-code termination proof. [Approval amendment](../../../specs/008-rich-reading/isolation-amendment-20261008.md) contains exact next probe and dependency authorization.

Supported automation was rediscovered: native AX/screenshots/keys/menus/click/drag and Finder Other picker work. Cross-window drag did not deliver and raised windowNotFoundAtPosition; actual file/folder/Settings drops remain BLOCKED. Dock binding timed out; activation is not actual Dock reopen. Clean Close observation could itself reactivate a window, so disappearance is unproved. Bulk searches completed/capped before observable Stop; Escape after completion is not cancellation proof. Native stale-batch/open-reply held responses were not captured. [Attempt limits](evidence/automation-boundaries.txt). These require native human-assisted execution or improved supported automation, not weaker assertions.

## Performance and deterministic tests

Ten native trials each:1MiB1009–1119ms and10MiB1137–1218ms Open-click→AX usable upper bounds, including driver/read latency.10MiB is below the approved3s after-read limit even with that overhead.1MiB approved1s after-read target remains unverified; no claim of failure or pass from an imprecise clock. [Raw timings](evidence/native-performance.json); first/last native screenshots inspected.11MiB consent and bounded read-only source PASS. Warm worker VM measurements are supplementary algorithm timings, not native paint (approximately363–517ms1MiB/403–469ms10MiB); original slow attempts retained.

Final automated suite **322/322,46files**, [record](evidence/frontend-final-322.txt); focused edit-flow5PASS; native library97PASS/3ignored and refresh2PASS; typecheck/Vite/worker bundle/package workflow PASS. Attempt-level logs retain default8-worker menu/readiness failures, parser cap failures, QA0008 negative control, QA0009 pre-fix failure, and321PASS/1edit-flow failure. Fixes address ownership and lifecycle: committed-tab session selection, layout-time initial draft synchronization, mock reset/focus readiness, and one-time actions outside waitFor. Two workers limit host contention without retries, disabled tests, weakened assertions or timeout inflation. A later pass alone is not the resolution evidence. QA0008's exact historical scheduling is not conclusively reconstructed; controlled delayed-passive negative control establishes the repaired race.

## Delivery gates

Fresh production app/helper arm64, metadata/min14 inspection, deep strict ad-hoc signatures, DMG integrity and read-only mounted identical executable/helper/Info.plist PASS. Gatekeeper rejects private ad-hoc artifact as expected; notarized distribution is not established. macOS14 runtime, Intel/universal compilation/runtime, actual Applications install/update and full production-identifier matrix remain unverified. [OS report/procedures](../../../os-engineering/macos-finish-20261008-report.md). No dependency installation, credentials, notarization, Applications install, security changes, publishing, deployment target changes, commit or push.

Outstanding ownership and execution steps: [department handoff](department-handoff.md). Overall request remains incomplete at these gates.


## Final cancellation follow-up

NF26 now PASS: prior capped-query attempts remain historical. Uncapped no-match query let CUA observe searching and immediately click observed Stop in one sequential tool call. Screenshot/AX54 shows Stopped7,527/20,000 entries;55later remains7,527. This supersedes the earlier blocked cancellation assessment above, without claiming native held stale replies NF27. Current total30PASS/2FAIL/10BLOCKED. Candidate quit normally after evidence capture.


## Authorization update — 2026-10-08

[Actual user approval and exact boundaries](../../../docs/macos-continuation-approval-20261008.md) recorded. Previously pending disposable isolation probe/audited Mermaid11.17.2/project-lockfile addition and isolated Applications install/update checks are authorized. Original measured results, failed probes, packages and source provenance above remain historical; no acceptance or task gate is completed by approval alone. Separate rendering-process fallback remains subject to concrete architecture approval; environment/prior-package prerequisites remain. Documentation-only recording performed, no restricted release/security action.
