> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

> Superseded as a capability inventory by the subsequent [actual native implementation handoff](../os-engineering/html-frontend-handoff.md). This file remains the historical frontend request; its command/type/budget proposals are inputs, not the final API. October6 authorization remains effective.

# HTML implementation dependency — 2026-10-08

Status: IMPLEMENTATION DEPENDENCY, not missing approval. Primary owner: native/OS engineering with security review; frontend owns the subsequent integration. User authorized remaining IR-02/03 scope on October 6 and expressly reaffirmed read-only HTML/CSS viewing on October 8. Earlier staged reapproval prose in integration requests/decisions is historical and superseded. No source editor or HTML authoring is requested.

## Observed contract reconciliation

- `src-tauri/src/selection.rs::select_file` picker excludes html/htm.
- `src-tauri/src/document.rs::read_document_impl` root-relative reads require Markdown; explicit reads still have no typed HTML descriptor. `DocumentResponse` is text for Markdown, not a renderer contract.
- `src-tauri/src/scope.rs` / platform listing classify documents as Markdown/images/other; no HTML kind. Frontend now exposes HTML filenames received as `other`, without claiming preview support.
- `src-tauri/src/assets.rs::resolve_link_impl` supports anchor/document/image/blocked/unsupported/missing; HTML and arbitrary files return unsupported. Existing single-file grants give no sibling access.
- `src/app/api.ts` has no `open_local_view`, isolated HTML surface, HTML resource broker, resource picker, DOM text/find, heading, HTML anchor/zoom, or resource diagnostics commands. No such commands were added or called in this frontend pass.
- Main Tauri CSP explicitly has `frame-src 'none'`, `style-src 'self'`, and no document network access. Both desktop platforms use the shared Tauri command host in `src-tauri/src/lib.rs`. macOS XPC is the isolated image decoder, not an alternate workspace bridge. Any new HTML engine/surface needs platform implementation and package verification; reusing the image decoder does not provide HTML navigation. Preserve both policies and all Settings restrictions. The diagram helper returns pixels and is not an interactive HTML viewer.

## Required typed native contract (proposed implementation interface)

Keep existing Markdown/image commands compatible. Implement IR-02 `open_local_view` and routing in the shared Tauri host with platform-specific isolated-surface implementations, then update `src/app/api.ts` from the actual reviewed implementation types. All commands derive caller/owner natively; renderer IDs are requests, never grants.

```ts
type LocalTarget = {fileId: string} | {rootId: string; segments: string[]};
type LocalView = {
  fileId: string; identityKey: string; diskVersion: string;
  name: string; displayPath: string;
} & ({kind: 'markdown'} | {kind: 'image'} |
     {kind: 'html'; viewToken: string; generation: number} |
     {kind: 'details'; extension: string; bytes: number; handlerName?: string});
type ResourceIssue = {id: string; declaredUrl: string;
  kind: 'stylesheet'|'image'|'font'|'embedded'|'navigation';
  reason: 'missing'|'outside_grant'|'denied'|'remote_blocked'|
          'unsupported'|'encoding'|'limit'|'changed'};
type HtmlLocation = {headingId: string|null; offset: number;
  scrollTop: number; scrollLeft: number; zoom: number};
type HtmlState = {viewToken: string; generation: number; revision: number;
  state: 'opening'|'ready'|'empty'|'failed';
  reasonCode?: string; issues: ResourceIssue[];
  headings: {key: string; authoredId: string|null; level: number; text: string}[];
  location: HtmlLocation};
```

Commands needed (names are exact proposed names, not existing capabilities):

| Command | Inputs → result / behavior |
|---|---|
| `open_local_view` | `target: LocalTarget, expectedIdentity?: string` → `LocalView`; validate current identity/type/grant; no launch. |
| `mount_html_view` | `viewToken, generation, requestId, bounds:{x,y,width,height,scale}, visible` → `HtmlState`; attach separate unprivileged native surface at document viewport; bounds validated/clamped to owning window. |
| `update_html_viewport` | token/generation/requestId/bounds/visible → acknowledgment; reposition on layout/resize/scroll; hide on tab switch, dialog/overlay, Settings transition and owner close. Native child content cannot cover app chrome or access IPC. |
| `get_html_state` | token/generation → `HtmlState`; bounded diagnostics, no invented script counts/security certification. |
| `set_html_location` | token/generation/requestId/location → actual location plus `anchor_missing` if needed; IDs preserved exactly, fragment decoded once; clamp zoom to existing viewer bounds. |
| `find_html_text` | token/generation/requestId/query/direction → visible-text match count/current match/location; no markup/style/script search. Empty headings/unsupported find return typed reason, never a fake success. |
| `reload_html_view` | token/generation/requestId/expectedDiskVersion/location → fresh `LocalView`/`HtmlState`; preserve nearest reading anchor; reset transient controls, dispose previous resources; changed identity uses existing reselection rules. |
| `resolve_local_view_link` | source token/generation/navigationId → typed fragment/local target/access-required/blocked/missing outcome; target comes from native-captured deliberate activation, not document script IPC. Reuse type-aware routing for Markdown/image sources. |
| `choose_html_resource` | token/generation/issueId → native file picker result or cancellation; grant only selected matching file; retry resource and return actual issues. |
| `choose_html_resource_folder` | token/generation → deliberate native folder picker; separate asset grant bound to view, never replace workspace root. Return canceled distinctly. |
| `dispose_html_view` | token/generation → acknowledgment; idempotent; revoke broker tokens/listeners/resource handles, terminate loading; invalidate late replies. |

