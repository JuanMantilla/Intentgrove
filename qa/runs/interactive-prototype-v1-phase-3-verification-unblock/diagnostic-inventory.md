# Diagnostic inventory

54 emissions / 31 distinct lint locations: A=19, B=35, C=0 emissions. Library/library-test duplicates retained. Baseline/current before maintenance match exactly. All diagnostics are resolved by separate maintenance.

| Lint | File/location | Subsystem | Category | Phase3 touched | Complexity | Risk |
|---|---|---|---|---|---|---|
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:218 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:219 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:339 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:340 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| unused_imports | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/scope.rs:41 | Native scope re-exports | B | True | low | low; local idiom/test-only change |
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:218 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:219 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:339 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| clippy::redundant_field_names | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:340 | Filesystem refresh/reload | B | True | low | low; local idiom/test-only change |
| unused_imports | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/scope.rs:41 | Native scope re-exports | B | True | low | low; local idiom/test-only change |
| dead_code | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/platform/macos.rs:144 | macOS filesystem enumeration | B | True | medium | requires contract/edge-case preservation |
| dead_code | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:140 | Filesystem refresh/reload | B | True | medium | requires contract/edge-case preservation |
| dead_code | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/state.rs:314 | Filesystem grant registry | B | True | medium | requires contract/edge-case preservation |
| clippy::needless_borrow | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/assets.rs:180 | Local resource/link grants | B | True | low | low; local idiom/test-only change |
| clippy::collapsible_if | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/html_broker.rs:492 | Native HTML resource admission | B | True | low | low; local idiom/test-only change |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/editing.rs:138 | Markdown section editing/save | A | False | medium | requires contract/edge-case preservation |
| clippy::ptr_arg | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/editing.rs:520 | Markdown section editing/save | A | False | low | low; local idiom/test-only change |
| clippy::manual_range_contains | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/image.rs:138 | Native image decoder responses | A | False | low | low; local idiom/test-only change |
| clippy::manual_range_contains | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/image.rs:445 | Native image decoder responses | A | False | low | low; local idiom/test-only change |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/recovery.rs:260 | Durable editing recovery IPC | A | False | medium | requires contract/edge-case preservation |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/recovery.rs:292 | Durable editing recovery IPC | A | False | medium | requires contract/edge-case preservation |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:240 | Folder search IPC and matching | B | True | low | low; local idiom/test-only change |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:599 | Folder search IPC and matching | B | True | medium | requires contract/edge-case preservation |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:695 | Folder search IPC and matching | B | True | low | low; local idiom/test-only change |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/session.rs:218 | Workspace persistence | B | True | low | low; local idiom/test-only change |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/session.rs:222 | Workspace persistence | B | True | low | low; local idiom/test-only change |
| clippy::manual_clamp | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/settings.rs:542 | Settings window sizing/preferences | A | False | medium | requires contract/edge-case preservation |
| clippy::manual_clamp | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/settings.rs:543 | Settings window sizing/preferences | A | False | medium | requires contract/edge-case preservation |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/lib.rs:67 | Native menu IPC | B | True | medium | requires contract/edge-case preservation |
| dead_code | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs:140 | Filesystem refresh/reload | B | True | medium | requires contract/edge-case preservation |
| dead_code | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/state.rs:314 | Filesystem grant registry | B | True | medium | requires contract/edge-case preservation |
| clippy::needless_borrow | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/assets.rs:180 | Local resource/link grants | B | True | low | low; local idiom/test-only change |
| clippy::non_octal_unix_permissions | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/assets.rs:446 | Local resource/link grants | B | True | low | low; local idiom/test-only change |
| clippy::assertions_on_constants | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/default_markdown.rs:71 | Default-Markdown consent policy | A | False | low | low; local idiom/test-only change |
| clippy::collapsible_if | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/html_broker.rs:492 | Native HTML resource admission | B | True | low | low; local idiom/test-only change |
| clippy::non_octal_unix_permissions | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/html_tests.rs:433 | Native HTML regression fixtures | A | False | low | low; local idiom/test-only change |
| clippy::items_after_test_module | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/platform/macos.rs:359 | macOS filesystem enumeration | B | True | low | low; local idiom/test-only change |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/editing.rs:138 | Markdown section editing/save | A | False | medium | requires contract/edge-case preservation |
| clippy::ptr_arg | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/editing.rs:520 | Markdown section editing/save | A | False | low | low; local idiom/test-only change |
| clippy::manual_range_contains | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/image.rs:138 | Native image decoder responses | A | False | low | low; local idiom/test-only change |
| clippy::manual_range_contains | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/image.rs:445 | Native image decoder responses | A | False | low | low; local idiom/test-only change |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/recovery.rs:260 | Durable editing recovery IPC | A | False | medium | requires contract/edge-case preservation |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/recovery.rs:292 | Durable editing recovery IPC | A | False | medium | requires contract/edge-case preservation |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:240 | Folder search IPC and matching | B | True | low | low; local idiom/test-only change |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:599 | Folder search IPC and matching | B | True | medium | requires contract/edge-case preservation |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:695 | Folder search IPC and matching | B | True | low | low; local idiom/test-only change |
| clippy::uninlined_format_args | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:1180 | Folder search IPC and matching | B | True | low | low; local idiom/test-only change |
| clippy::uninlined_format_args | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/search.rs:1211 | Folder search IPC and matching | B | True | low | low; local idiom/test-only change |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/session.rs:218 | Workspace persistence | B | True | low | low; local idiom/test-only change |
| clippy::unnecessary_map_or | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/session.rs:222 | Workspace persistence | B | True | low | low; local idiom/test-only change |
| clippy::manual_clamp | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/settings.rs:542 | Settings window sizing/preferences | A | False | medium | requires contract/edge-case preservation |
| clippy::manual_clamp | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/settings.rs:543 | Settings window sizing/preferences | A | False | medium | requires contract/edge-case preservation |
| clippy::field_reassign_with_default | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/settings.rs:975 | Settings window sizing/preferences | A | False | low | low; local idiom/test-only change |
| clippy::too_many_arguments | /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/lib.rs:67 | Native menu IPC | B | True | medium | requires contract/edge-case preservation |
