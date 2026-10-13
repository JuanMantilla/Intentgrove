# QA state

F007W RUN/RETEST f007w-native-ui-20261005T220853Z, PARTIAL / BLOCKING_FINDINGS_PRESENT. Exact unsigned x64 release SHA256 3c152124ce291119aaa6c742ee82f36352ea1bcec9086d3067415b3c72db9801.

[Report](runs/f007w-native-ui-20261005T220853Z/report.md), [ledger](runs/f007w-native-ui-20261005T220853Z/coverage.json), [handoff](runs/f007w-native-ui-20261005T220853Z/department-handoff.md). 77 constituent rows: 38 PASS, 7 FAIL, 15 BLOCKED, 16 NOT_RUN, 1 NOT_APPLICABLE. Scale is USER_ASSISTED: reported 100/150/200%, then restored 100%. Native screenshots/AX/input/dialogs now work through dedicated node tool.

QA-0003: six Alt+F4/title-close failures, S2/P1, OS_ENGINEERING. QA-0004: unexplained unsupported banner/stale locale, S3/P2, FRONTEND. QA-0005: Settings minimized/refresh guard, higher-integrity Task Manager and popup bounds, QA_AUTOMATION. Original RPC inventory blocker QA-0001 resolved for current route; exact ordinary-host launch QA-0002 PASS; earlier restricted failures preserved.

User-assisted cleanup verified: no Intentgrove process remains; worker descendants unverified. Original fixtures restored; boundary fixture and isolated profile retained. No product fix, elevation/security change, dependency install, signing/publication or release approval.

Next: OS_ENGINEERING traces final checkpoint/close; FRONTEND clarifies status; QA completes blocked/omitted tests on rebuilt candidate. Editing and T012/T024/T033/NSIS remain gated. Current Mac native/packaged NOT_RUN; Linux unsupported. Prior run remains intact.

## Latest QA-0003 engineering attempt

OS engineering IMPLEMENT; finding remains OPEN, no behavioral fix or native lifecycle PASS. [Report](runs/qa0003-close-repair-20261005/report.md): focused mocked close/session 34 PASS; isolated diagnostic no-bundle candidate SHA256 e8880fd27781215eed1116f5f7dc4eb65cce766f57704c46d5fde25de1a1b648 built. Native session/recovery/scoped runs fail at restricted fixture access NTSTATUS 0xc0000022 / Win32 5; helper unavailable (pipe error 2 after reset/retry). Ordinary-host close capture pending to establish actual command/error before fixing. Prior 77-row ledger and six failures remain intact; editing/installer/Mac gates and Linux exclusion unchanged.

Latest diagnostic: user confirms first diagnostic Close refusal; stderr files empty. New isolated candidate df6a3343e458140638e0bc5325b78f56b97806c979c1245eb12931b21cf1f4b8 uses explicit build-only diagnostic notice. Builder 276 tests/checks PASS after preserved Reload test failure; focused 40 PASS. Actual failed operation/error text pending; QA-0003/T036 remain OPEN, original ledger unchanged. [Current report](runs/qa0003-close-repair-20261005/report.md).

QA-0003 Windows root cause established: Tauri creates inherited-DACL app-local directory before private storage initialization; exact finish_workspace_session recovery_permissions error captured. Existing protected initializer now runs before WebView construction; no policy weakening/profile repair. New candidate e1c3d306968470d6bbd25fdb61ca8cb8d97321d6eb8a89b71fed3f4c2f550559 compiled/built, native retest pending. User reports related older Mac refusal without diagnostic; Mac cause unknown/T037. Original ledger and six failures intact. [Report](runs/qa0003-close-repair-20261005/report.md).

Current repaired Windows candidate both normal-close routes USER_ASSISTED PASS; native host suites 12/9/17 PASS. Remaining continuity/descendant/DPI scope pending; restricted protection failures retained. Mac cause still unknown, current Mac diagnostic unavailable. Original QA ledger unchanged.

Observer PASS: app plus six WebView2 descendants terminate after normal close; checkpoint normal/sequence6. User confirms first.md restart restore. Two-file folder-grant/150/200% retest pending; nearby link denial from Ctrl+O explicit grant is expected. Mac visible-window/Cmd+Q failure confirmed, root unknown. [Latest report](runs/qa0003-close-repair-20261005/report.md).

