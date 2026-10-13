// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {begin, phase, registered, removed, finish} from "../trace";
import App from "../../../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(),
  listEditSections: vi.fn(), beginSectionEdit: vi.fn(), discardSectionEdit: vi.fn(),
  saveSectionEdit: vi.fn(), finishEditingClose: vi.fn(), checkpointSectionEdit: vi.fn(),
  reconcileVisibleState: vi.fn(), getConfirmedDocument: vi.fn(),
  checkpointWorkspaceSession: undefined as undefined | ReturnType<typeof vi.fn>,
  finishWorkspaceSession: undefined as undefined | ReturnType<typeof vi.fn>,
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));
vi.mock("../../../../src/app/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../../src/app/api")>(), api: mocks
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, listener: (event: { payload: unknown }) => void) => {
    registered(name,listener); mocks.listeners[name] = listener;
    return () => { removed(name,listener); if (mocks.listeners[name] === listener) delete mocks.listeners[name]; };
  })
}));
vi.mock("../../../../src/reader/SectionEditor", () => ({
  default: ({ initialDraft, onChange, onCheckpoint, onReturn, headerActions }: {
    initialDraft: string; onChange: (draft: string) => void;
    onCheckpoint: (draft: string, json: unknown, top: number, left: number) => void;
    onReturn: () => void; headerActions?: boolean;
  }) => <div aria-label="Fixture editor">
    <pre>{initialDraft}</pre>
    <button type="button" onClick={() => {
      onChange("# One\nmy draft\n");
      onCheckpoint("# One\nmy draft\n", { doc: "# One\nmy draft\n" }, 42, 3);
    }}>Change and checkpoint</button>
    {!headerActions && <button type="button" onClick={onReturn}>Return to reading</button>}
  </div>
}));

const content = "# One\nalpha\n# Two\nbeta\n";
const section = { id: "one", kind: "heading", ordinal: 0, level: 1, label: "One",
  startByte: 0, endByte: 12, sourceHash: "one" };
const documentV1 = { fileId: "file", identityKey: "1:file", name: "a.md",
  displayPath: "/tmp/close-fixture/a.md", content, diskVersion: "v1" };

beforeEach(() => {
  begin(mocks);
  vi.resetAllMocks();
  mocks.checkpointWorkspaceSession = undefined;
  mocks.finishWorkspaceSession = undefined;
  localStorage.clear();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/close-fixture", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "a.md", kind: "markdown" }], nextOffset: null });
  mocks.readDocument.mockResolvedValue(documentV1);
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections: [section,
    { ...section, id: "two", ordinal: 1, label: "Two", startByte: 12, endByte: 23 }] });
  mocks.beginSectionEdit.mockResolvedValue({ sessionId: "session", diskVersion: "v1", section,
    source: "# One\nalpha\n", lineSeparator: "\n" });
  mocks.checkpointSectionEdit.mockImplementation(async ({ sequence }) => ({ sequence, durationMs: 1 }));
  mocks.discardSectionEdit.mockResolvedValue(undefined);
  mocks.finishEditingClose.mockResolvedValue(undefined);
  mocks.saveSectionEdit.mockResolvedValue({ diskVersion: "v2", content: "# One\nmy draft\n# Two\nbeta\n",
    sections: [{ ...section, id: "one-v2" }], recoveryCleanupFailed: false });
  mocks.reconcileVisibleState.mockResolvedValue({ generation: 1, jobId: "job", accepted: true });
});
afterEach(async () => { await finish(cleanup, act); vi.restoreAllMocks(); });

async function setup() {
  if(process.env.INTENTGROVE_HOLD_EDIT==="1") mocks.beginSectionEdit.mockImplementation(()=>new Promise(()=>{}));
  phase("setup:start"); render(<App />); phase("setup:rendered");
  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
  fireEvent.click(await screen.findByTitle("a.md")); phase("setup:document-clicked");
  fireEvent.contextMenu(await screen.findByLabelText("Edit section: One"));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Edit section" }));
  phase("setup:editor-ready"); const change = await screen.findByRole("button", { name: "Change and checkpoint" });
  change.focus();
  await act(async () => fireEvent.click(change)); phase("setup:checkpoint-dispatched");
  await waitFor(() => expect(mocks.listeners["editing:close_requested"]).toBeTypeOf("function"));
}
type Route = "quit" | "window" | "tab" | "read";
async function requestClose(route: Route) {
  if (route === "quit" || route === "window") {
    await act(async () => mocks.listeners["editing:close_requested"]({ payload: route }));
  } else fireEvent.click(screen.getByRole("button", {
    name: route === "tab" ? "Close tab: a.md" : "Return to reading"
  }));
  phase("close:requested:"+route); const dialog=await screen.findByRole("alertdialog", { name: "Keep this section edit?" }); phase("close:dialog-ready"); return dialog;
}

