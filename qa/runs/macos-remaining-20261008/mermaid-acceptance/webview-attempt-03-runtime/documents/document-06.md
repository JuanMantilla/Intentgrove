---
x: !!js/function forbidden
---
# Before 6

Readable before

```mermaid
flowchart LR
A["<svg onload=alert(1)>"]
```

# After 6

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