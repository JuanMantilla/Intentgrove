# F001 local build and acceptance

The current app targets this Mac's arm64 architecture. Use disposable Markdown fixtures; do not test against a repository containing work you cannot replace.

From the repository root, with the temporary local Rust toolchain used for this build:

```bash
export CARGO_HOME=/private/tmp/md-reader-cargo
export RUSTUP_HOME=/private/tmp/md-reader-rustup
export PATH="$CARGO_HOME/bin:$PATH"
npm test
(cd src-tauri && cargo test --locked && cargo fmt --all -- --check)
npm run tauri build -- --bundles app
codesign --force --deep --sign - 'src-tauri/target/release/bundle/macos/Markdown workspace.app'
codesign --verify --verbose=2 'src-tauri/target/release/bundle/macos/Markdown workspace.app'
open -n 'src-tauri/target/release/bundle/macos/Markdown workspace.app'
```

The final `codesign` command makes a locally verifiable ad hoc bundle; it is not Developer ID signing or notarization. Re-run it after each app build. The temporary toolchain may be removed by the OS; if so, reinstall Rust locally before rebuilding. The built app itself needs no Node or Rust installation to launch.

For F001 acceptance in a visible macOS session: create a disposable folder with two same-name Markdown files in different directories, GFM, a valid local PNG and link, a remote image/link, raw HTML, a symlink escape, an invalid UTF-8 file and an over-limit file. Hash and inventory the folder before and after. Stop the dev server, launch the bundled app, then exercise folder → tab → local link/image, blocked states, EN/ES, cancellation, keyboard navigation, a 640×480 window. Observe app-requested network traffic separately from OS traffic. Record results in [verification.md](verification.md) and [test-matrix.md](test-matrix.md); do not promote unobserved checks to PASS.
