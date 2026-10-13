# Option B implementation — 2026-10-11

USER-AUTHORIZED: current user selects Option B and adds Cmd+T/macOS, Ctrl+T/Windows. Authorization and original artifact hashes: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/new-markdown-20261011/authorization.json. Historical PROPOSED labels remain unchanged. Existing approvals and dirty work remain intact.

IMPLEMENT scope: compose existing WorkspaceDialog, styles, localization and App routing; filename validation; explicit granted-root default and existing select_root picker; single dialog ownership; renderer checks. No new dependencies, native contracts or privileges.

OBSERVED: CodeGraph consulted before code inspection; indexed App/API/native files drifted and were read from disk. React 19/Tauri 2/Vite/Vitest installed. No create command exists. select_root grants a folder but clears prior roots/files/snapshots, while existing Save As requires an existing section session and cannot safely bootstrap a new document. Native sections_from_source accepts an empty file as one whole section. Windows frontend editingAvailable=false and native editing_unavailable remain authoritative limitations.

Sequence: implement independent dialog/routing → regression and actual renderer checks → concrete native request → implementation handoff. Create stays disabled with truthful explanation. Do not create a synthetic document/tab or infer an individual file parent grant. Integration does not proceed without the request's approval.

Requirement map:

| Requirement | Authorized frontend slice | Remaining dependency |
| --- | --- | --- |
| 1–2 | Projects, welcome and native-only key capture; synchronous owner; future native event receiver | Native File menus / exact native accelerator verification |
| 3 | Filename initial focus, current granted root, existing folder selector only in a completely empty workspace; otherwise picker blocked to preserve grants | Native write authority/revalidation |
| 4 | Portable filename checks; case-insensitive .md normalization | Native equivalence, exclusive collision/race safety |
| 5 | No invented success | Actual create response and real identity/editor transition |
| 6–7 | Existing editor/save/recovery retained | Post-create lifecycle test matrix |
| 8–9 | Existing modal, inert background, keyboard/focus, centralized EN/ES, existing themes/tokens | Narrow native render, screen reader, physical IME and system theme change |
