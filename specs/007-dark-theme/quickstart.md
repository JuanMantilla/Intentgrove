# Dark theme implementation and acceptance

**Status:** Proposed procedure; theme behavior is NOT TESTED.

1. Verify user approvals match spec.md, design.md, design/theme-states.svg, and plan.md hashes in docs/approvals.md. Generate bounded tasks from this plan before production edits.
2. Use a disposable folder with prose, code, a table, links, task lists and a local image. Inventory and hash it before running the app.
3. Run npm test, npm run build, npm run test:bundle-worker, then the native suite with the existing temporary Rust toolchain:

    PATH=/private/tmp/md-reader-cargo/bin:$PATH CARGO_HOME=/private/tmp/md-reader-cargo RUSTUP_HOME=/private/tmp/md-reader-rustup cargo test --locked

   Run native commands from src-tauri. FSEvents requires an environment allowing macOS notifications; an agent sandbox timeout is not an app failure diagnosis.
4. Build the local .app with npm run tauri build -- --bundles app, using that same toolchain environment; ad hoc sign and verify the disposable build as in F001 quickstart.
5. In the packaged app, choose each appearance, restart, and inspect the first document frame. Repeat saved-Dark cold launch ten times.
6. With System selected, change macOS appearance ten times and record event-to-update timing. Repeat under explicit Light/Dark and verify the choice persists.
7. At EN/ES 640/1440 points inspect toolbar, reading, code, tables, menus, errors, dialogs, recovery/conflicts, editor caret/selection, focus, and Reduce Motion.
8. During a disposable dirty section edit, change appearance ten times, exercise undo/redo, and compare draft, history, selection, focus, scroll and recovery status.
9. Observe app-requested assets/network separately from OS traffic. Compare source inventory and hashes.

Use PASS/FAIL/BLOCKED/NOT TESTED for each requirement. If native UI automation is denied, record it and use manual evidence without changing OS security settings automatically. No app-data reset or deletion of user drafts is part of this procedure.
