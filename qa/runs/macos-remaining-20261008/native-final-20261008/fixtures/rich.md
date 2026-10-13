---
title: Disposable rich acceptance
owner: QA
---
# Reading acceptance
Before diagrams. [Reference][target] and encoded footnote[^a%20b].

```json
{"highlight": true}
```

```mermaid
flowchart LR
 A[Start] --> B[End]
```

Between diagrams.

```mermaid
sequenceDiagram
 Alice->>Bob: Hello
 Bob-->>Alice: Ready
```

```mermaid
flowchart broken
```

```mermaid
%%{init: {securityLevel: "loose"}}%%
flowchart LR
 A-->B
```

After diagrams.

## Duplicate
First duplicate target.

## Duplicate
Second duplicate target.

[target]: linked.md
[^a%20b]: Encoded footnote body.
