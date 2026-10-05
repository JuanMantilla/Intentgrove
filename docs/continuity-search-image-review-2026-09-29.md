# F003C, F003S and F006 approval review set

**Status:** Proposed, not approved. Prepared 2026-09-29. These are three separate feature gates. The user may approve or revise any one independently. The paths and SHA-256 values below identify the exact behavior, visual direction and architecture proposed for production implementation; research, contracts and quickstarts support review but do not replace those gates.

| Feature/gate | Artifact | SHA-256 |
|---|---|---|
| F003C session behavior | `specs/004-restore-workspace-session/spec.md` | `0dc8066e4a90ca1131027563e0bc660ac05b1bb9a47c96d2bd6bfef2f0bcb43d` |
| F003C visual | `specs/004-restore-workspace-session/design.md` | `ccb23e35957b1268ac5e6357787f56f43f6a2f81c48f8109ff3e58173ce0c472` |
| F003C sketch | `specs/004-restore-workspace-session/design/session-states.svg` | `b93398712d84afa13267609da2a2f30818ac1c5a079650b536f7df39af7206ac` |
| F003C architecture | `specs/004-restore-workspace-session/plan.md` | `5ab03986a60601c60f86d35d66e270bef95301cbb9fab759a0d7fee323b1e073` |
| F003S Find behavior | `specs/003-document-text-search/spec.md` | `d18e3a8c5ff05573eaf2f365c24fda5defcc973999edbee166faca5658f1e378` |
| F003S visual | `specs/003-document-text-search/design.md` | `a54a59ec36dd81fe174d733e8d14831c1aed2a30cea2a944d2df6c51c8af9920` |
| F003S sketch | `specs/003-document-text-search/design/find-states.svg` | `7b380538beff091df96a2ef22d33030433926a62cd4333d9f1735caa9c3647ab` |
| F003S architecture | `specs/003-document-text-search/plan.md` | `7fd271a24ab1ac3cac74e62af9f91fe4aa4b41c4dd27a3a08368727b656a8cd5` |
| F006 image behavior | `specs/006-view-local-images/spec.md` | `b8ee8619282446852ce955e04e1d027cd298c7982bfa658fc227c4fb25873fea` |
| F006 visual | `specs/006-view-local-images/design.md` | `f131f06a6d07b1c3f867888f8ff4fa0a016ae10b4a6d59b5edd01547fe0042d9` |
| F006 sketch | `specs/006-view-local-images/design/image-states.svg` | `a2ac8e2fc68bd8830dcbd2196911a3857338ca005c9893df01c73b7766c2440f` |
| F006 architecture | `specs/006-view-local-images/plan.md` | `5088bdeb934e52e6d025ed2cfaed1f301a449d1e1003d668d5429d7933b14306` |

## Decisions included in approval

- **F003C:** Restore previously selected scope, tabs and reading positions through native durable session records. Dirty drafts remain under F004 recovery. An unavailable/replaced root or explicit file requires user reselection. The normal quit path waits for a durable final checkpoint.
- **F003S:** Command+F searches the active rendered document; while editing a section it searches that live source draft. Results are ephemeral, accent-sensitive, keyboard navigable and do not write a document. Control+F is reserved for later supported Windows/Linux builds.
- **F006:** Image tabs and inline images support the listed formats under an 8 MiB encoded / 40 MP decoded proposed envelope. Malformed decode work runs in a bundled XPC helper receiving bytes only. SVG is rasterized with external references disabled. The plan proposes a Rust minimum-toolchain increase from 1.77.2 to 1.85 for resvg 0.48.1 and requires packaged XPC/signing validation.

Approval of these review sets authorizes scoped implementation and local tests/builds under project rules. It does not authorize publication, paid signing/notarization services, committing or pushing, clearing existing user app data, or treating unexecuted macOS checks as PASS. F004 recovery migration/storage changes and other F002/F003/F005 scope have separate approval needs.
