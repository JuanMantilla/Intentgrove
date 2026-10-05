# Appearance model

| Entity | Fields | Rules |
|---|---|---|
| Preference record | schema: 1; mode: system/light/dark | Maximum 256 serialized characters; enum validated; absent/invalid/unreadable becomes System. Contains no paths or document content. |
| Resolved appearance | light/dark | Explicit preference wins; System follows effective native appearance after clearing any override. |
| Controller state | preference, resolved, persistence warning, native warning, update sequence | Warnings are nonmodal; stale native completions cannot override a newer choice. |
| Editor appearance compartment | darkTheme facet | Only appearance is reconfigured; session, document, selection, undo and scroll remain intact. |

Storage is app-owned WebView localStorage. No schema migration is needed for a new key; future unknown schema versions fall back to System without deleting unrelated preferences. Switching theme does not become a Markdown edit or a recovery checkpoint.
