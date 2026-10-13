---
a: &a [*a]
---
# Before 3

Readable before

```mermaid
%%{init: {'securityLevel':'loose'}}%%
flowchart LR
A-->B
```

# After 3

Readable after

```mermaid
flowchart LR
Safe-->Sibling
```

```javascript
window.__hostileExecuted=true; fetch("https://127.0.0.1:9/code")
```

<script>window.__hostileExecuted=true</script>

![remote](https://127.0.0.1:9/image)

![svg](file:///private/tmp/blocked.svg)