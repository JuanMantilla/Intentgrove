# F005 data model

Incoming native open event: OS path, source (`Finder`/drop/picker), event ID and readiness state; it becomes an app grant only after native validation. Window lifecycle: visible/closed/reopening/quitting plus F004 dirty-choice and F003C checkpoint status. Release artifact: version, macOS/CPU target, minimum OS, app/DMG hashes, signature/notarization/Gatekeeper result and acceptance matrix. No event path is trusted just because Finder supplied it.