Final retest scope: user says scale changes impractical; repaired 150%/200% NOT TESTED. User still sees blocked second.md after requested folder workflow, so two-file continuity BLOCKED/root cause UNKNOWN (only first.md restored). Source trace clears tabs/grants on committed folder selection; prior single-file-grant explanation does not establish this later cause. No link boundary changed. QA-0003/T036 remain OPEN; close routes and observed termination PASS at current unspecified DPI. See current repair report for trace and native reason-capture next step.
## Two-file continuity repair - 2026-10-05

User authorized senior-frontend-developer IMPLEMENT for the sibling-link issue. Clarification: Ctrl+O single-file grant correctly blocks siblings. Reproduced a frontend defect when reopening the same file from the selected-folder tree: identity dedup retained that explicit grant. Successful tree reads now rebind only clean tabs to the returned root grant, preserving reading/history/checkpoint keys; edits/recoveries stay bound to their grant. EN/ES single-file guidance added. Focused54/full280 tests and isolated no-bundle Windows build PASS; native two-tab restart acceptance PENDING (helper pipe error2). Source unchanged after build; build-time279 tests, final extra draft-protection regression included in280. See frontend-implementation/evidence/sibling-link-repair/report.md and logs. Candidate SHA256 d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0. Existing QA-0003 failures/close repair, seven approvals, gates and unrelated edits preserved; no backend/security/dependency/install/sign/publish/commit changes.
Two-file continuity acceptance update: user confirms exact candidate d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0 opens the sibling from the folder tree, keeps Ctrl+O single-file restricted with the new guidance, and restores both tabs after restart. USER_ASSISTED PASS; T038 complete. Raw reply: frontend-implementation/evidence/sibling-link-repair/user-native-retest.json. Earlier blocked/pending entries retained as history. No DPI/new worker/Mac PASS inferred; QA-0003/T036/T037 and broader gates remain separately open.
## QA-0004 frontend handoff — 2026-10-05

Source COMPLETE_IN_SCOPE; QA-0004 remains OPEN / NATIVE_RETEST_PENDING. Session load/checkpoint/close failures now name their operation/code independently of document reading; translated notice recipes update existing/delayed notices in EN/ES. Close checkpoint guards, grant refusals, approved UI and unrelated native work preserved. Full287/build/worker PASS; Chrome synthetic renderer startup/folder/sibling/locales/refusal review PASS. Exact historical startup error remains uncaptured; shared private storage path with QA-0003 established, identical DACL cause not asserted. Native Windows/current-profile/picker/refresh/DPI/Mac acceptance NOT TESTED this pass. [Evidence](../frontend-implementation/evidence/qa-0004/report.md). Original ledgers and QA-0003/T036/T037 limitations retained.


## Latest RETEST - 2026-10-06

f007w-retest-20261006T004857Z: BLOCKED / INSUFFICIENT_EVIDENCE. [Report](runs/f007w-retest-20261006T004857Z/report.md), [ledger](runs/f007w-retest-20261006T004857Z/coverage.json), [handoff](runs/f007w-retest-20261006T004857Z/department-handoff.md). 75 rows: 2 supplementary PASS, 69 BLOCKED, 3 Mac NOT_RUN, 1 Linux NOT_APPLICABLE; zero native product execution. Latest located saved/release executable d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0; disposable identifier/receipt verified, predates QA-0004. QA-0004 rebuilt candidate not located. Dedicated Windows inventory pipe error2 on three probes including reset. No screenshot/AX, input, launch or Scale mutation; prior minimized/refresh/integrity/popup failures preserved. QA-0003/4/5 OPEN / RETEST_BLOCKED; historical constituent passes not erased or promoted. T036/37/39/12/24/33 remain open; T038 user-assisted acceptance unchanged. Preexisting old diagnostic PIDs12340/25688 untouched. 197 product/test/build files hash-identical. Current Mac unexecuted; macOS-only harness preserved; Linux unsupported; no release readiness established. Next: QA_AUTOMATION restores approved native transport; FRONTEND supplies exact QA-0004 no-bundle rebuild and receipt; repeat full scoped scale matrix.

Connection recovery retry 2026-10-06T00:57:32Z: [report](runs/f007w-retest-20261006T004857Z/connection-retry-20261006T005732Z.md), one connection case BLOCKED in three attempts after supported reset. Native endpoint still absent; no restart/log API exposed. Provider repair/logs needed; product coverage and all gates unchanged.

