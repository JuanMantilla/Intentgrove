# Loading animation handoff

Status: PROPOSED — READY FOR DESIGN REVIEW. The user's current request authorizes design artifacts only.

Open [index.html](index.html) for all 34 mockups, trigger definitions, behavior rules, source boundaries and motion specifications. The six families cover Preview (P01–P10), Workspace (W01–W05), Navigation (N01–N04), Search (S01–S04), Editing (E01–E06), and Management (M01–M05).

Observed: async document/Markdown/image/diagram/HTML acquisition; native snapshot/window reading; workspace restore and file access; folder listing; freshness/reload and history visits; search batching; editing/save/recovery; storage and preference persistence. The coverage table names the existing source owner. Some operations do not currently expose a dedicated region-specific pending flag: image tiles, recent item activation, initial Settings, recent records, and section entry require frontend state design before implementation. No new native capabilities are assumed.

Proposed: one shared three-dot pulse, known-structure placeholders, and progress tracks. Prefer one primary indicator for each operation. Retain current content during checks where its owner permits it; native HTML lifecycle may require hiding the old surface. No newly invented cancel capability; actual availability must be checked per operation. Successful operations settle into current content or acknowledged status; failures return readable errors and existing retry/reselect flows.

Preview waiting replaces visible loading sentences with animation and localized accessible status. File saves, recovery checkpoints and preference changes retain concise labels because they represent different commitments. Recovery acknowledgment is never original-file save acknowledgment. No fake percent progress: bytes require a real total; open-ended scans use actual counts with an indeterminate track. Busy controls retain text contrast rather than lowering their opacity.

All timing (150 ms proposed reveal delay, 1.2 s dot cycle, 1.7 s placeholder breath, 2 s indeterminate travel) is a design proposal, not a performance measurement. Reduced motion disables travel/pulse, retains static symbols, status and measured progress. Fast local transitions that do not have an observable asynchronous wait need no loader (theme selection, panel opening, tab reordering, local text formatting).

The mockups use the existing Margin shell as a placement reference. Loading principles apply to Folio and Atlas, but those full layouts are not newly redesigned or exhaustively illustrated here. Settings has its own window illustration. Narrow folder mockups expose the Explorer region instead of hiding the affected branch. Inline-image frame dimensions are illustrative; implementation must reserve them only from known metadata.

Native system pickers and arbitrary authored HTML content are outside this app-owned loading system. Refusals, permission choices, errors, recovery decisions and empty states remain explicit UI, not loaders. Avoid loaders during purely synchronous actions or idle background monitoring.

Validation and limitations: see [STATE.md](STATE.md). Measured color pairs cover opaque design tokens only; no certification, user research, native integration or final design acceptance is claimed. Local assets copied from the existing app; Roboto license accompanies the font. No external asset requests are required.
