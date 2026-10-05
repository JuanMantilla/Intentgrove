> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F001 preimplementation review — 2026-09-25

**Scope:** approved constitution, spec, visual proposal, architecture plan, and
new tasks. This is an artifact review; no application behavior has been tested.

## Consistency

- F001-R01–R10 have implementation and validation tasks. The first runnable
  slice is T008–T012 after native permission and path foundations.
- F002–F005 features remain excluded from F001 implementation.
- The approval record covers the exact spec, design, mockup, and plan hashes.
  This tasks file adds no material scope change.

## Findings and controls

| Severity | Requirement | Finding | Required handling |
|---|---|---|---|
| High risk to test | F001-R04/R05 | A canonicalize-then-open sequence can race with symlink replacement. | Use descriptor-relative opens with no-follow checks for every component and test rename/symlink races. |
| High risk to test | F001-R06 | Renderer defaults alone do not enforce offline behavior after custom links/images. | Block remote schemes in components, CSP, navigation guard, and native command validation; test network observations. |
| Medium risk to test | F001-R07/R08 | A 10 MiB size cap does not bound parser cost for giant tables/lines. | Keep parsing responsive with worker/budget/fallback and adversarial fixtures. |
| Medium risk to test | F001-R09 | A development window can pass while the packaged app lacks assets or permissions. | Run the installed .app disconnected with Vite stopped and inspect production bundle. |

These are implementation risks with explicit tasks, not observed defects. No
artifact contradiction blocks the first batch. Security findings must be
revisited against actual code before F001 completion.
