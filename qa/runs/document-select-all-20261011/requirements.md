# Document select-all repair

USER-AUTHORIZED: The current user requests a scoped frontend repair using the senior-frontend-developer skill. Cmd+A must select the full active document beyond the viewport; application tree/tabs/UI must remain unselected; search/rename/native text inputs must retain normal select-all; switching documents must target the newly active document. Inspect editor and keyboard ownership and use its native selection API. No material design or architecture change is requested.

Global Spec Kit resolution observed as specs/013-windows-desktop (check-prerequisites.sh --json --paths-only); this repair does not change global feature selection or implement Windows native functionality. Existing Markdown/section-editor boundaries remain.

Completion: implementation and named checks, honest platform limitations, then user review. User acceptance is PENDING; no cleanup/deletion/worker authorization.
