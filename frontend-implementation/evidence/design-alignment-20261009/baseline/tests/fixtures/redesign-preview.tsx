// Local-only visual fixture: renders the real App; every native operation is synthetic.
// This file is not imported by src/main.tsx or included in the production entry.
import { createRoot } from "react-dom/client";
import SettingsWindow from "../../src/app/SettingsWindow";
import type { SettingsSnapshot, PreferencePatch, Preferences } from "../../src/app/settings-contract";
import { workspaceLayout } from "../../src/app/workspaceLayout";
import App from "../../src/app/App";
import { defaultSessionPanel } from "../../src/app/session";
const paragraph = "This is disposable reader content. A local workspace keeps the file identity, reading location and unsaved section separate. Following a visit should preserve context while source changes remain explicit. No personal document is opened or written by this renderer fixture.";
const instructions = "# Project instructions\n\nDisposable renderer fixture.\n\n" + Array.from({length: 10}, (_, index) =>
  `## Reading passage ${index + 1}\n\n${paragraph}\n\n${paragraph}\n\n- A local file\n- A retained visit\n- An explicit save\n\n`).join("");
const readme = "# Markdown workspace\n\n" + Array.from({length: 8}, (_, index) =>
  `## Workspace passage ${index + 1}\n\n${paragraph}\n\n${paragraph}\n\n`).join("");
import svg from "../../specs/007-dark-theme/design/theme-states.svg?raw";
import "../../src/styles/app.css";

const params = new URLSearchParams(location.search);
localStorage.setItem("md-reader-locale", params.get("locale") ?? "es");
localStorage.setItem("md-reader-appearance", JSON.stringify({ schema: 1, mode: params.get("theme") ?? "dark" }));
// Opt-in synthetic native Settings coordinator for layout verification only.
if (params.has("layout")) Object.defineProperty(window, "isTauri", { value: true });
let settings: SettingsSnapshot = { revision: 0, activation: 0, group: "General", ownerAvailable: true,
  requestId: null, persistence: "saved", retryPatch: null, nativeThemeFailed: false,
  values: { language: params.get("locale") === "es" ? "es" : "en", appearance: params.get("theme") === "light" ? "light" : "dark",
    readingFont: "roboto", readingSize: 16, readingLineHeight: 1.6, readingWidth: 760, documentsAndImagesOnly: true,
    workspaceLayout: workspaceLayout(params.get("layout")) } };
const editorDocument = "# Editing target\n\nEdit this paragraph directly. It contains **bold text** and *italic text*, with an authored local [link](./README.md).\n\nA second paragraph keeps the same readable column.\n\n- First item\n- Second item\n  - Nested item\n\n| Name | Value |\n| :--- | ---: |\n| First | One |\n| Second | Two |\n\n~~~javascript\nconst message = `hello`;\n~~~\n\n# Read-only surroundings\n\nThis section remains readable and unchanged.\n";
const sources: Record<string, string> = { "AGENTS.md": params.get("editor") === "1" ? editorDocument : instructions, "README.md": readme,
  "close-review-similar-filename-alpha.md": "# Alpha\n\nDisposable Markdown fixture.\n",
  "close-review-similar-filename-beta.md": "# Beta\n\nDisposable Markdown fixture.\n" };
