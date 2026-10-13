# Packaged four-screen native player POC

**EXPERIMENTAL RESULT:** the VectorCraft-authored `.igproto` loads, renders and completes the requested six-click flow on macOS arm64 using Intentgrove's actual WKWebView native-surface implementation in a disposable host. This is the accepted second experiment, not a new architecture investigation or production feature.

**Recommendation: GO TO PLANNING. Overall feasibility: HIGH for the tested bounded macOS visual profile.** Visual fidelity and security are PARTIAL as detailed below. No production implementation approval is inferred.

## Tested boundary

VectorCraft at `67943857311d820c2bf08eded9ff80683393d254` → scene-scoped custom `data-prototype-id` → private compiler → declarative graph → ZIP `.igproto` → isolated native player. No VectorCraft changes. Existing investigation conclusions remain the baseline.

**FACT:** implementation lives at [/Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc](/Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc). Actual Intentgrove source [/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/html_surface.m](/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/html_surface.m) is copied at build time into the experiment with exactly two policy changes: enable JavaScript callbacks and add `allow-scripts` to the sandbox. The `script-src 'none'` policy, native network content blocker, private scheme, navigation denial, nonpersistent store and absence of a Tauri bridge remain. Only fixed trusted player code is evaluated in the isolated client world. Exact diff: [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/native-policy.diff](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/native-policy.diff).

**EXPERIMENTAL RESULT:** 26 runtime assertions, six real native clicks (`isTrusted: true`), 23 adversarial/compiler checks, four quantified source/render comparisons, target retention and actual compiler duplicate rejection passed. Reset screenshot equals initial Login byte for byte. See [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/interaction-results.md](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/interaction-results.md), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/security-results.md](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/security-results.md), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/fidelity-results.md](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/fidelity-results.md) and [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/identity-package-results.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/identity-package-results.json).

**UNKNOWN / NOT TESTED:** full Intentgrove Tauri shell/tab/file-association integration, packaged shipping application UX, Windows/WebView2, alternate fonts/effects, accessibility, stacked overlays beyond the one required overlay, long histories and stress/fuzz/security review. Standalone native hosting was explicitly permitted by the accepted POC plan. This POC validates the native rendering surface, not production document registration.

## Reproduce

Commands use local sources; no install/clone/commit/push/deploy:

```sh
python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/author.py
python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/package.py /Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence
bash /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/build.sh
python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/security.py
python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/test_runtime.py
python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/independence.py
python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/fidelity.py
```

These scripts write disposable fixtures/evidence at [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence). Native windows are task-owned and closed by the controllers. Source artifact: [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/four-scenes.vectorcraft](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/four-scenes.vectorcraft). Portable artifact: [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/four-scenes.igproto](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/four-scenes.igproto). Source/native screenshots and diff maps are retained, indexed at [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/README.md](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/README.md).

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
