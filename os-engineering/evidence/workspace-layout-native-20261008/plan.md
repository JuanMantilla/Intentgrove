# Workspace layout native integration — IMPLEMENT

Authority: current user explicitly authorizes minimal native Settings/session changes; Margin/Folio/Atlas accepted, Margin default. Existing extensive dirty work retained in pre-existing.diff; no dependencies, privileges, migrations or installation. Global Spec Kit feature013 observed and unchanged; this bounded IR-04/F003C extension is recorded with feature004 rather than changing global selection.

1. Extend existing preference-only Settings contract with a strict shared enum and workspace-scoped patch. Keep owner, request/revision, failure/retry and acknowledgment mechanisms.
2. Extend existing schema1 PanelState and checkpoint/finish/restore. Omit default Margin only in stored canonical bytes to preserve legacy checksums; always advertise layout in Settings and restore IPC. No document data or grant changes.
3. Exercise new/legacy defaults, all durable choices, invalid inputs, failed writes/retry and owner lifecycle; run existing document Save/conflict/recovery and frontend/native regressions.
4. Build locally without dependency acquisition; launch a separately identified disposable candidate for native Settings, switching/restart and actual rendered inspection. Record unavailable checks and retain failures.
5. Update scoped reports, feature004 supplement and current states; stop at implementation handoff. Option-set acceptance is distinct from runtime user acceptance.