User-authorized connection investigation: [report](runs/f007w-retest-20261006T004857Z/connection-investigation.md). list_windows also fails pipe error2; manifest/API expose no helper lifecycle/log command. Host-managed endpoint recovery required, no extra QA approval required. Coverage unchanged.


## QA RETEST continuation — 2026-10-06T01:09:48.956Z

f007w-retest-20261006T010426Z: BLOCKED / INSUFFICIENT_EVIDENCE;80 ledger rows: 5 supplementary PASS, 71 BLOCKED, 3 Mac NOT_RUN, 1 Linux NOT_APPLICABLE; zero native product execution. Current QA-0004 six-file source manifest matches; offline existing no-bundle builder PASS (287 frontend tests/build/worker/all-target/release/PE),52 focused mocked PASS. New saved/release SHA256 ad594484d4687ca994354cefc48ff2ab10ad81e577e185f0597e9ad13517906c, identifier com.juanmantilla.markdownworkspace.windowsfixture20261006T010606305Z4e8e006d, receipt artifacts/windows/2026-10-06T01-06-06-305Z-4e8e006d/build-info.json. Candidate inclusion gap addressed; native endpoint still missing after supported reset and three probes. No host lifecycle tool/matching scoped logs; underlying cause unknown. CIM parent inventory denied 0x80041003; preexisting PID 14840/Settings 11552 untouched. 197 product/test/build inputs unchanged; generated build outputs recorded. Historical scale-specific failures/user-assisted passes intact; T038 unchanged complete. QA-0003/4/5 and T036/37/39/12/24/33 remain open. No native screenshots/AX or display mutation; current/original Scale unknown. Mac-only harness preserved/current Mac NOT_RUN; Linux unsupported; editing/installer/release gates unchanged. [Report](runs/f007w-retest-20261006T010426Z/report.md), [ledger](runs/f007w-retest-20261006T010426Z/coverage.json), [handoff](runs/f007w-retest-20261006T010426Z/department-handoff.md).


## Post-reboot connection RETEST � f007w-connection-post-reboot-20261006T134514Z

Windows restart USER_REPORTED. Dedicated list_windows and post-reset/reimport list_apps both fail native-pipe OS error 2. One connection case BLOCKED, two attempts, zero native product cases. QA-0005 remains OPEN; cause UNKNOWN. No native window/capture/input/launch or display/process/product change. Prior charter counts and build/scale provenance unchanged. QA_AUTOMATION/provider needs endpoint startup/session diagnostics and supported recovery. [Report](runs/f007w-connection-post-reboot-20261006T134514Z/report.md).


## Current macOS native RUN — 2026-10-07

Same-session candidate QA (not independent). macOS27.0.1 arm64, isolated com.juanmantilla.intentgrove.qa20261007, executable c91686db…; production differs by build identity/config. Ledger27:15 PASS/1 FAIL/6 BLOCKED/5 NOT TESTED. Real Settings/native Go dispatch/shortcuts/scoped query/dirty Cancel/failed Save/draft18px restore/helper PNG/security/large end/LaunchServices reopen tested. QA-0006 image status FAIL; QA-0007 intermittent frontend checkpoint exception open separately. Finder/drop inaccessible; Dock timeout; remaining matrix unrun. Source hashes match, disposable moved source restored, QA app exited. Report/coverage/screenshots/handoff: runs/macos-20261007/. No product fixes in QA/security/install/publish. Next: FRONTEND investigates006/007; provider restores Finder/Dock surfaces; OS compatibility/install procedures remain unrun.

Final-source follow-up: 3 native cases PASS; aggregate across both isolated builds: 18 PASS, 1 FAIL, 6 BLOCKED, 5 NOT TESTED. Broad baseline acceptance was not rerun on final source. Both QA apps stopped. See qa/runs/macos-20261007/final-followup.md.


## 2026-10-08 macOS continuation

QA AUTOMATE then RUN/RETEST: final-source ledger42=30PASS/2FAIL/10BLOCKED/0NOT_RUN; application source read-only except explicit frontend implementation interruption for QA0009, followed by rebuild/new ledger.322frontend PASS, native97PASS3ignored. Native source-candidate identity differs production. Mermaid valid/malformed FAIL; drops/Dock/clean-close/cancel/stale/1MiBtiming/production-ID BLOCKED. Role-separated same-session, not independent-person certification. Report runs/macos-finish-20261008/report.md, coverage.json, handoff.


