# Minimal native request — workspace layouts

Status: REQUESTED, NOT IMPLEMENTED. Current user authorizes frontend work and explicitly requires a request for an unavailable native contract. No Rust/native/schema files were edited in this slice.

Observed boundary: `src-tauri/src/settings.rs` Preferences/Patch use `deny_unknown_fields`; neither accepts `workspaceLayout`. `src-tauri/src/session.rs` PanelState has no durable layout field. Sending a new field to current settings fails; a frontend-only session field would be discarded on decode. Consequently no new localStorage key, privileged command, alternate persistence store or fabricated acknowledgment is introduced.

Smallest compatible change using existing IR-04 ownership/session persistence:

1. Define an enum serialized exactly as `margin | folio | atlas`. Default `margin` for missing legacy profile/session values. Validate/reject unknown new requests. Use the existing session corruption/error behavior for invalid stored values, without discarding tabs/drafts merely to normalize layout.
2. Add `workspace_layout` to Settings Preferences and `Option<WorkspaceLayout>` to Patch. Treat it as workspace scope in Patch.workspace(), apply it and validate it. Keep request-ID/revision/timeout/retry/ack rules unchanged. No new Settings group is necessary (control lives under the existing General entry).
3. Add the enum field to session PanelState with serde default Margin, persist it in existing checkpoint/finish paths and return it on restore. **Always serialize `workspaceLayout` in supported Settings snapshots**, including Margin: its presence advertises support to the frontend. Never advertise it before the session field is durably supported. Missing field means unsupported host, not a preference to override.
4. Continue emitting `settings:intent` with `{workspaceLayout}` to the main workspace owner. The frontend already applies the layout synchronously, checkpoints through the existing workspace writer and acknowledges only after successful completion. Settings must never acquire document/grant/draft data or independently checkpoint sessions. No document Save/discard/reload is part of this operation.
5. Preserve explicit saved layouts through normal restart and pending/retry flows. Respect existing Clear session semantics; retain panel preferences where current approved scope requires them. No migration, privilege expansion, dependency or new command is requested.

Frontend is ready: optional TS wire fields; old-host publish strips unsupported layout fields before comparison (avoids rejection/republication loops); old-host Settings displays three labeled but disabled choices with an explanation. Supported hosts enable choices via the snapshot field. App restores explicit panel values, defaults missing/invalid frontend input to Margin, and updates layout refs before existing checkpoint. Atlas shelf width is never saved as explorer width.

Required native verification: older/new profiles default Margin; each explicit layout round-trips; invalid enum refused without changing docs; pending/failure/retry/restart correlation; settings window singleton/owner lifecycle; layout changes during reading/Find/folder search/dirty section editing; source hashes/grants unchanged. Real packaged native end-to-end/restart acceptance is pending. Existing CRLF Save deferral remains unchanged.


## Subsequent authorized native implementation

The current user authorized this exact minimal contract. Implementation delivered in os-engineering/evidence/workspace-layout-native-20261008/report.md (repository-relative). Historical REQUESTED status above records the earlier frontend-only slice; native switching/persistence is now exercised on the new candidate, with residual verification explicitly listed.
