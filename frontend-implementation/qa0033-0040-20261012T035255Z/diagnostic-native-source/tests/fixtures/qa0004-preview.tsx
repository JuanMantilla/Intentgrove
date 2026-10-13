import { createRoot } from "react-dom/client";
import App from "../../src/app/App";
import "../../src/styles/app.css";
// Disposable browser renderer only; all native operations below are synthetic.
const scenario = new URLSearchParams(location.search).get("scenario");
localStorage.setItem("md-reader-locale", "en");
const root = { id: "root", name: "QA fixture", displayPath: "/fixture", generation: 1 };
let sequence = 0;
Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {
  transformCallback: () => ++sequence, unregisterCallback: () => {},
  invoke: async (command: string, args: Record<string, unknown> = {}) => {
    if (command === "load_workspace_session") {
      if (scenario === "load-failure") throw { code: "recovery_permissions", message: "Synthetic protection failure" };
      return null;
    }
    if (command === "checkpoint_workspace_session") {
      if (scenario === "checkpoint-failure") throw { code: "unsupported_type", message: "Synthetic storage failure" };
      return { sequence: 1, completedAtMs: 1 };
    }
    if (command === "select_root") return root;
    if (command === "prepare_root_selection") return "fixture-selection";
    if (command === "commit_root_selection") return root;
    if (command === "select_file") return { ...root, id: "first", name: "first.md", displayPath: "/fixture/first.md" };
    if (command === "list_entries") return { entries: ["first.md", "second.md"].map(name => ({ name, kind: "markdown" })), nextOffset: null };
    if (command === "read_document") {
      const name = (args.segments as string[] | undefined)?.[0] ?? (args.fileId === "second" ? "second.md" : "first.md");
      return { fileId: name === "second.md" ? "second" : "first", identityKey: name, name, displayPath: "/fixture/" + name,
        diskVersion: "v1", content: name === "second.md" ? "# Second\n\nDisposable supported Markdown." : "# First\n\n[Read second](second.md)\n\n[Unsupported protocol](https://example.invalid/refused)" };
    }
    if (command === "resolve_link") return args.target === "second.md" ? { kind: "document", fileId: "second" } : { kind: "unsupported" };
    if (command === "list_recent_items") return { items: [], recoveredCorrupt: false };
    if (command === "list_native_entries") return [];
    if (command === "load_section_recovery") return null;
    return null;
  }
} });
createRoot(document.getElementById("root")!).render(<App />);
