# Remaining native acceptance — F005-D01–D07

Run on an isolated macOS account/host with a registered packaged app. Do not perform this matrix on the user's working account as an automated test. Native library and fake NSWorkspace tests do not establish the following behavior.

1. Record OS/architecture and exact app/executable hashes. Record existing `.md`, `.markdown`, HTML and plain-text handler URLs. Capture hashes of disposable Markdown files and the isolated profile's settings/session/drafts.
2. With another Markdown handler: launch the packaged app, resolve restoration/file-entry decisions, verify only one native sheet appears. Return and Escape choose Not Now; Tab reaches Make Default. Verify no association changes, no repeat on relaunch, EN/ES copy and light/dark/standard accessibility. Inspect VoiceOver if available.
3. In the isolated account, run `scripts/set-default-markdown.sh /path/to/Intentgrove.app`. Choose Make Default, honor any macOS confirmation without bypassing it. Record completion error domain/code and requery both extensions. Success requires this exact app URL for both; unchanged/unknown/partial results cannot be called success. Repeat with denial if the OS offers it. Compare HTML/text handlers unchanged.
4. While a dirty workspace is running, invoke the script. Confirm no second workspace/WebView, no settings/session/draft initialization or writes from the consent process, and that the workspace remains usable. Verify exit 0=both verified, 2=declined, 3=partial/unverified/error, 4=unavailable/invalid. Repeat from a literal bundle path with spaces.
5. Verify an already-default first launch has no prompt. Change the default externally later; subsequent startup must neither prompt nor reassign. The script remains an explicit retry.
6. Finder/Open cold and warm: open exact disposable `.md` and `.markdown` files. Preserve native-entry ordering, recovery and dirty-edit behavior. Compare file bytes and isolated data before/after. Restore the recorded handlers within this isolated account.
7. Development, acceptance-harness, html-native-probe, settings-contract-tests, unbundled and nonproduction identifiers: no prompt, preference writes or setter calls. For any otherwise production-ID probe, set `INTENTGROVE_DISABLE_DEFAULT_MARKDOWN=1` before process launch.

For disposable custom-type testing, retain prior handlers and a supported restoration route before requesting changes. The production coordinator intentionally accepts only the specific registered Markdown type; never broaden its whitelist to run tests.

## Superseding every-launch acceptance

The user subsequently requested every-launch checks (every-launch-amendment.md). Replace steps2/5 “no repeat on relaunch” and “subsequent startup must neither prompt” with: after Not Now, a fresh eligible app launch queries the OS and asks if another app remains default; after an external default switch, the next eligible launch offers consent again. Already-default launches remain silent; no repeat prompt within one process and no automatic reassignment. Old stored response markers must not suppress checks.