Final follow-up: NF26 executing cancellation PASS (uncapped query, observed Stop, Stopped7,527entries stable on later capture54–55). Earlier cancellation-blocked prose remains historical and is superseded for NF26 only. Native stale batch/open replies NF27 remain BLOCKED; ledger now30PASS/2FAIL/10BLOCKED.


## Current authorization — 2026-10-08

QA handoff: user “I approve everything, make sure it's stated in the relevant documents”. Canonical docs/macos-continuation-approval-20261008.md/.json records reviewed hashes/snapshots. Disposable blob-frame isolation probe, audited Mermaid11.17.2/project lockfile addition and Applications install/update testing on disposable account/host APPROVED. Earlier pending/no-install labels superseded for these exact actions. Preserve production CSP during proof; enable diagrams only after passing isolation/termination. Unseen killable-process design requires its concrete amendment/approval. No release credentials/notarization/publish/deployment-target/security changes/commit/push. Existing30PASS/2FAIL/10BLOCKED ledger unchanged; approval is not acceptance. macOS14/Intel/disposable-host/prior-update-package prerequisites remain. Next: execute probe and dependency audit, then implement/rebuild/retest; run isolated installation checks when environment is available. This phase records authorization only; application source/artifacts unchanged. F007W global feature selection unchanged.


## Current macOS continuation —2026-10-08

PARTIAL, not overall complete. Primary QA RUN/RETEST, application inputs read-only; explicit IMPLEMENT fixes rebuilt before retest. Final344frontend/100nativePASS(3ignored), build/worker PASS;226 frozen source/config inputs unchanged. Current report qa/runs/macos-completion-20261008/report.md;56case ledger40PASS/1FAIL/15BLOCKED, distinct isolated/instrumented/package/environment scopes. Production executable64811928… and DMG12cfc97d… strict private-ad-hoc package checks PASS; Gatekeeper rejects, no bypass.

Process/engine and exact Mermaid/KaTeX approvals recorded; obsolete approval blockers superseded. Bounded supported diagrams, staged rich reading, Settings/session/image and QA0010–12 repairs included. Actual final executing helper deadline, stale native replies, ten restarts and anchor refresh retested. Full hostile/forged/network, sampled cancellation, exact layouts,25kStop timing and lifecycle repetitions incomplete. QA0013 historical timeout cause UNKNOWN. Full dependency audit1HIGHdev; exactsource-map-js1.2.2 proposal not applied.

Current app/Finder CUA cgWindowNotFound after reset. Exact production-ID/disposable Applications install/update/macOS14/Intel require missing host/prior different-version package. Owners/actions: department-handoff.md and external-environment-procedure.md. No account/tool/target/security/credential/publish/commit changes. F007W global selection and historical evidence preserved. Next: restore supported native access, finish causal test investigation and remaining exact acceptance; additional dependency remedy requires concrete approval.



## 2026-10-08 QA-0013 / Settings continuation

QA AUTOMATE investigation + FRONTEND IMPLEMENT completed for demonstrated defects. Canonical357PASS/53files, focused57PASS/6files, controlled8workers with freshoffline2jobnativecompiler357PASS/compilerexit0. Original320PASS/2FAIL timeout cause remainsUNKNOWN; QA-0013OPEN. Monotonic phases, actual process/resource/mock ownership and ordered cleanup retained; negative held-reply control and all failed attempts preserved. No deadlines/assertions weakened.

QA-0015 partial subscription cleanup and QA-0016 disposed Settings effects fixed, regressionsPASS; neither proven historical timeout cause. Settings current owner-unavailable reproduction explained by reader restore gate; verified-empty actual restoration→ownerpublish→native16→22→16 acknowledgmentsPASS. Final QA runtime04 proves pollstop7→7, four nativeunlisten acknowledgments/pending0/failures[], ownedprocessexit. Settings privileges unchanged. Historical Settings snapshot lacks readerstate, so retrospective attribution qualified.

