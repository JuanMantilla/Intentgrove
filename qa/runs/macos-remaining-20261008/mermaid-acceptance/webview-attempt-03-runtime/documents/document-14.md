---
x: !!js/function forbidden
---
# Before 14

Readable before

```mermaid
flowchart LR
classDef x fill:red
```

# After 14

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