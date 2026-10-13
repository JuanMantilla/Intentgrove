# Current macOS native acceptance

RUN, same-session QA pass (not independent review). Host macOS 27.0.1 (26A434), arm64. Production source candidate plus a separately identified QA bundle with an isolated app-data identifier. No user documents or existing profile are authorized. Disposable fixtures under /private/tmp/intentgrove-qa-20261007-fixtures. QA does not change application code. No install, security changes or publication.

Cases: MA01 Settings/menu focus; MA02 Go/menu state; MA03 Command shortcuts; MA04 Finder cold/warm; MA05 file/folder drop; MA06 dirty Close/Cancel; MA07 dirty Quit/Cancel; MA08 failed Save; MA09 Dock reopen; MA10 preferences/session/draft restart; MA11 subtree search; MA12 image refresh/security; MA13 large-file performance. Verify native access before executing workflows; unavailable interaction must remain BLOCKED. Bundle signature/integrity and compiler/unit tests are separate evidence, never UI acceptance.