Default production main34405daf… built/worker/boundary/signaturePASS, not installed/production-ID runtime-tested. Opt-in QA30d5af11… native integrationPASS. Exact hashes/manifests/commands/limits: qa/runs/macos-remaining-20261008/reliability/session-20261008/report.md. Prior acceptance remains tied to prior candidates. Package/lock unchanged; no native full-suite rerun, deployment, commit/push or privilege changes. QA_AUTOMATION owns future recurrence capture/causal isolation; FRONTEND maintains resolved lifecycle regressions. Existing unrelated work, historical evidence and F007W selection preserved.


## Native final production QA RUN/RETEST — current checkpoint

Current default production main34405daf849d83ee8330c999bb0e6be862347d2ba99ac6ad100a800ce7106b10, identifier com.juanmantilla.markdownworkspace. Original b7 installed/DMG package is superseded for runtime acceptance; latest app not installed. All13package files and226source inputs matched frozen manifests at entry. No profile reset; private backup untouched.

Current constituent ledger: native-final-20261008/coverage.json. CF42FAIL/overallINCOMPLETE: QA-0017 consistentCRLF sectionSave refuses as mixed endings, source preserved. FRONTEND owns reproduction/repair ($senior-frontend-developer), OS_ENGINEERING supports ($os-senior-expert); no application fixes performed in QA. FortyCancel and40directPermissionDeniedSave loops across title/CmdW/CmdQ/menuQuit,10realKeepdraft exits/restarts,20LFSave/Discard/Keep constituents and30cleanCmdW/CmdQ/menuQuit trials recorded. Title outcomes prove disk/draft/AX only, not repeated visibleDockjourneys. One user actualDockQuitCancel andoneDockreopen observed; repeatedDockboundary blocked.

Twenty currentproduction manifest queries exact1result/line2 PASS; filenameignore18/include20 andnoresults PASS. Ten currentproduction executingStop→partialStopped PASS, latencyunmeasured. Separate currentQA30d5af trustedclick→Stopped sameclock10/10 in1–3ms; protocol drained/finished andownedPID50925absent. Full search correctness/currentlocation/stale andstability matrix remains incomplete. Six basicSettings640/900/1440ENES captures dimensionaudited; fullCF48incomplete. Nativecapture intermittently noWindowsAvailable/ScreenCaptureKit3811; SystemEvents currentlyreportszeroWindows, actualDockvisibility assistancepending. Never count hiddenAXasvisibleacceptance.

Next: native-final-20261008/resumption-checkpoint.md. Complete reachable exact layouts/search/compoundrepetitions/installrollback; defects routed, no acceptancepromotion. Historical exclusionsCF52/53/55 and invalidsizecaptures unchanged.


## Native final production checkpoint — 2026-10-08T21:30:26.564882+00:00

Current production34405daf849d83ee8330c999bb0e6be862347d2ba99ac6ad100a800ce7106b10, com.juanmantilla.markdownworkspace; overall INCOMPLETE / FAILURES_PRESENT. Current ledger325constituents: 315 PASS, 3 FAIL, 7 BLOCKED. No full criterion is established by these aggregate counts. Historical14b7passes remain untouched.

Additional76LF lifecycle outcomes reconciled: CmdW Save/Discard/Keep each10; CmdQ andmenuQuit Save/Discard each10, plus10newtwo-tabKeepdraft actualexit/restarts each. Existing40Cancel/40permissionDenied/10earlierrestart/30clean constituents retained. Title→visibleDock and actualDockQuit compounds remain blocked.

Search:20manifestqueries;10additionalexecutingStopstablepartialUnicodehit;10executingquerychanges;10Searchclose→Stoppedpartial;10nativepickerrootchanges all passed observable outcomes. Current changed/moved/deletedresult handling passed.24,980hashable regular searchfiles matched originalmanifest. Exact default-production latency remains unmeasured; separateQAtrusted10/10Stop1–3ms preserved as supporting evidence only.

Native EN/ES640/900/1440×800geometry worked after actualreader interaction;60newvisible/exactcapture dimensions audited, individually reviewed with Loading/occluded/mislabeled captures qualified. Reader/Settings top+bottom/image/search/fallback/Findfocus andReduceMotion constituents recorded; no fullCF48PASS. Fullsixkeyboardsearchjourneys/largeimageedgepan remain incomplete. Latergeometryregressed tozeroWindows; FindAXworkswhilecontrolstripblank inCUAscreenshot, classified visibilityblocker notconfirmedproductdefect.