const imageName = "theme-states.svg";
const names = [...Object.keys(sources), imageName];
const path = (name: string) => "/fixture/personal/md-reader/" + name;
const root = { id: "fixture-root", name: "md-reader", displayPath: "/fixture/personal/md-reader", generation: 1 };
const sectionsFor = (name: string) => {
  const source = sources[name];
  const headings = [...source.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  return headings.map((match, ordinal) => ({ id: name + ":" + ordinal, kind: "heading", ordinal,
    level: match[1].length, label: match[2], sourceHash: "synthetic",
    startByte: new TextEncoder().encode(source.slice(0, match.index)).length,
    endByte: new TextEncoder().encode(source.slice(0, headings[ordinal + 1]?.index ?? source.length)).length }));
};
let activeEdit: { name: string; section: ReturnType<typeof sectionsFor>[number] } | null = null;
const callbacks = new Map<number, (event: unknown) => void>();
const listeners = new Map<string, number>();
let nextCallback = 1;
const failedCommands = new Set<string>();
let inventory = { resolvedCount: 2, resolvedBytes: 4096, unresolvedCount: 1, unresolvedBytes: 1024, usedBytes: 5120, quotaBytes: 1048576 };
const documentFor = (name: string) => ({ fileId: name, identityKey: "fixture:" + name, name,
  displayPath: path(name), content: sources[name], diskVersion: "v1" });
const imageBytes = async () => {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 1200;
    canvas.getContext("2d")!.drawImage(image, 0, 0, 1200, 1200);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("fixture raster failed"))));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  } finally { URL.revokeObjectURL(url); }
};
Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {
  metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
  transformCallback: (callback: (event: unknown) => void) => { const id = nextCallback++; callbacks.set(id, callback); return id; },
  unregisterCallback: (id: number) => callbacks.delete(id),
  invoke: async (command: string, args: Record<string, unknown> = {}) => {
    if (failedCommands.delete(command)) throw { code: "io_error", message: "Disposable renderer command failure" };
    if (command === "plugin:event|listen") { listeners.set(String(args.event), Number(args.handler)); return args.handler; }
    if (command === "plugin:event|unlisten") return;
    const name = String(args.fileId ?? (args.segments as string[] | undefined)?.at(-1) ?? "AGENTS.md");
    switch (command) {
      case "get_workspace_preferences": case "get_settings_state": return settings;
      case "publish_workspace_preferences": settings = { ...settings, revision: settings.revision + 1, values: args.values as Preferences }; return settings;
      case "apply_settings_change": {
        const patch = args.patch as PreferencePatch;
        settings = { ...settings, revision: settings.revision + 1, values: {...settings.values, ...patch}, requestId: String(args.requestId), persistence: "pending" };
        callbacks.get(listeners.get("settings:intent")!)?.({payload: {requestId: settings.requestId, revision: settings.revision, patch}});
        return settings;
      }
      case "acknowledge_settings_change": settings = {...settings, persistence: args.persistence as "saved" | "failed"}; return settings;

      case "load_workspace_session": return { sequence: 1, completedAtMs: 1, exitDisposition: "normal", root,
        tabs: names.map((name) => ({ key: name, fileId: name, name, displayPath: path(name), rootSegments: [name], explicitFile: false,
          anchor: { headingId: null, offset: 0, scrollTop: 0, viewportWidth: 1440, viewportHeight: 900, contentVersion: "v1" },
          savedDiskVersion: "v1", errorCode: null, editingActive: false })), activeKey: "AGENTS.md",
        tree: { expanded: [], selected: ["AGENTS.md"], scrollTop: 0 }, panel: { ...defaultSessionPanel, readingWidth: 760, outlineOpen: true, workspaceLayout: (["margin", "folio", "atlas"].includes(params.get("layout") ?? "") ? params.get("layout") : "margin") } };
      case "list_entries": return { entries: names.map((name) => ({ name, kind: name.endsWith(".svg") ? "image" : "markdown" })), nextOffset: null, snapshotId: "fixture" };
      case "read_document": return documentFor(name);
      case "list_edit_sections": return { diskVersion: "v1", sections: sectionsFor(name) };
      case "begin_section_edit": {
        const section = sectionsFor(name).find((section) => section.id === args.sectionId)!;
        activeEdit = { name, section };
        return { sessionId: "synthetic-edit", diskVersion: "v1", section,
          source: new TextDecoder().decode(new TextEncoder().encode(sources[name]).slice(section.startByte, section.endByte)), lineSeparator: "\n" };
      }
      case "checkpoint_section_edit": return { sequence: args.sequence, durationMs: 1 };
      case "discard_section_edit": activeEdit = null; return;
      case "save_section_edit": {
        if (!activeEdit) throw new Error("No synthetic edit");
        const { name, section } = activeEdit, bytes = new TextEncoder().encode(sources[name]);
        sources[name] = new TextDecoder().decode(bytes.slice(0, section.startByte)) + args.replacement + new TextDecoder().decode(bytes.slice(section.endByte));
        activeEdit = null;
        return { content: sources[name], diskVersion: "v2", sections: sectionsFor(name), recoveryCleanupFailed: false, safetyCopyStatusFailed: false };
      }
      case "open_image": return { fileId: imageName, identityKey: "fixture-image", name: imageName,
        displayPath: path(imageName), diskVersion: "v1", format: "svg", mime: "image/png", width: 1200, height: 1200, still: false, bytes: await imageBytes() };
      case "list_safety_copies": return inventory;
      case "clear_resolved_safety_copies": inventory = { ...inventory, resolvedCount: 0, resolvedBytes: 0 }; return inventory;
      case "list_recent_items": return { items: [], recoveredCorrupt: false };
      case "list_native_entries": return [];
      case "load_section_recovery": return null;
      case "checkpoint_workspace_session": return { sequence: args.sequence, completedAtMs: 1 };
      case "reconcile_visible_state": return { generation: 1, jobId: "synthetic", accepted: true };
      case "start_folder_search": {
        // Opt-in visual stress fixture; results derive from disposable source lines.
        const results = params.has("search") ? Object.entries(sources).flatMap(([name, source]) => source.split("\n")
          .flatMap((context, index) => context.toLowerCase().includes(String(args.query).toLowerCase()) ? [{
            id: `${name}:${index}`, segments: [name], path: name, line: index + 1, startByte: 0, endByte: 1,
            context, kind: "content", ignored: false, version: "v1"
          }] : [])).slice(0, 12) : [];
        setTimeout(() => callbacks.get(listeners.get("folder-search:batch")!)?.({ payload: { jobId: "search", generation: 1,
          results, scanned: names.length, skipped: params.has("search") ? 1 : 0, matched: results.length, status: "complete", errorCode: null } }), 50);
        return { generation: 1, jobId: "search" };
      }
      case "cancel_folder_search": return true;
      case "reload_item": {
        const target = args.target as { kind: string; fileId?: string; rootId?: string; segments?: string[] };
        setTimeout(() => callbacks.get(listeners.get("refresh:item_status")!)?.({ payload: {
          generation: 1, targetRef: target.kind === "explicit-file" ? target.fileId
            : { rootId: target.rootId, segments: target.segments },
          state: "current", reasonCode: "", checkedAt: Date.now()
        } }), 30);
        setTimeout(() => callbacks.get(listeners.get("refresh:job_progress")!)?.({ payload: {
          generation: 1, jobId: "fixture-reload", examinedCount: 1, confirmedCount: 1, state: "completed"
        } }), 40);
        return { generation: 1, jobId: "fixture-reload", accepted: true };
      }
      case "cancel_reload": return { cancelled: true };
      case "choose_section_save_as": return null;
      default: return null;
    }
  }
} });
Object.defineProperty(window, "__rendererFixture", { value: {
  edit: () => { throw new Error("Use actual rendered typing for the direct editor fixture"); },
  failNext: (command: string) => failedCommands.add(command),
  kind: "renderer-only; native API responses mocked"
} });
createRoot(document.getElementById("root")!).render(params.get("settings") === "1" ? <SettingsWindow /> : <App />);
