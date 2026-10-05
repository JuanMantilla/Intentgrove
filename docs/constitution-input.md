# Inputs for the Spec Kit constitution

Use these principles to generate `.specify/memory/constitution.md` with the
installed Spec Kit constitution skill. This file is input, not a second constitution.

1. Local desktop first. The released application requires no account,
   browser tab, cloud backend, CDN, runtime download, analytics or AI API.
2. Preserve user documents. Reading is non-mutating. Editing is explicit; dirty
   buffers, encoding/line endings, disk conflicts and save failure are first-class.
3. Treat all document content as untrusted data. Never run scripts, code fences,
   repository hooks or commands. Constrain filesystem access and native IPC.
4. Read-first design. Clear typography, keyboard access, accessible states,
   consistent EN/ES UI, and minimal chrome outrank IDE feature expansion.
5. Specification traceability. Behavior is specified and approved before production
   code. Every requirement maps to a scenario, task, test and evidence.
6. Small vertical features. One bounded phase per session. No speculative platform
   work, whole-repo rewrites or redundant agent conversations.
7. Evidence over declarations. A build, checked checkbox, generated test or agent
   conclusion is not proof of correct behavior. Record actual commands/results,
   platform and what was not tested; add native macOS verification.
8. Explicit human boundaries. Approve scope/design/architecture; automate approved
   local work. Separate permission for destructive/out-of-scope actions, publishing,
   commits/pushes, spending and system-wide changes. Do not bypass runtime controls.
9. Portable architecture, honest support. Avoid unnecessary platform coupling, but
   promise only verified macOS v1 targets. Windows and Ubuntu remain deferred.
10. Reproducible, private delivery. Pin selected dependencies in lockfiles, retain
    required third-party notices, protect secrets and avoid exposing user documents
    in source control, logs, screenshots or test artifacts.