QA-0017CRLFSaveOPEN; QA-0018validdiagramsintermittentfallbackOPEN/rootUNKNOWN; QA-0019PNGReloadretainsresolvedcorruptionerrorOPEN, Retryrecovers. FRONTEND owns0017/0019; OS_ENGINEERING owns0018 withFRONTENDsupport. NoQAfix.

Finalaudit:13packagefiles and86frozenfinal-inputmanifestfiles match, strictdeepcodesignPASS. Entry226inputclaimretainedhistorically; thischeckexplicitlycovers86currentfinalmanifestentries. Sixoriginalfixturehashesallmatch; permission.md intentionallycontainslastsuccessfulLFSave, modes0644/folder0755. OriginalPNGrestored; Spanish/Roboto18/line1.6/page760/system/filtertrue, ReduceMotionOFF restored. Privatebackupexists/untouched. Observer14112finished; noQAappretained. Readerleftwithcleanfind-acceptance.md/qa-image.png fixturetabs.

Remaining: rebuildafterfindingrepairs→rerunaffectedacceptance; restoreactualnativewindow/Dock/Finderaccess→finishfulltitle/Dockjourneys, sixkeyboardsearch+imageedgejourneys, nativeOpenWith/drops/repetitions andlatestpackageinstall/tenlaunches/removalrollback; trustedpackaged1/10MiBwarmtimingandproductionStopmeasurement. Pendingactualplain.mdfiledropnotobserved; do notcountuser“continue”asgesture. Installedapp/DMGstillb7; noinstallrollbackPASS. OldOS/Intel/olderupgradeexclusionsunchanged.


## User-approved scope change — 2026-10-08T21:38:45.559000+00:00

User: “Exclude the seven blocked checks; retain all three defects”. Authoritative amendment: docs/macos-acceptance-exclusions-20261008.md (exact seven IDs and historical records in the adjacent JSON receipt).

The seven former BLOCKED rows are now NOT_APPLICABLE by explicit exclusion, not PASS. Current native-final ledger: 325 rows, 315 PASS, 3 FAIL, 7 NOT_APPLICABLE; zero active BLOCKED rows. QA-0017/0018/0019 remain OPEN and FAIL. Overall acceptance remains incomplete; this decision does not waive other non-excluded original criteria or approve a release. Do not continue requiring the excluded Dock/title, exact production Stop timing, full six keyboard-search journeys, current installation/rollback, Finder/drop repetitions or Find visibility-discrepancy checks.

Earlier blocked counts and next steps are historical and superseded for these seven checks only. CF42/CF48 retain their defects and non-excluded scope. CF54 is removed from the active gate. Product source, backup, fixtures and preferences are unchanged by this scope amendment.


## CF54 installed-package recovery — 2026-10-08

OS VERIFY completed the explicitly reopened existing b7 installation removal/restore journey: PASS, all13 bundle files and protected backup53 files unchanged; normal recovered session/settings and final Applications process path verified. [Report](runs/macos-remaining-20261008/cf54-recovery-20261008/report.md). Fresh profile retained; no old-profile restore. SC-001 withdrawn by user; no ten-trial requirement or new CF54 gate. Other defects/exclusions unchanged. Overall acceptance remains incomplete.


## Newer-build testing disposition — 2026-10-08

User: “I will test that, remove that as well.” Newer34405daf build installation acceptance is assigned to the user and removed from remaining agent work/completion gates. No further agent installation or retest is required for CF54. This is a scope/ownership disposition, not an unperformed test PASS. CF54 complete/PASS; SC-001 withdrawn; historical build identities preserved. Other findings unchanged. See docs/macos-newer-build-user-testing-20261008.md.


## CRLF Save scope deferral — 2026-10-08

User explicitly removed CRLF Save support from current requirements for now. QA-0017 is DEFERRED, a known defect preserved with original failed evidence, not fixed/PASS and no longer an acceptance gate. CRLF-SAVE is NOT_APPLICABLE in current scoped coverage. LF Save, failure data preservation and other requirements unchanged. Current native-final counts:315PASS/2FAIL/8NOT_APPLICABLE. Remaining confirmed active defects: QA-0018 intermittent diagram fallback and QA-0019 PNG Reload recovery. CF42 no longer fails because of QA-0017; its broader unverified scope is not automatically promoted to PASS. CF54 complete, SC-001 withdrawn, newer-build installation testing user-owned. Decision: docs/macos-crlf-save-deferral-20261008.md.
