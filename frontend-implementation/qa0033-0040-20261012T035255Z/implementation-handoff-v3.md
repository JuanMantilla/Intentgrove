# Implementation handoff — QA-0033 through QA-0040

USER-AUTHORIZED scoped repairs; acceptance PENDING. QA-0033/34/35 have deterministic failing-before and passing-after probes; QA-0036 preserves Find focus; QA-0037 independently supplies native appearance/window boundary and resets/disposes its owned singleton. QA-0038/39/40 remain UNRESOLVED: observed original prerequisites pass in this investigation, no cause-supported repair yet.

Frozen source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v2
Source manifest: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/source-manifest-v2.json
Manifest SHA256: `4dab2a48003df8ca8ffe144db76e337e25578f400ac78811ad57c3513134622b` (433 input rows).
Native app: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-target/debug/bundle/macos/Intentgrove QA0033-0040.app
Executable SHA256: `5bc963af62f9c7f862bf5ce18c4ef7d6af5931a7654fc45ad87ff589f910ca13`.
Config: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native.config.json
Config SHA256: `e07c180db43d894e021b692e1b05b63457df40224104242add3be978f832a0b3`.
Full bundle identity: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-identity.json
Isolated profile: /Users/juanmantilla/Library/Application Support/com.juanmantilla.intentgrove.qa0033to40.r20261012t035255z.

The source/native candidate uses the complete pre-task source capture plus exactly eight scoped frontend/test files. Fifteen unrelated native paths changed concurrently before initial freeze; the first candidate/build and drift record are retained. This later native work is preserved in the live tree and deliberately outside this candidate; the candidate does not verify that concurrent native revision.

Implementation patch: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/evidence/implementation-final.patch
Causal failures/traces and every intermediate attempt: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/evidence/logs, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/evidence/trace-19720-1791777673965.json.
Original test body suffix parity: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/evidence/original-case-parity-complete.json; all seven original case-file test suffixes are byte-identical. QA-0037 changes only fixtures/import/lifecycle outside the original scenario. Existing assertions/deadlines/replies/maxWorkers2 retained.

PASS final affected frontend115, harness78, isolated startup failure, TypeScript/Vite/offline debug build and ad-hoc signature. Earlier implementation mistakes and failed initial native build retained, never counted as final passes.

Retest from frozen source and exact bundle in a new isolated QA profile, record a pre-check snapshot, repeat every original isolated case and default suite three times. Native initial/reopen immediate one-key, stale switches, reading60/mixedlive/whole30, actual copy/control exclusions, Find query/draftbytes, native fields/modal/modifiers/history. Held-native, overlays, physical IME, VoiceOver and Windows require actual capability evidence; unavailable stays BLOCKED/NOT_RUN. No cleanup or user acceptance implied.

## Final v3 candidate (supersedes v2 for final verification)

Cold native v2 initial B from empty failed despite six reopen passes. Additional controlled late-adapter publication reproduced a stranded queue without a parent render; v3 wakes queue creation and adapter publication. Regression failed before and25 affected tests passed after. No original case changed.

Frozen source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3
Manifest: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/source-manifest-v3.json
SHA256: `02282907e7f24fc74544b77f32c46c8404f5b26b6a59bdb320bfa788f0a4a713` (434 rows).
App: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-target/debug/bundle/macos/Intentgrove QA0033-0040 v3.app
Executable SHA256: `9d57ce55bab102829a51e8ca3a8daf6b2bf47625eeb20e48f5bd0b6e1716d19a`.
Config: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-v3.config.json
Config SHA256: `c84e93a91d790c5bee8e7078d2c430001e8dafee26738629eb27926ced84e02e`.
Identity: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-identity-v3.json
Profile: /Users/juanmantilla/Library/Application Support/com.juanmantilla.intentgrove.qa0033to40.r20261012t035255zv3.
Final QA run: /Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-retest-v3-20261012T042800Z.
Earlier source/native candidates remain immutable. Final candidate includes nine scoped source/test paths and the original captured native snapshot. Live concurrent native work is preserved and unverified by this candidate. QA-0038–0040 remain causally unresolved; passing repetitions do not close them.
