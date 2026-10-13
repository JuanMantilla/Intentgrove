# Experimental `.igproto` v1

**FACT (implementation):** [/Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/package.py](/Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/package.py) compiles [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/four-scenes.vectorcraft](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/four-scenes.vectorcraft)'s actual VectorCraft SVG exports and validates them before ZIP creation. Structure:

```text
manifest.json
prototype.json
scenes/login.svg
scenes/dashboard.svg
scenes/settings.svg
scenes/profile-overlay.svg
assets/<sha256>.png
```

Manifest: `{"format":"intentgrove-prototype","version":1}`; integer version required. Graph keys: `entry`, `scenes` (scene→entry map), `interactions`. Binding keys: `scene`, `target`, `trigger`, `action`, `transition`. Actions: `NAVIGATE`/`OPEN_OVERLAY` with `scene`; `CLOSE_OVERLAY`/`BACK` with no argument; `TOGGLE` with local `target`. Only `CLICK`, `INSTANT`, `DISSOLVE`. Closed key sets reject scripting fields/unknown actions.

**FACT:** 4 MiB package/member cap, 16 MiB expanded total, 32 ZIP entries, 8 scenes, 64 bindings, 10,000 SVG-node/40-depth limits, 2048² PNG pixel cap. No ZIP extraction: entries stay in memory. Reject unsafe paths, symlinks/encryption, duplicate entries/JSON keys, unsupported compression, unknown members, missing scenes/targets, duplicate scene entries and malformed local fragment references. Input reads stop at cap+1. PNG signature/dimensions checked; complete decoder hardening remains UNKNOWN.

**EXPERIMENTAL RESULT:** actual compilation rejects duplicate `login-button` before package creation: [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/identity-package-results.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/identity-package-results.json), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/compiler-duplicate-input](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/compiler-duplicate-input). Same marker such as `image-probe` is permitted across disjoint scenes. IDs listed in that evidence survive the export/sanitation/package/runtime path. Native NodeIds appear only in the authoring MCP commands, never in graph bindings; generated SVG IDs serve only SVG resource references.

The compiler extracts VectorCraft's embedded original PNG into a content-addressed package member; runtime SVG refers to that member. Sanitation removes non-rendering `data-vc-blend` metadata, preserves XML whitespace and the permitted prototype markers. Visual coordinates/text/paint/transforms/filters/clip definitions stay declarative. Only the controlled native asset broker serves image bytes.

**INFERENCE:** this is a useful versioned boundary, not a permanently frozen schema, general scripting language or production package specification. Asset quotas, font support, internal SVG fragment namespaces and migrations need production planning.
