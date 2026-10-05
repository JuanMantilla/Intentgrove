# F003R data model

Recent entry: native-generated ID, kind (`folder`/`document`), canonical display path, stored device/inode/type, root-relative location if applicable, last-successful-use time and recoverable status. Recents record: schema, sequence, bounded ordered entries and checksum. No document bytes or process-local grant ID is persisted. Remove/Clear changes only this record. Reopen validates identity or requires picker; a path string never grants access.
