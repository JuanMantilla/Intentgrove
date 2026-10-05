# F003S renderer contract

No native IPC or filesystem permission is added.

`openFind(tabId, mode, generation)` focuses the query. `setQuery(query, generation)` yields entry/ready/zero/indexing/unavailable status. `moveMatch(direction, generation)` wraps and reveals one match. `closeFind(generation)` clears decoration and restores document/editor focus. `invalidateDisplay(newGeneration)` cancels old index, paint and announcement work. The editor adapter reads `EditorState.doc`, never the saved file. Errors yield localized unavailable state, without a URL fetch or write. EN/ES status announces `current of total`; the active location has non-color indication.