describe("dirty editor close choices (F004-R08, R15)", () => {
  for (const route of ["quit", "window", "tab", "read"] as const) {
    it.each(["Cancel", "Keep draft", "Discard", "Save"])(`${route}: %s`, async (choice) => {
      await setup();
      const dialog = await requestClose(route);
      phase("close:before-choice:"+choice); fireEvent.click(within(dialog).getByRole("button", { name: choice })); phase("close:clicked:"+choice);
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull()); phase("close:dialog-dismissed");
      expect(mocks.saveSectionEdit).toHaveBeenCalledTimes(choice === "Save" ? 1 : 0);
      expect(mocks.discardSectionEdit).toHaveBeenCalledTimes(choice === "Discard" ? 1 : 0);
      if (choice === "Save") expect(mocks.saveSectionEdit).toHaveBeenCalledWith("session", "# One\nmy draft\n");
      if (choice === "Discard") expect(mocks.discardSectionEdit).toHaveBeenCalledWith("session");
      if (choice !== "Cancel" && (route === "quit" || route === "window")) {
        expect(mocks.finishEditingClose).toHaveBeenCalledWith(route === "quit");
      } else expect(mocks.finishEditingClose).not.toHaveBeenCalled();
      if (choice === "Cancel" || route === "quit" || route === "window") {
        if (choice === "Cancel" || choice === "Keep draft") {
          expect(screen.getByLabelText("Fixture editor").textContent).toContain("my draft");
        }
      } else if (route === "tab") {
        expect(screen.queryByRole("tab", { name: /a.md/ })).toBeNull();
        if (choice === "Keep draft") {
          fireEvent.click(screen.getByTitle("a.md"));
          expect((await screen.findByLabelText("Fixture editor")).textContent).toContain("my draft");
          expect(mocks.beginSectionEdit).toHaveBeenCalledTimes(1);
        }
      } else expect(screen.queryByLabelText("Fixture editor")).toBeNull();
      if (choice === "Cancel") expect(document.activeElement?.textContent).toBe("Change and checkpoint");
    });
  }

  it.each(["quit", "window"] as const)("%s Save checkpoints committed state and closes without a display frame", async (route) => {
    mocks.checkpointWorkspaceSession = vi.fn().mockResolvedValue(undefined);
    mocks.finishWorkspaceSession = vi.fn().mockResolvedValue(undefined);
    await setup();
    // A hidden/occluded WebView may not deliver another display frame. Leave
    // timers and microtasks live: only the display scheduler is withheld.
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const dialog = await requestClose(route);
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.finishEditingClose).toHaveBeenCalledWith(route === "quit"));
    expect(mocks.finishWorkspaceSession).toHaveBeenCalledOnce();
    const checkpoint = mocks.finishWorkspaceSession.mock.calls[0][0];
    expect(checkpoint.tabs).toHaveLength(1);
    expect(checkpoint.tabs[0]).toMatchObject({ savedDiskVersion: "v2", editingActive: false });
    expect(mocks.finishWorkspaceSession.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.finishEditingClose.mock.invocationCallOrder[0]);
  });

  it("Quit Cancel does not wait for an unresolved checkpoint and preserves its dirty owner", async () => {
    let finish!: (value: {sequence: number; durationMs: number}) => void;
    mocks.checkpointSectionEdit.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await setup(); const editor=screen.getByLabelText("Fixture editor");
    fireEvent.click(within(await requestClose("quit")).getByRole("button", {name:"Cancel"}));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByLabelText("Fixture editor")).toBe(editor);
    expect(editor.textContent).toContain("my draft"); expect(screen.getByRole("tab",{name:/Unsaved/})).toBeTruthy();
    expect(mocks.finishEditingClose).not.toHaveBeenCalled(); expect(mocks.saveSectionEdit).not.toHaveBeenCalled(); expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    await act(async () => finish({sequence:1,durationMs:1}));
    expect(editor.textContent).toContain("my draft"); expect(screen.getByRole("tab",{name:/Unsaved/})).toBeTruthy();
  });
  it("keeps Quit pending after a failed Save", async () => {
    mocks.saveSectionEdit.mockRejectedValue({ code: "denied", message: "fixture write failure" });
    await setup();
    fireEvent.click(within(await requestClose("quit")).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.saveSectionEdit).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByLabelText("Fixture editor").textContent).toContain("my draft");
    expect(mocks.finishEditingClose).not.toHaveBeenCalled();
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });

  it.each(["pending", "failed"])("prevents Keep draft while the checkpoint is %s", async (status) => {
    if (status === "pending") mocks.checkpointSectionEdit.mockReturnValue(new Promise(() => {}));
    else mocks.checkpointSectionEdit.mockRejectedValue({ code: "denied" });
    await setup();
    const dialog = await requestClose("window");
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep draft" }));
    expect(await screen.findByText("Wait for Recovery saved before keeping this draft.")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(mocks.finishEditingClose).not.toHaveBeenCalled();
    expect(mocks.saveSectionEdit).not.toHaveBeenCalled();
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });

  it("replaces disk-discard confirmation with one Quit choice and invalidates a late confirmation", async () => {
    await setup();
    const external = { ...documentV1, diskVersion: "v2", content: "# One\nexternal\n# Two\nbeta\n" };
    mocks.readDocument.mockResolvedValue(external);
    await act(async () => mocks.listeners["refresh:file_changed"]({ payload: {
      generation: 1, fileId: "file", diskVersion: "v2", identityKey: "1:file", checkedAt: Date.now()
    } }));
    fireEvent.click(screen.getByRole("button", { name: "Inspect versions" }));
    await waitFor(() => expect(document.querySelectorAll(".conflict-versions pre")).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    let confirm!: (value: typeof external) => void;
    mocks.getConfirmedDocument.mockReturnValue(new Promise((resolve) => { confirm = resolve; }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Use disk version" }));
    await requestClose("quit");
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    await act(async () => confirm(external));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Fixture editor").textContent).toContain("my draft");
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

