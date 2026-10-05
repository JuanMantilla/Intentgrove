# Requirements retired — 2026-09-28

The user requested removal of offline and VoiceOver features and clarified:
“remove the requirement/checks”, in response to keeping local-file reading and
standard accessibility. This authorizes a requirements-only scope reduction.

Offline/disconnected operation and VoiceOver-specific manual acceptance are no
longer requirements or release gates. No requirement IDs or task IDs were removed;
mixed requirements retain their remaining obligations. No tasks were marked done.
Local files, bundled assets, blocked remote document content, scoped IPC, no-write
checks, keyboard access, accessible names, focus, contrast and Reduce Motion remain.
No application code, automated tests, runtime configuration or security settings changed.
Cargo's `--offline` dependency-cache option and historical evidence are unrelated
to the removed product guarantee and remain intact.

Historical approval hashes in approvals.md continue to identify the old artifacts.
This scope decision supersedes only the retired portions, not the remaining
approvals. The table below records the exact resulting document revisions; it does
not claim the user reviewed new artifacts or approve unrelated draft features.
The constitution's unrelated 0.2.0 UI amendment remains pending.

The initial broad request to edit protected role instructions was rejected by
automatic approval review. A narrower request limited to removing offline wording
in four role files and updating the handoff was approved and applied. Security
checks and standard accessibility instructions were preserved.

## Verification

PASS: document-only scope; requirement and task identifiers retained; task checkbox
states unchanged; historical evidence bodies preserved. Runtime tests: NOT TESTED
(no application changes). Security/network-observation portions of mixed checks
remain required, including F002A T021. Other incomplete native acceptance remains open.

## Changed document hashes

