import { projectAction } from "/Users/juanmantilla/projects/personal/md-reader/tests/ui/project-navigation-helpers";
// @vitest-environment jsdom
// F002A T018/T019: deterministic component evidence, NOT native acceptance.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { typeRich, richLeaf } from "/Users/juanmantilla/projects/personal/md-reader/tests/ui/rich-edit-helpers";
import App from "/Users/juanmantilla/projects/personal/md-reader/src/app/App";
import { getAppearance } from "/Users/juanmantilla/projects/personal/md-reader/src/app/appearance";
import type { DocumentResponse, SaveEditResponse, SectionDescriptor } from "/Users/juanmantilla/projects/personal/md-reader/src/app/api";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(),
  getConfirmedDocument: vi.fn(), listEditSections: vi.fn(), loadSectionRecovery: vi.fn(),
  beginSectionEdit: vi.fn(), saveSectionEdit: vi.fn(), checkpointSectionEdit: vi.fn(),
  reconcileVisibleState: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));
vi.mock("/Users/juanmantilla/projects/personal/md-reader/src/app/api", async (original) => ({
  ...await original<typeof import("/Users/juanmantilla/projects/personal/md-reader/src/app/api")>(), api: mocks
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, callback: (event: { payload: unknown }) => void) => {
    mocks.listeners[name] = callback;
    return () => { delete mocks.listeners[name]; };
  })
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const source = "# One\noriginal passage\n";
const section: SectionDescriptor = { id: "one", kind: "heading", ordinal: 0, level: 1, label: "One",
  startByte: 0, endByte: source.length, sourceHash: "fixture" };
const documentFixture: DocumentResponse = {
  fileId: "file", identityKey: "fixture:1", name: "fixture.md",
  displayPath: "/tmp/synthetic-appearance/fixture.md", content: source, diskVersion: "v1"
};

beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  for (const key of Object.keys(mocks.listeners)) delete mocks.listeners[key];
  getAppearance().applyPreference("light");
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => setTimeout(() => fn(0), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/synthetic-appearance", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "fixture.md", kind: "markdown" }], nextOffset: null, snapshotId: "v1" });
  mocks.readDocument.mockResolvedValue(documentFixture);
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections: [section] });
  mocks.loadSectionRecovery.mockResolvedValue(null);
  mocks.beginSectionEdit.mockResolvedValue({ sessionId: "edit", diskVersion: "v1", section, source, lineSeparator: "\n" });
  mocks.checkpointSectionEdit.mockImplementation(async (_session, sequence) => ({ sequence, durationMs: 1 }));
  mocks.reconcileVisibleState.mockResolvedValue({ generation: 1, jobId: "job", accepted: true });
});
afterEach(() => { cleanup(); getAppearance().applyPreference("system"); vi.unstubAllGlobals(); });

async function openFixture() {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("fixture.md"));
}
function changeTheme() {
  // Change through the actual control while the operation promise remains held.
  const control = screen.getByRole("combobox", { name: "Appearance" });
  control.focus();
  for (let i = 0; i < 10; i++) {
    const mode = i % 2 === 0 ? "dark" : "light";
    fireEvent.change(control, { target: { value: mode } });
    expect(document.documentElement.dataset.theme).toBe(mode);
    expect(document.activeElement).toBe(control);
  }
}

it.each(["resolve", "reject"] as const)("keeps one in-flight document load through ten theme changes (%s)", async (outcome) => {
  const gate = deferred<DocumentResponse>();
  mocks.readDocument.mockReturnValue(gate.promise);
  await openFixture();
  await waitFor(() => expect(mocks.readDocument).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("original passage")).toBeNull();
  changeTheme();
  expect(mocks.readDocument).toHaveBeenCalledTimes(1);
  await act(async () => outcome === "resolve" ? gate.resolve(documentFixture) : gate.reject({ code: "encoding", message: "fixture" }));
  if (outcome === "resolve") expect(await screen.findByText("original passage")).toBeTruthy();
  else expect(await screen.findByText("This file is not valid UTF-8")).toBeTruthy();
  expect(mocks.readDocument).toHaveBeenCalledTimes(1);
});

