# IR-05 IMPLEMENT plan

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

Scope: native macOS Back/Forward/Visited/Clear routes and optional root-relative folder-search subtree; no new shortcuts, dependencies or authority. Preserve all preexisting worktree changes and IR-04 evidence. F003F owns search; F001 owns the shared native/client menu boundary; F007W remains globally selected by Spec Kit.

Reuse current menu events, committed client history, native no-follow adapters, bounded ignore parsing and document confirmation. Extend jobs with confirmed scope segments, retained directory handle/identity and existing root generation. Verify scope before traversal/emission/open and after stable document reading. Share document confirmation through a narrow internal file-handle seam. Distinguish Stop from job supersession so partial hits remain usable without accepting obsolete opens.

Checks: root compatibility; nested/inherited/local ignores; malformed/file/deep/missing scopes; internal/external junctions; sibling-hit forgery; directory identity replacement; root replacement; Stop and late cancellation; committed history event parity. Use disposable fixtures, installed offline Rust/MSVC and existing frontend checks. No install, commit, signing or release. macOS native execution requires a Mac.
