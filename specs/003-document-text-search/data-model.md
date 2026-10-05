# F003S data model

| Entity | Fields and invariants |
|---|---|
| Display generation | Tab ID, document version/draft revision, mode and monotonic generation. Results are valid only for this generation. |
| Find session | Open flag, query, normalized query, active ordinal and prior focus. Ephemeral; destroyed on tab switch/close. |
| Text span | Search-string UTF-16 offsets mapped to exact DOM text-node offsets, or CodeMirror source offsets. No path or write capability. |
| Match set | Ordered spans, exact total, current ordinal and `entry/ready/zero/indexing/unavailable` status. Incomplete indexing cannot claim a complete total. |

Case-insensitive matching preserves accents. Test composed/decomposed accents and surrogate pairs where normalization changes string length. Stale generations cannot paint, navigate or announce.
