# Markdown default-app opt-in — F005 amendment

Status: DRAFT FOR REVIEW. Requested 2026-10-10. This extends the accepted current version; historical acceptance remains unchanged.

## Requested outcome

The user asks: “can we implement a feature where when we open intentgroove, it asks for permissions to be the default app to open md files and use a script to do it?”

Offer Intentgrove as the default Markdown app on its first eligible packaged macOS launch, and provide a script to invoke the same consent flow later. Default scope is `.md` and `.markdown`, consistent with existing Markdown support.

## Behavior and acceptance

- **F005-D01:** After the main window is ready, check actual Markdown associations. If this exact bundled app already handles both extensions, show no onboarding prompt. If status cannot be determined safely, leave associations alone and show a recoverable explanation when explicitly requested.
- **F005-D02:** On the first eligible launch that needs the change, present the native prompt described in design.md. No association write occurs before Make Default. Not Now, Escape, closing the prompt, or system consent denial preserve the current default.
- **F005-D03:** Remember that the launch prompt was answered in this app's private preferences. Do not nag on subsequent launches, OS denial, or a later user switch to another default. A failed preference write must not lead to repeat prompts within the same process; report the persistence limit truthfully.
- **F005-D04:** Make Default requests Markdown-only changes through Apple's NSWorkspace API and honors its asynchronous system consent. Query the actual defaults afterward; report success only when this app handles both extensions. Report denial, error or partial success precisely, without silently rolling back user choices.
- **F005-D05:** Ship `scripts/set-default-markdown.sh` as the repeatable entry point. It invokes a consent-only app command; it cannot silently set defaults, edit Launch Services preference files, use sudo, or bypass system consent. Calling it while the workspace is running must not create a second workspace or load/write workspace/session state.
- **F005-D06:** Resolve the running packaged app's own bundle URL and identity rather than a hardcoded developer path or app display name. Reject unbundled dev/test/QA/probe candidates; no startup prompts or default writes in acceptance harnesses. No HTML, plain-text, image, URL or terminal associations change.
- **F005-D07:** Support EN/ES, keyboard choices, accessible native controls, light/dark appearance, and a nonblocking asynchronous request. Preserve document opening, recovery, unsaved edits and queued native entries.

## Acceptance scenarios

1. Packaged app with another Markdown default: first eligible launch offers the choice; Not Now leaves actual associations unchanged; relaunch does not ask again.
2. Make Default plus OS consent: both Markdown extensions resolve to this exact app; Finder and `open` deliver exact disposable files on cold/warm launches. Original bytes remain identical.
3. OS denial/error/partial change: no success claim; ordinary workspace remains usable; a later script invocation offers another explicit attempt.
4. Existing default: no launch prompt. User changes default later: no unsolicited reassignment or renewed onboarding.
5. Script with a path containing spaces: consent flow targets the supplied bundle, leaves live workspace/session state alone, returns truthful success/cancel/failure status.
6. Unbundled/QA/probe/Windows: feature unavailable, no association writes or onboarding side effects.

Terminal Cmd-click follows the terminal's own file-link rules and default-app configuration. This feature does not change terminal preferences or promise that every terminal recognizes paths.
