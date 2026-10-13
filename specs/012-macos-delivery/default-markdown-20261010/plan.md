# Implementation plan

Status: DRAFT FOR REVIEW. Primary role: os-senior-expert, PLAN. No production changes yet.

## Authority and integration

The 2026-10-06 default-handler authorization in docs/approvals.md permits the underlying OS action and delegates routine architecture within that scope. The new launch prompt expands the experience; obtain approval for this exact spec/design/plan before production implementation under AGENTS.md. The present request authorizes preparing these artifacts, not fabricating prior review. Do not change this machine's defaults as an implementation test.

Canonical owner: F005 / specs/012-macos-delivery. Spec Kit prerequisite resolution was run with SPECIFY_FEATURE_DIRECTORY=specs/012-macos-delivery and SPECIFY_FEATURE_NO_PERSIST=1; global feature selection remains 013-windows-desktop.

## Native implementation

Add a focused macOS Objective-C bridge and a small Rust wrapper using the repository's existing build.rs clang/static-library integration. AppKit NSWorkspace supports setDefaultApplicationAtURL:toOpenContentType:completionHandler: and URLForApplicationToOpenContentType: on macOS 12+, within current minimum deployment target 14. Use the currently running bundle URL for the target.

Resolve UTType for `.md` and `.markdown`; declare imported Markdown type net.daringfireball.markdown conforming to public.plain-text with both extensions if needed. The currently generated bundle groups Markdown and HTML with LSItemContentTypes public.html; split the file associations and explicitly declare Markdown content types. Never set defaults for public.text, public.plain-text, public.html, a dynamic unknown type, or a broad fallback. Deduplicate identical specific Markdown types; retain per-extension verification.

Implement a main-thread consent coordinator: status check → native app prompt → user response → asynchronous NSWorkspace requests → re-query → accurate final result. Restrict entry to the actual production app bundle, with no arbitrary target app IDs, file paths from document content, or renderer-controlled type identifiers. Disable in QA/probe/unbundled runs. Persist the one-time answered marker independently of session/grant/draft state using app-private preferences; preserve existing settings formats. Keep operations serialized and main-thread-safe.

Invoke the startup check after main window creation and pending restoration/native-entry UI settles. Present a native sheet only when no other sheet/modal is active. Recheck readiness rather than blocking startup or opening overlapping prompts. During asynchronous requests preserve the normal workspace and its lifecycle guards.

## Script contract

Add a private CLI flag `--request-default-markdown` handled before Tauri workspace initialization. It starts only the consent coordinator/native event loop, reads language/prompt preferences as needed, and never opens the workspace, initializes WebView, or loads session/draft storage. OS consent cancellation is an observed result. Protect against treating this private flag as a document path or accepting unrelated commands.

`scripts/set-default-markdown.sh [path-to-Intentgrove.app]` defaults to /Applications/Intentgrove.app. Quote literal arguments, verify a real bundle and its expected executable/identity, read CFBundleExecutable using /usr/libexec/PlistBuddy, and invoke that executable with the private flag. No eval, AppleScript UI clicking, defaults write, lsregister force, sudo, third-party utility or development toolchain dependency. The change is performed by the bundled native app through Apple's supported API; the script is the repeatable invocation layer.

## Validation and tasks

- T-D01: implement read-only association classification and bundle eligibility; test narrow Markdown types versus forbidden broad/HTML types.
- T-D02: implement request coordinator with injected workspace adapter; verify no write on Not Now/Escape/already-default/ineligible, asynchronous denial/error/partial outcomes, duplicate types and requery mismatch.
- T-D03: integrate first-launch gating, durable dismissal and deferred sheet; verify no interception of restore/dirty-work/native-entry flows and no repeated prompt.
- T-D04: add isolated consent-only CLI/script; test argument quoting, invalid bundle, expected exit status, and no workspace initialization.
- T-D05: correct packaged association declarations; inspect generated Info.plist and strict local signatures after build.
- T-D06: use disposable test-type associations or an isolated account for real write verification. Record prior handlers and restore under the test's scope. Do not change real Markdown defaults without a separate actual user choice in the shipped prompt. Mark real Markdown OS-consent behavior NOT TESTED if unavailable.
- T-D07: native keyboard/VoiceOver, EN/ES, light/dark, existing-default and cold/warm file-open matrix; report exact platform/build and limits.

No dependency, privilege, deployment-target, release credential, publication, installation or commit/push changes planned. App-private prompt persistence is separate from source documents. Preserve all existing dirty work and historical approval/evidence artifacts.

## Primary source

Apple NSWorkspace documentation: https://developer.apple.com/documentation/appkit/nsworkspace/setdefaultapplication(at:toopen:completion:)
Local SDK: AppKit.framework/Headers/NSWorkspace.h confirms macOS 12 availability, asynchronous completion and system consent when required. Installed Tauri CLI config.schema.json confirms fileAssociations.contentTypes and macOS.infoPlist support.
