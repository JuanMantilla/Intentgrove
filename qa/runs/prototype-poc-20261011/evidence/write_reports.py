from pathlib import Path
import json,datetime,hashlib,subprocess
R=Path('/Users/juanmantilla/projects/personal');D=R/'.agents/investigations/vectorcraft-intentgrove-prototype/poc';E=D/'evidence';C=R/'md-reader/experimental/prototype-poc';Q=R/'md-reader/qa/runs/prototype-poc-20261011'
def link(p):return f'[{p}]({p})'
def code(n):return link(C/n)
def ev(n):return link(E/n)
def write(n,s):(D/n).write_text(s.strip()+'\n')
perf=json.loads((E/'performance.json').read_text());metrics=json.loads((E/'fidelity-metrics.json').read_text())
write('README.md',f'''# Packaged four-screen native player POC

**EXPERIMENTAL RESULT:** the VectorCraft-authored `.igproto` loads, renders and completes the requested six-click flow on macOS arm64 using Intentgrove's actual WKWebView native-surface implementation in a disposable host. This is the accepted second experiment, not a new architecture investigation or production feature.

**Recommendation: GO TO PLANNING. Overall feasibility: HIGH for the tested bounded macOS visual profile.** Visual fidelity and security are PARTIAL as detailed below. No production implementation approval is inferred.

## Tested boundary

VectorCraft at `67943857311d820c2bf08eded9ff80683393d254` → scene-scoped custom `data-prototype-id` → private compiler → declarative graph → ZIP `.igproto` → isolated native player. No VectorCraft changes. Existing investigation conclusions remain the baseline.

**FACT:** implementation lives at {link(C)}. Actual Intentgrove source {link(R/'md-reader/src-tauri/src/html_surface.m')} is copied at build time into the experiment with exactly two policy changes: enable JavaScript callbacks and add `allow-scripts` to the sandbox. The `script-src 'none'` policy, native network content blocker, private scheme, navigation denial, nonpersistent store and absence of a Tauri bridge remain. Only fixed trusted player code is evaluated in the isolated client world. Exact diff: {ev('native-policy.diff')}.

**EXPERIMENTAL RESULT:** 26 runtime assertions, six real native clicks (`isTrusted: true`), 23 adversarial/compiler checks, four quantified source/render comparisons, target retention and actual compiler duplicate rejection passed. Reset screenshot equals initial Login byte for byte. See {link(D/'interaction-results.md')}, {link(D/'security-results.md')}, {link(D/'fidelity-results.md')} and {ev('identity-package-results.json')}.

**UNKNOWN / NOT TESTED:** full Intentgrove Tauri shell/tab/file-association integration, packaged shipping application UX, Windows/WebView2, alternate fonts/effects, accessibility, stacked overlays beyond the one required overlay, long histories and stress/fuzz/security review. Standalone native hosting was explicitly permitted by the accepted POC plan. This POC validates the native rendering surface, not production document registration.

## Reproduce

Commands use local sources; no install/clone/commit/push/deploy:

```sh
python3 -B {C/'author.py'}
python3 -B {C/'package.py'} {E}
bash {C/'build.sh'}
python3 -B {C/'security.py'}
python3 -B {C/'test_runtime.py'}
python3 -B {C/'independence.py'}
python3 -B {C/'fidelity.py'}
```

These scripts write disposable fixtures/evidence at {link(E)}. Native windows are task-owned and closed by the controllers. Source artifact: {ev('four-scenes.vectorcraft')}. Portable artifact: {ev('four-scenes.igproto')}. Source/native screenshots and diff maps are retained, indexed at {link(E/'README.md')}.

## Carry forward / discard

**INFERENCE:** carry forward custom scene-scoped identity, authoring-only VectorCraft, exported visual data plus private declarative semantics, versioned ZIP boundary, validate-before-render, package-only asset authority, isolated native surface, finite actions, separate history/overlay/local state, deterministic reset and explicit agent operations. Retain exporter contract and representative malicious/fidelity/interaction corpora as future regression inputs.

Disposable: Python compiler/reader and stdio controller, Objective-C host and generated native policy variant, test-only probe functions, fixed 390×844 scenes, hardcoded token, visual styling/overlay geometry, timing waits and experimental schema details. None is a production implementation. Plan the private Rust package service, reviewed dedicated player policy, resource lifecycle/identity grants, native error handling, internal SVG-fragment namespace isolation, fonts, accessibility, platform coverage and app integration before implementation. The experimental schema is not frozen.

## Identity/export contract

PASS

## Package validation

PASS

## SVG sanitization

PASS

## Native runtime rendering

PASS — actual Intentgrove native-surface code, disposable player policy/host; full app shell NOT TESTED.

## Visual fidelity

PARTIAL — heavier text rasterization and small image/clip/effect edge differences; no observed missing visual or material layout loss in this corpus.

## Navigation

PASS

## Overlay

PASS

## Local state

PASS

## Back stack

PASS

## Transition

PASS — 100 ms DISSOLVE; no Smart Animate.

## Programmatic agent control

PASS

## Runtime independence from VectorCraft

PASS

## Security model

PARTIAL — required attacks rejected/blocked; bounded prototype, not production assurance.

## Overall feasibility after POC

HIGH — constrained macOS profile only.

## Recommendation

GO TO PLANNING — carry the contracts above; discard the POC implementation.
''')
write('package-format.md',f'''# Experimental `.igproto` v1

**FACT (implementation):** {code('package.py')} compiles {ev('four-scenes.vectorcraft')}'s actual VectorCraft SVG exports and validates them before ZIP creation. Structure:

```text
manifest.json
prototype.json
scenes/login.svg
scenes/dashboard.svg
scenes/settings.svg
scenes/profile-overlay.svg
assets/<sha256>.png
```

Manifest: `{{"format":"intentgrove-prototype","version":1}}`; integer version required. Graph keys: `entry`, `scenes` (scene→entry map), `interactions`. Binding keys: `scene`, `target`, `trigger`, `action`, `transition`. Actions: `NAVIGATE`/`OPEN_OVERLAY` with `scene`; `CLOSE_OVERLAY`/`BACK` with no argument; `TOGGLE` with local `target`. Only `CLICK`, `INSTANT`, `DISSOLVE`. Closed key sets reject scripting fields/unknown actions.

**FACT:** 4 MiB package/member cap, 16 MiB expanded total, 32 ZIP entries, 8 scenes, 64 bindings, 10,000 SVG-node/40-depth limits, 2048² PNG pixel cap. No ZIP extraction: entries stay in memory. Reject unsafe paths, symlinks/encryption, duplicate entries/JSON keys, unsupported compression, unknown members, missing scenes/targets, duplicate scene entries and malformed local fragment references. Input reads stop at cap+1. PNG signature/dimensions checked; complete decoder hardening remains UNKNOWN.

**EXPERIMENTAL RESULT:** actual compilation rejects duplicate `login-button` before package creation: {ev('identity-package-results.json')}, {link(E/'compiler-duplicate-input')}. Same marker such as `image-probe` is permitted across disjoint scenes. IDs listed in that evidence survive the export/sanitation/package/runtime path. Native NodeIds appear only in the authoring MCP commands, never in graph bindings; generated SVG IDs serve only SVG resource references.

The compiler extracts VectorCraft's embedded original PNG into a content-addressed package member; runtime SVG refers to that member. Sanitation removes non-rendering `data-vc-blend` metadata, preserves XML whitespace and the permitted prototype markers. Visual coordinates/text/paint/transforms/filters/clip definitions stay declarative. Only the controlled native asset broker serves image bytes.

**INFERENCE:** this is a useful versioned boundary, not a permanently frozen schema, general scripting language or production package specification. Asset quotas, font support, internal SVG fragment namespaces and migrations need production planning.
''')
write('runtime.md',f'''# Disposable native runtime

**FACT:** {code('build.sh')} generates a policy-only variant of {link(R/'md-reader/src-tauri/src/html_surface.m')} and the same trusted inspection include generated by Intentgrove's build. Source implementation, Cocoa/WebKit frameworks and system WebKit renderer are real Intentgrove runtime paths. Native-policy diff and toolchain evidence: {ev('native-policy.diff')}, {ev('build.log')}, {ev('provenance.json')}. Neither the production HTML viewer nor VectorCraft is modified.

**FACT:** {code('control.py')} validates `.igproto` via {code('package.py')} before sending sanitized visual data and graph to {code('host.m')}. The broker holds validated package bytes in memory, serves only exact `ig-html://poc/index.html` and declared PNG keys, denies escapes and never extracts ZIP entries or exposes filesystem URLs. A dedicated WKWebView uses a nonpersistent store with navigation/window/media denial, network/file content rules and script-blocking CSP. No Tauri IPC or package-provided JS.

{code('player.js')} is fixed trusted code installed only through the native client world. SVG is inline DOM. The event handler resolves the nearest custom marker, its scene and CLICK; only the active base scene/top overlay can execute a binding. The controller asks the rendered target's bounds, confirms `elementFromPoint`, then delivers native mouse-down/up to WebKit; tests never invoke graph actions directly.

**FACT:** base scene, history (max 32), overlay stack (max 8) and local visibility are independent arrays/maps. NAVIGATE pushes base history; BACK pops; overlay open/close pushes/pops; TOGGLE overrides that scene's targeted group's display. Reset re-renders entry with empty history/overlays/local/trace. DISSOLVE is a 100 ms fade-in of the new surface, not Smart Animate or correspondence-based interpolation.

**EXPERIMENTAL RESULT:** initial script-free HTML policy suppresses player event callbacks, even when trusted evaluation can create the visuals. The generated POC policy enables callbacks (`allowsContentJavaScript=YES`, sandbox `allow-scripts`) while retaining `script-src 'none'`. Native clicks and the adversarial script probe pass together: {ev('control-trace.json')}, {ev('native-security-probe.json')}. Production needs a separate reviewed player policy; do not relax production HTML viewing.

Early failures/fixes: script-free policy prevented clicks; clearing CSS display failed to reveal an exported `display="none"` group, fixed with explicit `inline`; a sandbox independence run intermittently missed native event delivery, so the controller explicitly foregrounds/focuses its task-owned window before clicking. Final native and denied-source runs pass. No VectorCraft fix was required. Snapshot attempts outside the canonical task root or reusing snapshot paths were rejected; final immutable baseline is {link(Q/'tested-snapshot-v5.json')}.

**UNKNOWN:** shipping shell integration, file grants/generation/stale callbacks, UI/AT, Windows and heavy SVG workloads are not established by this standalone-host POC.
''')
write('security-results.md',f'''# Security results

**EXPERIMENTAL RESULT — required probes PASS:** {code('security.py')} uses the same package reader as `prototype.open`. {ev('security-results.json')} records 23 rejections, with preserved malicious `.igproto` inputs. Script elements, onclick, network/external-file images, javascript URLs, external CSS URLs, escaped CSS URLs, entry/asset traversal, encoded traversal, missing scene/target references, duplicate prototype IDs, foreignObject, SVG animation, XML entities/DTD, executable package members/actions, bad/boolean versions, duplicate JSON keys and expansion-limit input all reject.

**EXPERIMENTAL RESULT:** {code('test_runtime.py')} also exercises the actual native runtime. A fixed QA probe inserts a script and an HTTP image after rendering; page-world inspection reports `scriptExecuted=false`, no player object or Tauri bridge. Client world has no WebKit message handler/Tauri bridge. The listening local HTTP server observes zero requests. Native broker directly rejects traversal, encoded traversal and file URL requests. Evidence: {ev('native-security-probe.json')}, {ev('broker-log.json')}. This establishes the combined policy; it does not isolate the contribution of CSP versus the content blocker.

**FACT:** {code('package.py')} is allowlist-based and fail-closed; untrusted SVG is never inserted before validation. Image bytes are exclusively package-broker resources. Runtime-only fixture has no authoring source, library/editor runtime or package executable code. Fixed player/probe JavaScript belongs to the trusted application, never the ZIP.

**Result: PARTIAL security model.** All requested attack classes are demonstrated. **UNKNOWN:** decoder vulnerabilities, exhaustive SVG/CSS/filter resource exhaustion, fuzzing, complete parser/dependency review, native sandboxing/entitlements, production grant lifecycle and platform-specific security. The host/controller are disposable development tooling with host filesystem authority; this is not a production assurance claim. Limits/closed interfaces are useful contracts to carry forward, and a reviewed dedicated native policy remains a planning gate.
''')
rows='\n'.join(f"| {r['scene']} | {r['metrics']['whole']['meanAbsoluteRgbError']} | {r['metrics']['whole']['pixelsWithChannelDeltaAtLeast8Pct']}% |" for r in metrics)
write('fidelity-results.md',f'''# Visual fidelity

**EXPERIMENTAL RESULT: PARTIAL.** All four scenes use actual VectorCraft-generated art. {code('author.py')} drives the pinned headless MCP; native source {ev('four-scenes.vectorcraft')}, MCP transcript {ev('author-mcp.json')}, VectorCraft raster screenshots, original SVG exports, sanitized SVGs and actual WKWebView PNGs are retained. No hand-created final SVG substitute.

Pipeline for every scene: saved VectorCraft source → VectorCraft `screenshot` render → `document.export` SVG → private sanitizer/compiler → validated package → Intentgrove native-surface variant → WebKit snapshot. {code('fidelity.py')} reopens four derived entry-scene packages through the actual open/validation/control interface to capture each unchanged scene at 100%, including Profile outside the overlay transform. It does not set runtime scene state directly. Normal overlay presentation is separately captured at 90% with backdrop and shadow.

The agent inspected all five required actual runtime screenshots, all four VectorCraft references, the four 100% runtime captures and amplified difference maps. Regions are predefined; comparison decodes identical 390×844 RGBA8 PNGs, measures absolute RGB differences, and counts pixels with any channel delta ≥8. This is a descriptive observation, not a preapproved numerical acceptance threshold.

| Scene | Whole-scene mean RGB error (0–255) | Pixels with channel delta ≥8 |
|---|---:|---:|
{rows}

Evidence/rectangles: {ev('fidelity-metrics.json')}; native open/snapshot trace: {ev('fidelity-control-trace.json')}; glyph measurements: {ev('typography-bounds.json')}.

- **Typography:** Arial live text is visibly heavier in WebKit. The common `Arial 16: Aa 0123` probe has source ink bounds `[28,654,149,665]` versus native `[28,653,150,665]`; dark-pixel count rises 286→362 (26.6%, threshold max RGB<120). Heading bounds differ at most one pixel at the left/right edges, or match for Profile. Typography probe region MAE 3.4209, 6.8122% pixels Δ≥8, max channel difference 204. No missing text or changed line wrapping in this corpus. **INFERENCE:** renderer/font rasterization contributes; these tests do not isolate native export versus WebKit font rendering as the sole cause.
- **Gradients:** interior rectangle `[200,120,280,145]` MAE 0.2995, maximum channel difference 1; no Δ≥8 pixels. Correct orientation/stops and no banding observed.
- **Clipping:** rounded image boundary preserved, no overflow; crop region MAE 0.1965, 0.6736% Δ≥8, maximum 45 at raster edges.
- **Images:** original checker asset is present through the controlled broker. Interior region MAE 0.2426, maximum 5, zero Δ≥8 pixels; interpolation differences at checker boundaries are visible in the diff map.
- **Effects:** shadow remains below/right of the green shape; effect region MAE 0.3967, 0.3818% Δ≥8, maximum 23. Small blur/compositing edge differences; not pixel-identical. No unsupported effect is claimed tested.
- **Transforms:** the orange sheared object keeps its placement/outline; region MAE 0.0409, 0.4167% Δ≥8, maximum 24 at edges. Export may bake transformed path coordinates, which is allowed visual data.
- **Hidden groups:** red HIDDEN group remains absent; region `[20,730,140,790]` is pixel-identical (MAE/max 0). Dashboard menu starts absent and becomes visible after the real native click.
- **Prototype targets:** visible controls have correct geometry and real hit-testing succeeds. Hidden targets remain retained but do not claim visible hit regions. Scene+marker binding uses no native/generated ID or positional selector. Retention evidence: {ev('identity-package-results.json')}.

**EXPERIMENTAL RESULT:** five required state PNGs show readable labels, complete clipping/image/effect probes, overlay contrast/close control, correct Settings/Back and visible menu. Initial Login and reset Login are byte-identical. Profile's 90% inset, backdrop and rounded container/shadow are intentional trusted-player overlay presentation, distinct from the authored scene. Full-size source comparison uses its separate 100% capture.

**INFERENCE:** fidelity is sufficient to plan a constrained native prototype player, with explicit font/raster tolerances. It is not a guarantee for arbitrary fonts, blend modes, masks, symbols or filter graphs. Internal generated SVG resource IDs must be scoped when multiple different scene/overlay instances coexist; the present shared visual-probe definitions do not prove that general case. Sanitization retained visual primitives/attributes except inert exporter metadata and package image URL normalization; exact source-to-sanitized files remain available.
''')
write('interaction-results.md',f'''# Native interaction results

**EXPERIMENTAL RESULT: PASS.** Command: `python3 -B {C/'test_runtime.py'}`. Result: 26 assertions PASS. Detailed assertions {ev('interaction-results.json')}; exact requests/state/native coordinates/transports {ev('control-trace.json')}.

| Operation through actual player | Verified result |
|---|---|
| open `.igproto` | Login, empty stacks/state |
| native click login/login-button | Dashboard; history `[login]`; DISSOLVE completes |
| native click dashboard/profile-avatar | Profile overlay on Dashboard |
| native click profile-overlay/close-button | Overlay removed; Dashboard retained |
| native click dashboard/settings-button | Settings; history `[login,dashboard]` |
| native click settings/back-button | Dashboard; history `[login]` |
| native click dashboard/menu-button | local `dashboard/menu-panel=true`; actual group visible |
| reset | Login, empty history/overlays/local/trace |

Every click resolves an authored custom marker to rendered geometry and actual `elementFromPoint`; native `NSEvent` mouse-down/up enters WebKit. All six resulting CLICK events report `isTrusted: true`. The tests never call the state machine's action functions. DOM trace records the active scene/marker/action. Reset image equals original Login exactly.

Screenshots: {ev('html-native-login.png')}, {ev('html-native-dashboard.png')}, {ev('html-native-dashboard-menu.png')}, {ev('html-native-profile-overlay.png')}, {ev('html-native-settings.png')}. Agent visual review is documented in {link(D/'fidelity-results.md')}; state assertions alone were not treated as visual proof.

**FACT:** max-8 overlay stack/max-32 back history are implemented. **UNKNOWN:** deep stacks, long sessions, gestures, keyboard/AT and input concurrency are outside this four-scene test. DISSOLVE is a 100 ms fade-in; no Smart Animate.
''')
write('agent-control.md',f'''# Small agent control surface

**FACT:** {code('control.py')} exposes an experimental line-delimited JSON interface over private stdio to a task-owned native player. No server, token installation, full MCP or shipping automation listener. Python callers use `Prototype.call`; CLI callers send one JSON object per line. The operation set is closed and has no arbitrary eval capability.

```json
{{"op":"prototype.open","path":"{E/'four-scenes.igproto'}"}}
{{"op":"prototype.click","scene":"login","target":"login-button"}}
{{"op":"prototype.current_scene"}}
{{"op":"prototype.inspect"}}
{{"op":"prototype.screenshot","path":"{E/'html-native-agent.png'}"}}
{{"op":"prototype.reset"}}
```

Run `python3 -B {C/'control.py'}`. Screenshot names must contain `html-native-` because the existing Intentgrove test-only snapshot API enforces that constraint. Current scene means the base scene; `inspect` also returns overlay stack, local visibility, history, target visibility, busy/transition trace. Click rejects inactive scenes, missing/hidden/occluded targets. Screenshot/reset/open call the real native surface. The fixed security-probe/broker-log operations are POC-only QA helpers, not future public agent API.

**EXPERIMENTAL RESULT:** {ev('control-trace.json')} and {ev('fidelity-control-trace.json')} exercise all six requested operations. Native events enter the actual player handler. **INFERENCE:** scene+prototype marker, inspectable state and native screenshot are the smallest useful future QA boundary. Production MCP/authorization/lifecycle/request cancellation remain planning work.
''')
write('performance.md',f'''# Basic POC observations

**EXPERIMENTAL RESULT:** one recorded macOS arm64 run, not a benchmark. Evidence {ev('performance.json')}, {ev('control-trace.json')}.

- Package: {perf['packageBytes']} bytes ({perf['packageBytes']/1024:.2f} KiB), four simple scene SVGs, one shared 64×64 original image.
- Open end-to-end: {perf['openEndToEndMs']:.1f} ms, including controller validation/serialization and settled load wait. Native mount/player load measurement: {perf['nativeLoadMs']:.1f} ms; includes fixed settle wait, not isolated parsing time.
- Player action timing: {[a['actionMs'] for a in perf['actions']]} ms in flow order. First NAVIGATE includes 100 ms DISSOLVE. Instant action/render dispatch is approximately 0–1 ms; these measurements are JavaScript action completion, not presentation/frame latency.
- Native click control replies are roughly 0.2–0.3 seconds because the harness explicitly focuses the window and waits for events/settling; not a scene-switch performance claim.
- Host RSS: {perf['hostBaselineRssKiB']}→{perf['hostLoadedRssKiB']} KiB (delta {perf['hostRssDeltaKiB']/1024:.1f} MiB). Baseline is immediately after spawn, so this mostly includes Cocoa/WebKit initialization. **UNKNOWN:** incremental package-only memory and shared WebKit child-process memory.

**INFERENCE:** no obvious load or scene-action blocker for the tiny tested package. Large scenes/filter graphs were not measured and these values are not performance guarantees. No optimization performed.
''')
write('independence.md',f'''# VectorCraft independence

**EXPERIMENTAL RESULT: PASS.** Command: `python3 -B {C/'independence.py'}`. Evidence {ev('independence-results.json')}, {ev('html-native-independent-dashboard-menu.png')}, {ev('lsof-native.txt')}.

The controller and native player run under a disposable macOS process sandbox denying all reads under the supplied VectorCraft checkout and an unrelated existing VectorCraft checkout path observed in process inventory, plus outbound TCP to VectorCraft's standard localhost MCP/control port 7979. A direct source-file read fails `Operation not permitted`, establishing that the deny rule is active. In the same denied environment the actual `.igproto` opens, all six native clicks pass, overlay/Back/local state pass, screenshot is saved and reset reaches Login.

The produced runtime-only ZIP contains no VectorCraft source, engine or native document. `otool -L` lists system Cocoa/WebKit/Foundation/AppKit/Objective-C libraries only. Native open-file inventory contains no VectorCraft file. Runtime sources reference no VectorCraft paths/commands/transports; only the separately executed authoring script uses the pinned CLI/MCP.

Unrelated VectorCraft CLI processes existed in other sessions and were left alone. **INFERENCE:** they are not dependencies of this player, because all available source/executable reads and the known MCP/control endpoint were denied while playback succeeded, and the finite runtime contains no calls to that project. This does not claim to have stopped other users' authoring processes or audited every systemwide filesystem access. No VectorCraft modifications, clone or runtime bundling occurred.
''')
# Evidence manifest with current hashes (excluding self-referential mutable report generation).
paths=[p for p in E.rglob('*') if p.is_file() and p.name not in ['artifact-manifest.json','write_reports.py']]
(E/'artifact-manifest.json').write_text(json.dumps({str(p):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths},indent=2))
write('evidence/README.md',f'''# POC evidence index

All paths are under {link(E)}. Prior investigation evidence is untouched.

| Major claim | Command / relevant source | Evidence / result |
|---|---|---|
| VectorCraft authors actual visuals | {code('author.py')} / pinned local MCP | {ev('author-provenance.json')}, {ev('author-mcp.json')}, {ev('four-scenes.vectorcraft')}, four `*-vectorcraft.png` references and original scene SVGs |
| compile/load identity and graph | {code('package.py')} | {ev('four-scenes.igproto')}, sanitized scene SVGs, {ev('identity-package-results.json')}; PASS |
| security corpus | {code('security.py')} | {ev('security-results.json')}, `malicious-*.igproto`, {link(E/'compiler-duplicate-input')}; PASS rejections |
| native surface/policy | {code('build.sh')}, {code('host.m')} | {ev('build.log')}, {ev('native-policy.diff')}, {ev('provenance.json')} |
| exact real-click flow | {code('test_runtime.py')}, {code('player.js')} | {ev('interaction-results.json')}, {ev('control-trace.json')}, five `html-native-*.png`; PASS |
| native script/network/broker defense | same actual host/runtime | {ev('native-security-probe.json')}, {ev('broker-log.json')}; required probes PASS, model PARTIAL |
| native visual fidelity | {code('fidelity.py')} | {ev('fidelity-metrics.json')}, {ev('typography-bounds.json')}, four entry fixtures, four `html-native-fidelity-*.png`, four `*-difference-x4.png`; PARTIAL |
| independent runtime | {code('independence.py')}, {code('independence_run.py')} | {ev('independence-results.json')}, {ev('lsof-native.txt')}, {ev('html-native-independent-dashboard-menu.png')}; PASS |
| performance | {code('test_runtime.py')} | {ev('performance.json')}; observations, not benchmark |
| immutable tested scope | {link(Q/'tested-snapshot-v5.json')} | {ev('final-tested-integrity.json')}, {ev('artifact-manifest.json')} |

FACT means source/metadata; EXPERIMENTAL RESULT means recorded behavior; INFERENCE is interpretation; UNKNOWN/NOT TESTED never implies pass. The final reports use these classifications. Earlier smoke capture is retained and labeled by filename; it is not substituted for final required state captures. Snapshot v1–v4 are superseded; v5 is the final tested baseline. All implementation and evidence are retained; acceptance is pending and no cleanup is authorized.
''')
print('Wrote POC reports')