| Document | Previous SHA-256 | Resulting SHA-256 |
|---|---|---|
| `.agents/skills/md-product-spec/SKILL.md` | `8d8c2b38547aebce2824e784e964529af7a910f67a8871b224ec8c58abb6b2a7` | `9d416e63e72e9953564038e9dfbe993f06d6a19324e2e3c949b3c79f4ca09855` |
| `.agents/skills/md-qa-engineer/SKILL.md` | `5b877a59ee531ddaa5553e566cdb02a206cd08e9b00e8ae281b42c95865b0d3b` | `b54c73836eb287d9925e3d915f088ca214662f163d06b764ab6fc2b247322cc3` |
| `.agents/skills/md-release-engineer/SKILL.md` | `5474cafc1a1e8ee02592edba096ebf6d39bc1ba93acfd3f081b26614791604cc` | `893124ee48f4063c677aaf673b5c74ee91482eec7d4fd242541a7212dcc5b554` |
| `.agents/skills/md-ux-designer/SKILL.md` | `8aa826024914f949579fd2de62b3f79649b9fe20384952a33c7dca80f9540d59` | `1a90209f7dfc206ec78b8eb59c5c24f0b07deee5ad77afc3a9d4de025dd62c24` |
| `.specify/memory/constitution.md` | `78d79518e3808c7de77afeae0e08f33cb899478ab767e3197bf407161f90a0c4` | `d3a7b669f8b4b71ae38751c793d1d4857f216b4c19b8ed70035fd2b1b86af26b` |
| `AGENTS.md` | `7968231c22643fe4bef7d6ee84e206921c1a53dca1ef54a36ac9ad24bdabf84a` | `5a724254584077117a40c71ee63689ad172ec5c147812963695af5aec401c5e9` |
| `README.md` | `d916d648716156939a6eb82d248f4be5811cc4fa853fd7a4c0bc334403b554c6` | `1e0f473dfcc2724f83deda9765292caa5f9c10896a8bb68e4617ef4d0b69b93b` |
| `docs/architecture-proposal.md` | `103dcab5fbe5acfc187a3f455d24196d350f699972a17ccc09c83fe10ef7ab72` | `2eeb83956735ae20a20ec386975a7dce13c8f65b71b1f83a487e37c654e1a4ee` |
| `docs/constitution-input.md` | `7599eddd0e0c360e4053b254cccdfe729457e54508e55f0eb25b76d7475760b5` | `44d25fa4b0ca8da0d5efb6c1775dca530d0e30f66422aac207dec65b1f22f7e1` |
| `docs/design-direction.md` | `4a378a1538a257026714d57cc2dc2d3e1a212d9c19b7961d8d955ffe7375fef1` | `4aadc1bc1ddfae3de69d9463a72dde816c24b23debe6c7dec09e4a4e6f66f4d9` |
| `docs/feature-briefs/001-workspace-reader.md` | `1d64689d66bacaa13eabc4032d6d1ff65489d7c879ff056ee1adb94288e7e86e` | `29a688b214c3c10311b6719a147a4a421d202a609e25956b72ee05ec70c4f600` |
| `docs/missing-work-audit.md` | `8307a4bd0fd0ff286f416fc3e23dbec5c6164243d0674c5aa116b82482b6db45` | `0c832fb175c635c0e77654e617ec7877a307d7cbc6c785c69f1eb18ebfbbf797` |
| `docs/product-brief.md` | `2fabac252687abad9df20eaa4f8ff8a1c642ffb252bdb0167d0c1a810ce80e81` | `a98df04bf6b215fc18b84ac3b03a7d882642b7f461811116a82abbb671d6b746` |
| `docs/roadmap.md` | `3813c1d2326e4203e901cefc904ba38b4c87ca7710447b1bde2ce66a0b0221a7` | `1030cb54ad3563826a6655a6d5a2f0c8517e90b98353df5f2e7e61e66bb2a07f` |
| `docs/workflow.md` | `f76aa5de3965bbaa8170e9dfca4197c4a743eb42df470fc5e42072e7468f6f01` | `ea98eac8c1c6c5b4fd404695665d7a1a304c3cbea5f455c87db54d89579a50ea` |
| `prompts/01-constitution.md` | `308abb7f889aea74716a24fbceb723daf4a2ce8d66f2b8b3d80a5a4aca3281c4` | `2ae6b50a7a04f6277066f973779d99c97957bd70f52efa026ac89b650a972991` |
| `prompts/05-plan-feature.md` | `75379e393fe35beaaaf94f1ac211cb08453cf0debb659723a31cfccac364409f` | `e10b643ccfa4db38629ee6c1b0d7bb338123d6cb9575847c6186a11fd621f4df` |
| `prompts/09-verify-batch.md` | `48821ab6cb0fff3ebd1e160025c524e0259069a502c9d373710feb7678a5a7eb` | `3da1d353a6b9b7a515594179e9dca6665a80105e6f5325051d70636b164680b7` |
| `prompts/10-converge-feature.md` | `bbdf84a58016836372744474f1fca064ef2f31572533b252000b30a9b0c1cf56` | `9d510ee9fe17ab44a71883927ed23f7c1b994c20d00e4ba2c0b0010be145172e` |
| `prompts/11-release-macos.md` | `4d10a1ced97bf1e92469f1d7f883516929bd0b7cf2f701fd2544957fcadf237c` | `1887f53eea13fadbd1ddf7d56289ce7c83e0f2517e988385e1cb4778b056e042` |
| `specs/001-workspace-reader/checklists/requirements.md` | `b3fc8303d4f613d234307c8f5064982a6963680891b50c0fbf374acce7c03e2a` | `50b72978825bbe6e20b5fc3e27ff9e92dac410becc1dad123004df14eb33bb06` |
| `specs/001-workspace-reader/design.md` | `928df9d54629e11a425fb8d728eda8092c441e6b85ec7a9ea9a50f6c546cdd87` | `01958222a06e8781d2f2a2901dd65f5c799e31ca8c4d9cef53a1c01f7f037cdb` |
| `specs/001-workspace-reader/plan.md` | `759f6e8d0f96f720a7ef3a051de916386719736e7d6eaa0e98681f5307d0a3c9` | `f97164a340d18ffc9302d82a3cdb687da2dffa9df456d38cac8231621143b6f9` |
| `specs/001-workspace-reader/preimplementation-review.md` | `fc730fcc4f0482485eef7a6932a3c2b33e1a57be66666958b5e190d671cf0fba` | `1c77d0e4ff0664fcd183530795a6758f025ace0abf3f280199b63d88898f95cb` |
| `specs/001-workspace-reader/quickstart.md` | `98da14a1411be0f9342fb866cd7a8f9a7d2ace4e561d5cf28b0aa978e0272348` | `896f2dc6a91e3d49c05652dbe254090f57321b57adde1961a5528aece38723c3` |
| `specs/001-workspace-reader/research.md` | `f937c58f487c7eb32bd89d1ea6f0b17f311932c5260ad81266e8a4b545808030` | `685f376974ec9e4ecb00d9d698c384c7ac1016218db925863d8756a8c08da4d8` |
| `specs/001-workspace-reader/security-review.md` | `64d8b65830bc78bc1c47993f34ccf4d59a2702e902ec3a2b0b65ab0ab59e9f8d` | `45137c8bd66cb372ea7905ef6b5ef75a98eb466c8ae5e31c6711040d5e50b957` |
| `specs/001-workspace-reader/spec.md` | `2728704ca8056e825e70b465dfd7aeb04bfecde49a4e91b5257b40ec0efe2cc9` | `92155028c3ea90abe2f0733d595654d8ce71c3feed81351a49283de617e6c4a9` |
| `specs/001-workspace-reader/tasks.md` | `0fe3dc85bd7514f9fd855b00599f36db97ac559cf097ef39b2c32f1c142f77f9` | `27186862aa4530c2e54237d05f18006d18c12feee2658ab1287d538d2b964116` |
| `specs/001-workspace-reader/test-matrix.md` | `b336fdc68d27c12253e4a738cdd01364aa7b8a360edbc9609ea2e983fa8cbfe2` | `77c74fd22411a2ad8adec5f95c8b5254eb78a07ef0e36b4e006c7c173d82255f` |
| `specs/001-workspace-reader/verification.md` | `be80fc20d85feac7fa6571aeda270d0e8c5ab452752a08d0f34df6de6dfc8846` | `a531bf56c51c72c2fe815d1a2d675f6424da4d36d9392adee03914606bd24271` |
| `specs/002-section-editing-recovery/design.md` | `bfc144a08193b739c629b350b9a640489cfc0f0ace9006f38babacd218a67189` | `c3d0de65d750b8d17ac577ea8be24aad24ee6ff4f59dfe5a82a9e2ae36ea3b78` |
| `specs/002-section-editing-recovery/evidence.md` | `d4f48a1d1ebd152ade76441becd7d5fd4a925222f1dcb9655a01800d481a4472` | `921983534e17af183b7cd58dba40f073fa06eacccac687c438c84dbb32b28a66` |
| `specs/002-section-editing-recovery/plan.md` | `ddcfda8d7fd2390af25616caba75e6aef0aeb8e7416f4401ed521c56cb02b02f` | `0999f94b5da79937ba181a384793f87d3c238652f98287babe5830db66db94da` |
| `specs/002-section-editing-recovery/quickstart.md` | `e8ed309d0fbe15b1413b69c06a842fca4ed643fffb794b2052c53c2672cf843a` | `f0f788f5c0829d557bfef97ae521d31700b6337e056baa2cf13d23030cf3bd08` |
| `specs/002-section-editing-recovery/security-review.md` | `4735f01900a3b3cf1423f227740689a90aa5b74ccad87373875ca0e99703ac44` | `c44cf8f33002b2041c087d53322b0772ad6cc64fa622e6b0b505688a687464b5` |
| `specs/002-section-editing-recovery/spec.md` | `eda26077fc5c5ce5a8cc1e25d9de49ec3f06aab2c01da93bf08c868e3dbb04d4` | `4c39a5f9800acc85a4847e16a52773b6ef7eb231f856aa9bb08369c5066940b7` |
| `specs/002-section-editing-recovery/tasks.md` | `a98608ab1bbd426c56e2bf0ac04f5e542f678c83117ade4af4b93f1333290801` | `7a3aa49ff56d2d84cb87f456b667ed3c2959eb28c98fbbe1bd0ae5b81f1fe69b` |
| `specs/003-document-text-search/spec.md` | `719e5d7cfb381d14c497e7abce44dc9aa92f33b378549af2302648954da18ae3` | `1ddde5cb556651442b5733c1b994a331f813a3841410630514bf6f0ca03276e9` |
| `specs/004-restore-workspace-session/spec.md` | `ecaab032faf603293ef921edd5d4cec3b3993beab19c207c4882976bee0d3f2e` | `9abac79074762cb588084d7d5e0d0c4b645539ffb7ad46acf66bb1c6b9a84f05` |
| `specs/005-external-change-refresh/design.md` | `0fce348517b1dabb972a7fa43ffc5af409b6577bd18340bade680b0800ac61a2` | `1d5de1659374c085ec860b8cfee48387390c8aa1fb57c399294ba873d26dd9f1` |
| `specs/005-external-change-refresh/evidence.md` | `456454e80696370de638c39632670811144292d0f0bb87d7a9c524aa21ef1024` | `421dc363e0de7195bbf890cc53e4135740352a008679526345d3e8bb3006ee16` |
| `specs/005-external-change-refresh/plan.md` | `73be77c6405d26b9eeb4b926f5567636fc27ffb7b8d06c8188b9351c5341d993` | `869c844da3a0fd275caa2d1c90a940c6f8772c7d1009a945e628a4be5b1cc747` |
| `specs/005-external-change-refresh/quickstart.md` | `7ccd22a2bf3a7b80c223c9f40bbd32f2f9a50df114ab9b8fef58ec8fcfc42641` | `b79e144b5657fcc10be1568c4e86b58dca4377a3e1ee5780a61bfe56f1d3b9eb` |
| `specs/005-external-change-refresh/research.md` | `2ab30f7b65c9999a6e0171430f94e3ce649845c7d8c30771c2b4533c62edbeaa` | `44ae626ebdb56475ca2869ef43c2d732274abf09f884825319f8bf43b6b71d24` |
| `specs/005-external-change-refresh/spec.md` | `98541b888cba50c6143fc5745e2210a0c50fe2ecc222401438bf8359f978a597` | `d5cd8853fe318ff0be591d955b8ac83e267865d17e614649438bfcde9979611d` |
| `specs/005-external-change-refresh/tasks.md` | `8e14fd704fab424bef43c9d9a0db9df71e5de1094fdbc65162a51017a47eaa18` | `c79852e686d0c2d2abfb0f80ecf176268b83c5820829eeca68169ae32d204d9e` |
| `specs/006-view-local-images/checklists/requirements.md` | `57e5fca66ddd816bb2795464f7ce384050f14ebce15739cd60c0fdb8cefae44a` | `9b18f337f29adc9ee516dc1af8d3d378776b97e450ec60f29ceead8d09855a8f` |
| `specs/006-view-local-images/spec.md` | `e6a178b727afba5d3118e254957d0e7a115238768abab7f81daf2d9f2d6687a9` | `b8ee8619282446852ce955e04e1d027cd298c7982bfa658fc227c4fb25873fea` |
| `specs/007-dark-theme/checklists/requirements.md` | `8308f12ff2aff625a515d35d8863c245c6e67bb82141332852e8e71180ecd199` | `493bf45b9192dba7a3960d58fc3864b3b6555484e697edd2fbc820deea2857de` |
| `specs/007-dark-theme/design.md` | `e95826853b1434c8dd9019b8f74c3f0391e8b89d06f3f106af510acb060e64b9` | `cba99ae6674f33a109de890fe75830056ec0358b46df7b6ed58611f07eacf592` |
| `specs/007-dark-theme/evidence.md` | `5bcec1785ed1b158d87495624eb21106355bffeeb241a6b55a83098c637cda10` | `56b67f8b95198924c5b272f7b3751d2419f0f8522a2e7c02b2a9f6c3eeb7d58f` |
| `specs/007-dark-theme/plan.md` | `96343f2cdef09176775c71493199b059d8e7827fff404dd189acf933add39b98` | `bf500d49052f0763f98ed9c5e8d81db0d0a032d8e8b5e46ea14267f41981e4d5` |
| `specs/007-dark-theme/quickstart.md` | `f39d0e5926d1cbac291b4c44ae3e833c993f4ef532a429c24bd70db19e045c10` | `2323fa9bc0dba38cdce60aa25fae0733f0fce613659908dbabf8be7ee5b0039c` |
| `specs/007-dark-theme/spec.md` | `bf5bd7b5d53e8b3331ef460c551d082ada713f1dbabf6385ba6343a9431c08c3` | `79ab557c930b001f40bc9f4bd128a9040e8b07abb676550c55972dafc49aa5b6` |
| `specs/007-dark-theme/tasks.md` | `ae15934792c81fb467c73edf6c3d48b0da0a2028b7cb4b28b69aefc0c986d5f9` | `4e4327d5df2e9d48e568f160702333340658f645957c0377a4a1ac7230075751` |
| `specs/007-dark-theme/test-matrix.md` | `6dfee9a5ef5a8ff060b1f567f6bc06d94235d88374d8e447561fe0ac1f63102a` | `df15666aeb4167d45112ee7e73a933f514bab202fb2f4d72fe1c5ef2f1d35f91` |
| `specs/007-dark-theme/verification.md` | `3b9e89369b9dae494b8dd0d3f3bd195d253f94065b77219c6aa075d588742db3` | `cd3e6c165dbab7014190d8b562858bbb35af6b08cbe321cbcdcbbcd850bb13c5` |
