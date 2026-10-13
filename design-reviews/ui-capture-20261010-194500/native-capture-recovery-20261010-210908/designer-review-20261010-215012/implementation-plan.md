# Proposed minimal implementation plan

Status: PROPOSED — NOT APPROVED. REVIEW_ONLY design handoff. No application changes performed. Only confirmed issues appear below. DR-003 receives no implementation work until native validation resolves it. Prioritize by demonstrated friction; do not alter layouts, brand, dependencies or native editing transactions.

## 1. DR-001 — Search space and context

Source anchors: [/Users/juanmantilla/projects/personal/md-reader/src/app/FolderSearchPanel.tsx](/Users/juanmantilla/projects/personal/md-reader/src/app/FolderSearchPanel.tsx) (return section: query/scope, options, status and groups); [/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css](/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css) (.folder-search/.folder-search-host, .folder-search-groups; host overflow at 527 and minimum result allocation at 1120); [/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx](/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx) (Projects host integration around 3345).

Propose a compact persistent query/scope region with a separately scrollable result area. Reduce always-visible option height through an expandable secondary-options region only as necessary to fit EN/ES. Preserve every option, status state and handler. The existing 120px result allocation supports reachability, but the screenshots show it does not keep matches and query together. Do not just increase that minimum and push more controls outside view.

Validate the settled and keyboard-scrolled acceptance criteria in the final review, then pointer scrolling and state transitions. Preserve Projects header and footer, input focus and Escape/dismiss behavior. Main risk: competing nested scroll regions or hidden focus; test those directly.

## 2. DR-002 — Bound filename header

Source anchors: [/Users/juanmantilla/projects/personal/md-reader/src/app/DocumentLocation.tsx:24](/Users/juanmantilla/projects/personal/md-reader/src/app/DocumentLocation.tsx:24) renders identity and toolbar; [/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css:550](/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css:550) defines their layout, with later overrides; [/Users/juanmantilla/projects/personal/md-reader/src/app/documentIdentity.ts](/Users/juanmantilla/projects/personal/md-reader/src/app/documentIdentity.ts) provides existing tab identity helpers (identified through imports/CodeGraph; internal helper behavior was not explored).

Propose one-line suffix-preserving filename presentation at the captured normal width and retain current short-header geometry. Reuse the tab presentation principle after verifying its helper suitability. Keep full name in semantics and the existing explicit path disclosure; assess its operation before relying on it. Do not flatten toolbar ownership or widen the reading column. Use the controlled pair to verify removal of approximately 120px growth and retain readable actions. Narrow adaptation is a validation dependency, not an approved redesign.

## 3. DR-004 — Clarify modal consequences

Source anchors: [/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:3574](/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:3574) modal; [/Users/juanmantilla/projects/personal/md-reader/src/app/i18n.ts:367](/Users/juanmantilla/projects/personal/md-reader/src/app/i18n.ts:367) and [/Users/juanmantilla/projects/personal/md-reader/src/app/i18n.ts:757](/Users/juanmantilla/projects/personal/md-reader/src/app/i18n.ts:757) EN/ES close copy; [/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:2343](/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:2343) resolveClose and [/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:1441](/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:1441) saveEdit support the intended meanings. [/Users/juanmantilla/projects/personal/md-reader/src/app/api.ts:377](/Users/juanmantilla/projects/personal/md-reader/src/app/api.ts:377) and [/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/editing.rs:871](/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/editing.rs:871) are semantic references, not proposed modification targets.

Propose Save to file / Guardar archivo and brief explanation of draft retention without updating the file. Explain returning to reading only for the read trigger; audit continuation wording for tab/folder/app/window triggers before changing shared text. Preserve safe draft emphasis and all control handlers. Do not promise restart durability or change persistence architecture. Verify EN/ES fit and neutral comprehension; independently validate Save/Keep on disposable files and existing error handling before acceptance.

## 4. DR-005 — Differentiate colliding tree filenames

Source anchors: [/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:3009](/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:3009) tree rendering, name span at 3069 and title path at 3031; [/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css:225](/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css:225) .tree-name ellipsis; [/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:3428](/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:3428) existing Open documents overlay.

Propose suffix-preserving display for colliding long names, coordinated with step 2's filename treatment. Preserve complete underlying names, short labels, row height, selection cues and Open documents disclosure. Confirm explicit full identity can be reached for unopened rows; this remains a validation requirement, not a proven existing capability. Verify alpha/beta distinction at the normal width and a second supported width. Do not add a new modal or global sidebar redesign.

## Approval and acceptance boundary

Recommended order: DR-001 → DR-002 → DR-004 → DR-005. Resolve native resize capability in parallel with later validation, without treating browser evidence as native acceptance. Each fix requires scoped regression of its affected states; no full capture rerun is needed. This proposal is reviewable now; implementation starts only after explicit user approval and the applicable implementation workflow. No frontend agent was invoked.
