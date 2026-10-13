// Browser-only inspection of the real App fallback. No HTML renderer is mocked.
// The native bridge is synthetic; this page is not a packaged integration test.
import { createRoot } from "react-dom/client";
import App from "../../../src/app/App";
import { api } from "../../../src/app/api";
import "../../../src/styles/app.css";
Object.assign(api, {
  loadWorkspaceSession: async () => null,
  listRecentItems: async () => ({ items: [], recoveredCorrupt: false }),
  listSafetyCopies: async () => ({ resolvedCount: 0, resolvedBytes: 0, unresolvedCount: 0, unresolvedBytes: 0, usedBytes: 0, quotaBytes: 1 }),
  listNativeEntries: async () => [],
  selectRoot: async () => ({ id: "fixture", name: "Disposable HTML fixture", displayPath: "/tmp/intentgrove-html-fixture", generation: 1 }),
  listEntries: async () => ({ entries: [{ name: "page.html", kind: "other" }, { name: "second.htm", kind: "other" }], nextOffset: null, snapshotId: "v1" }),
  readDocument: async () => { throw { code: "unsupported_type", message: "Only Markdown files can be opened" }; },
  checkpointWorkspaceSession: async () => ({ sequence: 1, completedAtMs: Date.now() }),
  reconcileVisibleState: async () => ({ jobId: "synthetic", generation: 1, accepted: true })
});
createRoot(document.getElementById("root")!).render(<App />);