it("preserves the active tab and reader position while a confirmed refresh is pending", async () => {
  await openFixture(); await screen.findByText("original passage");
  const gate = deferred<DocumentResponse>(); mocks.getConfirmedDocument.mockReturnValue(gate.promise);
  const reader = document.querySelector<HTMLElement>(".reader-scroll")!;
  reader.scrollTop = 170; fireEvent.scroll(reader);
  await waitFor(() => expect(mocks.listeners["refresh:file_changed"]).toBeTypeOf("function"));
  act(() => mocks.listeners["refresh:file_changed"]({ payload: {
    generation: 1, fileId: "file", diskVersion: "v2", identityKey: "fixture:1", checkedAt: 1
  } }));
  expect(mocks.getConfirmedDocument).toHaveBeenCalledTimes(1);
  changeTheme();
  expect(reader.scrollTop).toBe(170);
  expect(screen.getByRole("tab", { name: /fixture.md/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("original passage")).toBeTruthy();
  await act(async () => gate.resolve({ ...documentFixture, diskVersion: "v2", content: "# One\nrefreshed passage\n" }));
  expect(await screen.findByText("refreshed passage")).toBeTruthy();
  expect(mocks.getConfirmedDocument).toHaveBeenCalledTimes(1);
  expect(mocks.readDocument).toHaveBeenCalledTimes(1);
});

it.each(["resolve", "reject"] as const)("does not restart Save or recreate the editor while Save is pending (%s)", async (outcome) => {
  await openFixture();
  fireEvent.contextMenu(await screen.findByLabelText("Edit section: One"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
  await waitFor(() => expect(document.querySelector(".rich-section")).toBeTruthy());
  const node = document.querySelector<HTMLElement>(".rich-section")!;
  typeRich("draft", richLeaf("original passage"), 16);
  const draft = "# One\noriginal passagedraft\n";
  await waitFor(() => expect(mocks.checkpointSectionEdit).toHaveBeenCalled());
  const gate = deferred<SaveEditResponse>(); mocks.saveSectionEdit.mockReturnValue(gate.promise);
  fireEvent.click(screen.getByRole("button", { name: /^Save file$/ }));
  await waitFor(() => expect(mocks.saveSectionEdit).toHaveBeenCalledWith("edit", draft));
  const state = mocks.checkpointSectionEdit.mock.calls.at(-1)![0].editorJson;
  const reader = document.querySelector<HTMLElement>(".reader-scroll")!;
  reader.scrollTop = 47;
  const checkpoints = mocks.checkpointSectionEdit.mock.calls.length;
  changeTheme();
  expect(document.querySelector(".rich-section")).toBe(node);
  expect(mocks.checkpointSectionEdit.mock.calls.at(-1)![0].editorJson).toEqual(state);
  expect(reader.scrollTop).toBe(47);
  expect(mocks.checkpointSectionEdit).toHaveBeenCalledTimes(checkpoints);
  expect(mocks.saveSectionEdit).toHaveBeenCalledTimes(1);
  await act(async () => outcome === "resolve"
    ? gate.resolve({ diskVersion: "v2", content: draft, sections: [section], recoveryCleanupFailed: false, safetyCopyStatusFailed: false })
    : gate.reject({ code: "io_error", message: "fixture save failure" }));
  if (outcome === "resolve") {
    // Successful Save normally returns to reading; only the pending operation
    // must preserve the editor instance. Do not change that product behavior.
    await waitFor(() => expect(document.querySelector(".rich-section")).toBeNull());
    expect(await screen.findByText(/original passagedraft/)).toBeTruthy();
  } else {
    await waitFor(() => expect(screen.getByRole("button", { name: /^Save file$/ }).hasAttribute("disabled")).toBe(false));
    expect(richLeaf("original passagedraft")).toBeTruthy();
    expect(await screen.findByText("Save failed. Your section edit is still available.")).toBeTruthy();
  }
  expect(mocks.saveSectionEdit).toHaveBeenCalledTimes(1);
  expect(mocks.beginSectionEdit).toHaveBeenCalledTimes(1);
});

it("causal QA-0034 visible initial scroll before section readiness",async()=>{
 const sectionGate=deferred<{diskVersion:string;sections:SectionDescriptor[]}>();
 mocks.listEditSections.mockReturnValueOnce(sectionGate.promise);
 await openFixture();await screen.findByText('original passage');
 const gate=deferred<DocumentResponse>();mocks.getConfirmedDocument.mockReturnValue(gate.promise);
 const reader=document.querySelector<HTMLElement>('.reader-scroll')!;reader.scrollTop=170;fireEvent.scroll(reader);
 await act(async()=>sectionGate.resolve({diskVersion:'v1',sections:[section]}));
 await waitFor(()=>expect(mocks.listeners['refresh:file_changed']).toBeTypeOf('function'));
 act(()=>mocks.listeners['refresh:file_changed']({payload:{generation:1,fileId:'file',diskVersion:'v2',identityKey:'fixture:1',checkedAt:1}}));
 changeTheme();expect(reader.scrollTop).toBe(170);
 await act(async()=>gate.resolve({...documentFixture,diskVersion:'v2',content:'# One\nrefreshed passage\n'}));
});
