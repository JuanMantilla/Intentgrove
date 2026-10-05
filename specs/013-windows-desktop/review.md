# Windows review set — F007W

Status: APPROVED on 2026-10-05. User statement: “I approve it. Give me a prompt for the os-senior-expert to work on it”. All seven artifact hashes below matched immediately before recording approval. Approved gate artifacts retain their exact reviewed text; their historical Draft/Pending labels describe preparation time. This review record is the current approval authority.

Approved [specification](spec.md), [Windows experience delta](design.md), and [architecture](plan.md) with their supporting artifacts below authorize scoped production implementation. Proposed first target: Windows 11 x64 on local NTFS; preserve current Tauri/React interface and Mac behavior. Build native adapters, reach a read-only Windows milestone, then enable editing after actual save/recovery evidence. Image decoding stays explicitly unavailable pending a separate isolated-worker design.

Approval includes one Windows-only direct native binding dependency, windows-sys 0.61.2, and local unsigned per-user NSIS package configuration/construction after native checks. No tool/package installation, installed-app testing, schema migration, CI change, sandbox/privilege change, association registration, signing, commit/push or publication is included. Windows machine provisioning is a separate exact action if needed.

| Artifact | SHA-256 |
| --- | --- |
| [spec.md](spec.md) | `45b8b7be5edca1f5546652b9768f84af9be97d60d2ca8d9a5886243f234ce860` |
| [design.md](design.md) | `0e55900159ec37f9247fa83095bca5e1184b2b150dd3a48c2a74e26dfaf93ba5` |
| [plan.md](plan.md) | `e0bbdc3d27277a95ebe6bc2e3a483e41a59243f06921f8a27a69b432992960e1` |
| [research.md](research.md) | `8bca1d0bdf89b45dc4aa11eaec61d21f127e2b180be89f58a580125888024ad0` |
| [data-model.md](data-model.md) | `4ae43edb4e145d358c509c8f0b826873d9cf0417004091fc51a52b9e2e963add` |
| [platform-boundaries.md](contracts/platform-boundaries.md) | `65ebcf7dc65b5160d1bb1653ef57f97995a8d620eebe813a7b883b9181475cd5` |
| [quickstart.md](quickstart.md) | `501f08b861a6aaf66aad723f7d0ccf9e0f8d42a1c44b8620a7483f1059fc0a99` |

The repository [AGENTS.md](../../AGENTS.md) requires: “Before production implementation, the user must approve the active feature specification, applicable visual direction, and architecture.” These are new artifacts; prior macOS/design approvals do not approve them. Approval is now explicit for this exact set; material changes reopen only the affected gate.

Current work: architecture/native dependency audit and canonical review documentation. Windows build/runtime/install checks remain NOT TESTED; this Mac has no native Windows runner. [Assessment evidence](evidence/assessment.md). Next: generate Spec Kit tasks, extract and regression-test Mac adapters, then implement the Windows boundary on a native runner.
