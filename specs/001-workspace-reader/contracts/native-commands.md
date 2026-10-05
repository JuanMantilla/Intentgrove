# F001 native command contracts — proposed

All commands are available only to the main local application window. Invalid,
expired, or cross-scope IDs return structured errors without disclosing unrelated
path contents. File names and link text are data, never commands.

| Command | Input | Output | Authority rule |
|---|---|---|---|
| `select_root` | none | root ID, display name/path | Backend opens native folder dialog and registers the selected directory. |
| `select_file` | none | file ID, display name/path | Backend opens native file dialog; grant covers exactly that file. |
| `list_entries` | root ID, relative segment array, optional page token | entries, next token, exclusions | Each segment is validated; open child without symlink following; return a bounded page. |
| `cancel_listing` | listing token | acknowledged state | Cancels ongoing enumeration; late pages are ignored. |
| `read_document` | file ID or root ID + relative segment array | bounded UTF-8 text, file ID, identity | Reopen and validate before read; no partial success or repository writes. |
| `resolve_link` | source file ID, raw target | document/anchor/image target or blocked reason | Parse once at native boundary; never follow remote, executable, or escaping target. |
| `read_image` | source file ID, raw target | bounded raster bytes and MIME | In-root raster only; no SVG or remote URL; max size set during implementation. |

The frontend never invokes a generic path read, write, shell, web request, or
external URL opener. Dialog cancellation is a normal result. All errors have stable
codes mapped to EN/ES messages. Enumerations, reads, and images have size/time
budgets and cancellation points. Exact serialized types are frozen with the
approved implementation batch and covered by contract tests.
