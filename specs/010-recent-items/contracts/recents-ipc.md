# F003R recents contract

Native `list_recent_items()` returns display metadata/status only. `open_recent_item(entryId)` validates prior native selection identity and issues a fresh scoped grant or a typed `reselect_required` state; `reselect_recent_item(entryId)` uses the native picker. `remove_recent_item(entryId)` and `clear_recent_items(confirmed)` alter only recents metadata after durable acknowledgment. Renderer cannot supply storage paths or delete documents/drafts. F003C session clearing is a separate operation.
