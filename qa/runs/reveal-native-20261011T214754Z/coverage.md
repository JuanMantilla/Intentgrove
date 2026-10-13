# Coverage

{'PASS': 38, 'FAIL': 3, 'NOT_APPLICABLE': 4, 'BLOCKED': 4, 'NOT_RUN': 2}

| Case | Result | Layer | Scope |
|---|---|---|---|
| BUILD | PASS | Build | Current isolated app build |
| N01 | PASS | Packaged macOS | Unopened explorer file; no new document tab |
| N02 | PASS | Packaged macOS | Active root-backed tab |
| N03 | PASS | Packaged macOS | Inactive root-backed tab; clicked active.md while inactive.md active |
| N04 | PASS | Packaged macOS | Active individually opened file tab |
| N05 | PASS | Packaged macOS | Inactive individually opened file tab; clicked one.md while two.md active |
| N06 | PASS | Packaged macOS | Nested special-character path from explorer |
| N07 | PASS | Packaged macOS | Nested special-character path from root tab |
| K01 | PASS | Packaged macOS | Tab Shift+F10 opens context menu |
| K02 | PASS | Packaged macOS | Tab Return activates Reveal |
| K03 | PASS | Packaged macOS | Tab Escape dismisses and Shift+F10 reopens same target |
| K04 | PASS | Packaged macOS | Explorer Shift+F10 opens after restored row focus |
| K05 | PASS | Packaged macOS | Explorer Down/Return activates Reveal |
| K06 | PASS | Packaged macOS | Explorer Escape dismisses and restores same row |
| K07 | PASS | Packaged macOS | Tab focus on return from Finder |
| K08 | PASS | Packaged macOS | Explorer focus on return from Finder |
| A01 | FAIL | Packaged macOS | Known unavailable tab hides/disables Reveal |
| A02 | PASS | Packaged macOS | Saved explicit file with unsaved edits remains revealable |
| A03 | PASS | Packaged macOS | Saved root file with unsaved edits via tab |
| A04 | PASS | Packaged macOS | Saved root file with unsaved edits via explorer |
| A05 | NOT_APPLICABLE | Reachability | Unsaved file without local path |
| A06 | NOT_APPLICABLE | Reachability | Virtual document item |
| A07 | NOT_APPLICABLE | Reachability | Nonlocal file item |
| R01 | PASS | Packaged macOS | Rename root-backed opened file after menu opens |
| R02 | PASS | Packaged macOS | Invoke Reveal on missing opened target |
| R03 | PASS | Packaged macOS | Rename unopened target after menu opens |
| R04 | PASS | Packaged macOS | Replace individually opened file after menu opens |
| R05 | PASS | Packaged macOS | Rename saved file while dirty tab menu is open |
| R06 | FAIL | Packaged macOS | Replace unopened listed file after context menu opens |
| R07 | PASS | Packaged macOS | Session finish with run-owned drafts |
| L01 | PASS | Packaged macOS | English labels in explorer and tabs |
| L02 | PASS | Packaged macOS | Spanish labels in explorer and tabs |
| V01 | PASS | Packaged macOS | Light and dark app appearance |
| V02 | PASS | Packaged macOS | English dark explorer menu placement |
| V03 | BLOCKED | Native capture | English dark tab menu visual placement |
| V04 | BLOCKED | Native capture | Spanish light explorer menu visual appearance |
| V05 | BLOCKED | Native capture | Spanish light tab menu visual appearance |
| V06 | BLOCKED | Native capture | Spanish dark tab menu visual appearance |
| P01 | PASS | Packaged macOS | Folder context menu excludes file Reveal |
| P02 | PASS | Packaged macOS | Nearby folder expand/collapse behavior |
| P03 | PASS | Packaged macOS | Nearby Reload |
| P04 | PASS | Packaged macOS | Nearby Copy path |
| P05 | PASS | Packaged macOS | Nearby Close tab |
| C01 | PASS | Code inspection | Grant-based narrow IPC authority and safe native API use |
| C02 | FAIL | Copied production resolver / real filesystem | Unopened listed replacement identity rejection |
| C03 | PASS | Native unit tests | Existing reveal policy tests |
| C04 | PASS | Mocked frontend tests | Reveal and nearby menu/navigation/Windows-label tests |
| W01 | NOT_RUN | Windows native | Explorer Show in File Explorer selects corresponding file |
| W02 | NOT_RUN | Windows native | Tab Show in File Explorer selects clicked active/inactive file |
| LINUX | NOT_APPLICABLE | Code inspection | Preserve existing unsupported Linux convention |
| INTEGRITY | PASS | Provenance | 157 scoped product/input paths unchanged |
