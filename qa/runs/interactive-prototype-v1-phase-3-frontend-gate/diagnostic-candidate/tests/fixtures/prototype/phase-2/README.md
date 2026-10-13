# Production Phase 2 contract fixtures

This corpus is independent of the disposable POC implementation. The representative
source is a small synthetic contract exercise, not production-ready authored content.
Its authoring inputs are /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative/.
The generated artifact is /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative-v1.igproto.
It covers NAVIGATE, BACK, OPEN_OVERLAY, CLOSE_OVERLAY, TOGGLE, INSTANT, DISSOLVE,
three scenes, repeated scene-scoped back-button markers, live Arial text, gradients,
clipping, transforms/shadow primitives and a local static PNG.

The minimal native visual was freshly authored/exported through the existing pinned
VectorCraft CLI; preserved inputs are /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/minimal/.
The authoring transcript is /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/vectorcraft-export.json.
Each export root includes export.source.json, the export-time canonical source snapshot.

Original accepted POC SVGs are copied byte-for-byte into /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/vectorcraft-originals/
solely for production sanitizer compatibility tests. They are not the normative
production graph/package format and are not distributed inside compiled packages.
The original POC evidence is untouched. Its inert blend annotations become explicit
warnings; no shadow primitives or markers are removed.

Small malicious SVG/ZIP/target inputs live at /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/malicious/.
Rebuild them with /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/generate_attacks.py.
The Rust suites also generate purpose-specific hostile inputs in memory, with
fresh manifest integrity data so checks reach the intended visual/resource stage.
