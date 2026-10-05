# F003C validation guide — proposed

Run only after the approved implementation is built into a packaged macOS `.app`
with its development server stopped. Use a fresh disposable fixture under
`/private/tmp`, never a real repository. Record macOS build, CPU, display/scale,
executable SHA-256, fixture shape and before/after source hashes and inventory.
Mark each check PASS, FAIL, BLOCKED or NOT TESTED in feature verification; a
component test or successful build does not close native acceptance.

1. **Normal restore (AS-001–004/015; SC-001/002):** Open one folder, three tabs
   in a chosen order, scroll each to a different heading/offset, expand and scroll
   the tree, change sidebar width/visibility and window bounds. Close one tab.
   Quit normally and relaunch ten times. Compare root identity, remaining tab
   order/active tab, top visible passage within 8 px, tree and window state.
   Repeat last-window close/reopen while the app remains running.
2. **Dirty choices (AS-008/012/016/017; R06):** Create synthetic edits in more
   than one disposable file. Try Quit, close and folder switch. Exercise Save,
   Keep draft, Discard and Cancel, including a denied Save. Check that a cancelled
   or failed choice retains every unresolved draft and the original workspace;
   Keep draft leaves source bytes unchanged and F004 can recover it later.
3. **Unavailable and changed items (AS-005–007; SC-003):** From a separate writer
   process, rename/recreate the root, replace one explicit file, change one clean
   root-relative file, remove one tab target and deny access to one fixture.
   Relaunch for ten distinct cases. Confirm each specific recovery state and
   unaffected tab, no silent replacement grant, and explained anchor fallback.
4. **Checkpoint and crash (AS-014; SC-006):** Make 100 navigation/layout changes;
   measure input-to-completed native checkpoint for each against two seconds.
   After a completed checkpoint, terminate only the disposable test app in ten
   trials. Relaunch and verify the offered timestamp/state, possible-newer-work
   notice and unchanged source hashes. Never claim power-loss proof from a process
   exit test.
5. **Large workspace (AS-013; SC-005):** Use a disposable 25,000-entry folder
   with several tabs. On a recorded reference Mac, measure ten warm launches:
   active document usable within two seconds in at least nine. Confirm inactive
   tabs and unvisited branches load later, and choosing another folder cancels
   pending restoration without stale results.
6. **Clear and accessibility (AS-009–012; SC-004/007):** In EN and ES, use only
   keyboard to reach restored tabs, missing-item recovery and Clear session.
   Cancel the draft-aware confirmation, then confirm on a fresh disposable run.
   Compare app-data/session state and fixture hashes/inventory. Inspect actual
   640/900/1440-point and scaled displays, focus, readable status and Reduce
   Motion behavior. Observe app-requested network/resource activity separately
   from OS traffic; leave request coverage BLOCKED if no valid scoped observer
   is available.

The expected product result is the spec's AS-001–017 and SC-001–007, with F004
draft recovery and F005 Dock entry-point responsibilities recorded separately.
Do not clear user app data, change security permissions or publish the package
as part of these trials.