Native events `html:view_state`, `html:location_changed`, `html:link_activated` carry viewToken, generation, monotonic revision and originating owner. Link events include single-use navigationId plus bounded display destination/text and source location. Workspace commits one visit only after destination succeeds; failure/cancel retains source, focus, cursor and forward branch. Native surface must forward existing app shortcuts intentionally without running document code. App-authored inspection code, if used for visible text/headings, requires proof that page scripts/handlers cannot run or acquire that channel.

Errors distinguish `invalid_grant`, `missing`, `denied`, `reselection_required`, `root_reselection_required`, `unsupported_type`, `encoding`, `html_limit`, `html_render_failed`, `anchor_missing`, `cancelled`, `stale_view`. Do not overload blocked resources as whole-document failure. Preserve existing refresh events and generation ownership. Native restore/recents must accept HTML, and refresh must re-open through the isolated path instead of returning HTML via `get_confirmed_document`.

## Isolation, resource and routing work

Use the approved separate unprivileged native WebView direction. Do not embed raw HTML in main DOM, loosen main CSP, allow `srcdoc`, add remote fetch or piggyback on Settings privileges. Document JavaScript disabled at engine level; no Tauri/XPC bridge, native message handlers, opener or main-window origin privileges. Explicitly deny all document native commands even to forged IPC. Disable remote/network protocols and service workers, frames/objects/embedded documents, form submission, downloads, popups, meta refresh and unsolicited navigation. CSS cannot cover chrome. Static SVG either uses a proven inert resource pipeline or is reported unsupported; raw SVG cannot become an executable embedded document.

Resource broker validates every HTML/CSS import, URL, font, image and redirect against the source identity and granted handles, including nested stylesheets, Unicode/percent encoding, symlinks/reparse points, root-relative/absolute/file URLs and query strings. Author `<base>` cannot widen authority. Explicit-file selection grants only that document: siblings remain unavailable until individually selected or a deliberately chosen resource folder is granted. Never auto-grant a parent. Remote references receive diagnostic-only entries with no enable/fetch action. Native network instrumentation must establish zero requests, not merely blocked script execution.

Proposed initial budgets for native owner to reconcile before implementation: document 4 MiB UTF-8; 128 resources; stylesheet 1 MiB each / 4 MiB cumulative; import depth 8 with cycle detection; fonts 8 MiB cumulative; image compressed 16 MiB each, decoded 32 MP each / 128 MiB total; all resources 64 MiB; load deadline 5 s; diagnostic URL/text 2048 units, headings 1000, visible-text index 2 MiB. Budget failures retain readable HTML where possible and provide specific issues. These are proposed bounds, not implemented or measured limits. Decoder/engine subprocess termination and resource release must be demonstrable; no unbounded main-thread parser work.

Update native picker, listing classification, native-entry/recents/session restore, filename search, resolver and refresh in the shared native host; verify platform behavior separately. HTML contents are not indexed. Filename search must first actually include HTML before UI claims it. Arbitrary linked files route to IR-03 metadata/details; they never auto-launch. Default-handler preparation/commit, executable/package exclusions and handler identity remain native/security ownership under existing October 6 authorization.

## Canonical owners and frontend continuation

Preserve approval snapshots and current Spec Kit selection (`specs/013-windows-desktop`, observed with installed prerequisite script). Native owner must use installed Spec Kit to create/reconcile the concrete HTML feature, not hand-write new feature infrastructure. Amend owning `spec.md`/`plan.md`/`tasks.md`/verification artifacts for:

- `specs/001-workspace-reader`: grants, type classification, picker/tree/native entry and local routing.
- `specs/004-restore-workspace-session`: typed HTML identity/location/zoom restore; old records remain readable; no form persistence or dirty state.
- `specs/005-external-change-refresh`: HTML/resource changes, replacement/reselection, retained anchor and stale cancellation.
- `specs/006-view-local-images`: embedded image decode/grant isolation without changing standalone image behavior.
- `specs/009-folder-search`: HTML names only; contents stay Markdown, explicit coverage text.
- `specs/010-recent-items`, `specs/012-macos-delivery`, `specs/013-windows-desktop`: type/transport support and platform-specific evidence.

Frontend continuation after real native delivery: typed HTML tab variant with descriptor/token only; mount/hide/dispose lifecycle; actual authored-CSS viewport; permanent mode metadata; Outline/visible-text Find; details/resources panel and file/folder selection flow; refresh/pinch/location adapters; type-aware link menus and successful-only shared history integration. Keep Markdown editor/recovery strictly separate. Until then the implemented fallback remains explicit and no functioning HTML support is claimed.

## Acceptance to unblock integration

Use disposable generated corpus under `tests/fixtures/html-view` copied to temporary root; generator adds licensed existing font and tiny PNG. Test selected-folder grants vs explicit-file-only selection, selected resource file vs selected resource folder, revoked/missing/denied/replaced resources, imports/fonts/SVG/CSS URL references and remote network probes. Test inline/external/module scripts, event handlers, executable links, frames/srcdoc/object/embed, forms/download/meta/base/top navigation and direct forged IPC. Both engine settings and observed zero execution/network/IPC are required.

Then exercise actual packaged macOS and supported Windows separately: picker/tree/native entries/recents/restore; authored light/dark and unstyled page; HTML→Markdown→image→details; fragments including percent-encoded/missing IDs; access cancel/denial/source focus; Back/Forward/branching/closed visits; refresh/resources/nearest anchor; viewer zoom/viewport media queries; unrelated dirty Markdown draft/recovery, image reload, Settings; EN/ES, narrow/200%, keyboard and screen reader. Capture candidate hashes, platform/runtime, network/process evidence and real screenshots. All HTML rendering/resource/link/zoom/native security checks remain NOT TESTED in this frontend pass.
