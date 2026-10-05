# Remaining roadmap approval review set

**Status:** Draft proposals, not approved. Prepared 2026-09-29 through the installed Spec Kit feature directories. Each row has four separate gates: behavior (`spec.md`), visual direction (`design.md`), sketch (`design/*.svg`), architecture (`plan.md`). Hashes are SHA-256 in that order. Research, data models, contracts, quickstarts and specification-quality checklists are in each directory. Any feature can be approved or revised independently.

| Feature directory | Spec hash | Design hash | Sketch hash | Plan hash |
|---|---|---|---|---|
| `specs/008-rich-reading` (F002R) | `59c46b5b809da796ab66a403a4b9441349b64f2ad3d2b0767186ac80f127f79c` | `bf418d97b2faa27bcc1fce501d4a094d1011c99c8de456225cbdcbc8190cd943` | `f443d3d5d5ccfb4e6aa04d361cede8b2f79d23acb63faa1864cfbdd77057f622` | `9eea6a7c05662da764cb0ae86c93f8fb368361afbb6ffed8c5218617b0cfe38f` |
| `specs/009-folder-search` (F003F) | `683b8f432b08105a907058aaa024acb3e9da059d9be1044d2142eab7274466d9` | `aaf0bbf539d56e6c2507d3f3a7bec04aac6db1d3c2e973760971e729016a339d` | `c063662943d7c2a28dbcdaceb3df25e068755966f6e4325fc9048751af2291f0` | `009a2eb847ef59cf51f4c05695c4e2de58b48e292e86548d967ddbb57052a206` |
| `specs/010-recent-items` (F003R) | `bfd8a9f3ad41c42edd8e289d2750e786196fbc639c8b1677b7187a4d5cdc4a34` | `a69dd7a7753e0643aafa55f8c654d624f7b209637079d2191ed087b2cb7df48a` | `4493a1d3f66ca61da3bbd198197ee08b6b642e058bed1406f9c711a61130afc0` | `332cffbaaadb94674e9d4231a2f00df089cd5b538f7aa6c3cbd76d5f760e1559` |
| `specs/011-large-file-mode` (F003L) | `a48b3a3697438d8a2d8a75808c25231ba40fcb057d8ea09f0856d037dd476173` | `004746fef0df50e5c24086705eb3eeeaec936a508428e4fd08725381438bc7fb` | `d231870068bb2aeb8b2a395fa0e3c3001139cb42c19354cfacf2920da2212f33` | `8c1fec312b9e3c9f58ce36712667d1609eba5f80560f150db1be20c8e9791392` |
| `specs/012-macos-delivery` (F005) | `6d91f74c399c03e28be1c04efc826e99b9f6e843abdfba6e3715124ee68f0707` | `d583072f8f124ef0624c23c95746d3a8cf606a4538b1475cf44a1484965a7ee6` | `2dbb40b361ca5a2373345ad22d3c01af2993b88b9e0b48f0113e744a9ff931f1` | `b2f1ef5af5216a64c0d28e8e2269d8bc95bdfc15326c0acca33429f1a721d5f1` |

## Material proposed decisions

- F002R: Mermaid must be isolated from native authority and rasterized; the plan requires a packaged isolation proof before enabling it. YAML is plain data, code grammars/fonts are local, outline IDs share rendered heading identity. A pinned Mermaid 11.x security/version audit and render budget work are required.
- F003F: Native descriptor-based traversal reads `.gitignore` without following external symlinks. Search streams bounded results and acknowledges cancellation under a proposed 250 ms target. A pinned `ignore` version/dependency graph needs MSRV review.
- F003R: Private recents have proposed caps of 20 folders and 50 documents. Historical paths require native identity revalidation/reselection and Clear Recents does not clear F003C session or F004 drafts.
- F003L: >10 to 50 MiB requires explicit read-only opt-in; >50 MiB is rejected before full read. Proposed budgets are 128 MiB extra memory for one tab and 1 MiB maximum selection copy.
- F005: Finish private `.app`/`.dmg`, native menus, Finder/file drop, Quit/Dock reopen and truthful signing/compatibility evidence. It does not authorize Developer ID purchase, notarization upload or publication.

Approval of a feature's four current artifacts authorizes its scoped production implementation and local tests/builds under `AGENTS.md`. It does not approve other features, app-data deletion, commit/push, publication, spending, or unexecuted packaged results. All five features require implementation tasks after their gates; no production work is claimed here.
