# Intentgrove

Intentgrove is a private, macOS-first document workspace for reading, organizing,
and refining documents exchanged with AI. Its calm reading space helps you
understand AI output and prepare clearer context for your next conversation.

The current implementation includes Markdown reading and source editing,
workspace navigation, tabs, session restoration, search, and local image viewing.
See the [implementation status report](docs/implementation-status-2026-10-05.md)
for completed work, partial features, and outstanding verification. The Windows
version is in progress. [Brand decision](docs/brand.md).

To compile and package the current app on macOS, run:

```sh
./build-mac.sh
```

Requires Node.js/npm compatible with the locked frontend dependencies, Rust
1.88 or newer, and Xcode Command Line Tools. The script installs frontend
dependencies from `package-lock.json`, compiles the frontend, Rust app and XPC
image helper, signs the bundles ad hoc, creates and verifies the DMG, and puts
these generated outputs directly in this folder:

- `Intentgrove.app`
- `Intentgrove-local.dmg`
- `Intentgrove-local.dmg.sha256`

Run it from any working directory. Re-running replaces these generated outputs;
dependency downloads require network access unless cached. The build uses the
running Mac's native Rust target and default target directories. These are local
builds, not notarized releases. Open the DMG and drag the app to Applications to
install it.

After rebuilding, the macOS app is at
`src-tauri/target/release/bundle/macos/Intentgrove.app`. It is ad hoc
signed for local testing, not notarized for distribution. See
[`specs/001-workspace-reader/quickstart.md`](specs/001-workspace-reader/quickstart.md)
for build and launch commands.

The code and bundle pass the checks recorded in
[`verification.md`](specs/001-workspace-reader/verification.md). Native window
interaction, the folder-to-link journey, network observation,
display scaling, and WebKit performance still need acceptance in a
visible Mac session. See the [test matrix](specs/001-workspace-reader/test-matrix.md)
and [security review](specs/001-workspace-reader/security-review.md) before
treating F001 as complete.

The approved constitution, specification, visual direction and architecture are
recorded in [`docs/approvals.md`](docs/approvals.md). `AGENTS.md` and
`.agents/state.md` hold the workspace rules and current handoff. The source
repository is [JuanMantilla/Intentgrove](https://github.com/JuanMantilla/Intentgrove).
