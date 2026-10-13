import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(), getConfirmedDocument: vi.fn(),
  listEditSections: vi.fn(), beginSectionEdit: vi.fn(), discardSectionEdit: vi.fn(),
  saveSectionEdit: vi.fn(),
  rememberRecentDocument: vi.fn(), listRecentItems: vi.fn(),
  finishEditingClose: vi.fn(),
  checkpointSectionEdit: vi.fn(), reconcileVisibleState: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));

vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, listener: (event: { payload: unknown }) => void) => {
    mocks.listeners[name] = listener;
    return () => { delete mocks.listeners[name]; };
  })
}));
vi.mock("../../src/reader/SectionEditor", () => ({
  default: ({ onChange }: { onChange: (value: string) => void }) =>
    <button type="button" onClick={() => onChange("# One\nchanged\n")}>Change draft</button>
}));

const content = "# One\nalpha\n# Two\nbeta\n";
const sections = [
  { id: "one", kind: "heading", ordinal: 0, level: 1, label: "One",
    startByte: 0, endByte: 12, sourceHash: "one" },
  { id: "two", kind: "heading", ordinal: 1, level: 1, label: "Two",
    startByte: 12, endByte: 23, sourceHash: "two" }
];

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "a.md", kind: "markdown" }], nextOffset: null, snapshotId: "v1" });
  mocks.readDocument.mockResolvedValue({ fileId: "file", identityKey: "1:file", name: "a.md",
    displayPath: "/tmp/fixture/a.md", content, diskVersion: "v1" });
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections });
  mocks.beginSectionEdit.mockImplementation(async (_id: string, sectionId: string) => ({
    sessionId: sectionId, diskVersion: "v1", section: sections.find((section) => section.id === sectionId),
    source: sectionId === "one" ? "# One\nalpha\n" : "# Two\nbeta\n", lineSeparator: "\n"
  }));
  mocks.discardSectionEdit.mockResolvedValue(undefined);
  mocks.finishEditingClose.mockResolvedValue(undefined);
  mocks.checkpointSectionEdit.mockResolvedValue({ sequence: 1, durationMs: 1 });
  mocks.reconcileVisibleState.mockResolvedValue({ generation: 1, jobId: "job", accepted: true });
  mocks.rememberRecentDocument.mockResolvedValue(undefined);
  mocks.listRecentItems.mockResolvedValue({ items: [], recoveredCorrupt: false });
});
afterEach(cleanup);

async function changedEdit() {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("a.md"));
  await editSection("One");
  fireEvent.click(await screen.findByRole("button", { name: "Change draft" }));
  mocks.rememberRecentDocument.mockClear();
}

const savedEdit = { diskVersion: "v2", content: "# One\nchanged\n# Two\nbeta\n", sections,
  recoveryCleanupFailed: false, safetyCopyStatusFailed: false };

it("acknowledges successful Save in Recents before dirty-close can finish", async () => {
  await changedEdit();
  let acknowledge!: () => void;
  mocks.saveSectionEdit.mockResolvedValue(savedEdit);
  mocks.rememberRecentDocument.mockReturnValue(new Promise<void>(resolve => { acknowledge = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Close tab: a.md" }));
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save to file" }));
  await waitFor(() => expect(mocks.rememberRecentDocument).toHaveBeenCalledExactlyOnceWith("file"));
  expect(screen.getByRole("tab", { name: /a.md/ })).toBeTruthy();
  acknowledge();
  await waitFor(() => expect(screen.queryByRole("tab", { name: /a.md/ })).toBeNull());
});

it.each(["denied", "version_changed", "save_race", "save_race_uncaptured", "reselection_required"])(
  "never acknowledges %s Save and preserves the draft", async (code) => {
    await changedEdit();
    mocks.saveSectionEdit.mockRejectedValue({ code, message: "fixture" });
    fireEvent.click(screen.getByRole("button", { name: "Save file" }));
    await waitFor(() => expect(mocks.saveSectionEdit).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Save file" }).hasAttribute("disabled")).toBe(code !== "denied"));
    expect(mocks.rememberRecentDocument).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /Unsaved/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change draft" })).toBeTruthy();
  });

it("keeps a confirmed Save successful if Recent persistence fails", async () => {
  await changedEdit();
  mocks.saveSectionEdit.mockResolvedValue(savedEdit);
  mocks.rememberRecentDocument.mockRejectedValue({ code: "recents_error", message: "fixture" });
  fireEvent.click(screen.getByRole("button", { name: "Save file" }));
  await waitFor(() => expect(mocks.rememberRecentDocument).toHaveBeenCalledWith("file"));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Change draft" })).toBeNull());
  expect(screen.queryByRole("tab", { name: /Unsaved/ })).toBeNull();
  expect(mocks.saveSectionEdit).toHaveBeenCalledOnce();
});

async function editSection(name: string) {
  await screen.findByLabelText(`Edit section: ${name}`);
  await screen.findByRole("button", { name: `Edit section “${name}”` });
  fireEvent.contextMenu(screen.getByLabelText(`Edit section: ${name}`));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Edit section" }));
}

describe("one pending section draft", () => {
  it("requires a choice before opening another section", async () => {
    render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await editSection("One");
    await waitFor(() => expect(mocks.beginSectionEdit).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "Change draft" }));
    expect(screen.getByRole("tab", { name: /Unsaved/ })).toBeTruthy();
    await editSection("Two");
    const dialog = screen.getByRole("alertdialog", { name: "Finish this section before editing another?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(mocks.beginSectionEdit).toHaveBeenCalledTimes(1);
    await editSection("Two");
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(mocks.beginSectionEdit).toHaveBeenCalledWith("file", "two", "v1"));
    expect(mocks.discardSectionEdit).toHaveBeenCalledWith("one");
  });

  it("keeps an external version protected until explicit discard", async () => {
    render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await editSection("One");
    fireEvent.click(await screen.findByRole("button", { name: "Change draft" }));
    const changed = { fileId: "file", identityKey: "1:file", name: "a.md",
      displayPath: "/tmp/fixture/a.md", content: "# One\nexternal\n# Two\nbeta\n", diskVersion: "v2" };
    mocks.readDocument.mockResolvedValue(changed);
    mocks.getConfirmedDocument.mockResolvedValue(changed);
    await waitFor(() => expect(mocks.listeners["refresh:file_changed"]).toBeTypeOf("function"));
    mocks.listeners["refresh:file_changed"]({ payload: {
      generation: 1, fileId: "file", diskVersion: "v2", identityKey: "1:file", checkedAt: Date.now()
    } });
    fireEvent.click(await screen.findByRole("button", { name: "Inspect versions" }));
    await waitFor(() => expect(document.querySelectorAll(".conflict-versions pre")[1]?.textContent)
      .toBe(changed.content));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    expect(screen.getByRole("alertdialog", { name: "Discard your unsaved edit and use the disk version?" })).toBeTruthy();
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Use disk version" }));
    await waitFor(() => expect(mocks.discardSectionEdit).toHaveBeenCalledWith("one"));
    expect(mocks.getConfirmedDocument).toHaveBeenCalledWith("file", "v2", 1);
  });

  it("saves the pending section before opening the requested section", async () => {
    const savedSections = sections.map((section) => ({ ...section, id: section.id + "-v2" }));
    mocks.saveSectionEdit.mockResolvedValue({ diskVersion: "v2", content: "# One\nchanged\n# Two\nbeta\n",
      sections: savedSections, recoveryCleanupFailed: false });
    mocks.listEditSections.mockResolvedValueOnce({ diskVersion: "v1", sections })
      .mockResolvedValue({ diskVersion: "v2", sections: savedSections });
    mocks.beginSectionEdit.mockImplementation(async (_id: string, sectionId: string) => ({
      sessionId: sectionId, diskVersion: sectionId.endsWith("v2") ? "v2" : "v1",
      section: [...sections, ...savedSections].find((section) => section.id === sectionId),
      source: sectionId.startsWith("one") ? "# One\nalpha\n" : "# Two\nbeta\n", lineSeparator: "\n"
    }));
    render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await editSection("One");
    fireEvent.click(await screen.findByRole("button", { name: "Change draft" }));
    await editSection("Two");
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.saveSectionEdit).toHaveBeenCalledWith("one", "# One\nchanged\n"));
    await waitFor(() => expect(mocks.beginSectionEdit).toHaveBeenCalledWith("file", "two-v2", "v2"));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });

  it.each([["quit", true], ["window", false]] as const)(
    "routes %s completion through the matching native action", async (intent, quit) => {
      render(<App />);
      fireEvent.click(projectAction("Open folder"));
      fireEvent.click(await screen.findByTitle("a.md"));
      await editSection("One");
      await waitFor(() => expect(mocks.listeners["editing:close_requested"]).toBeTypeOf("function"));
      mocks.listeners["editing:close_requested"]({ payload: intent });
      fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save to file" }));
      await waitFor(() => expect(mocks.finishEditingClose).toHaveBeenCalledWith(quit));
      expect(mocks.discardSectionEdit).toHaveBeenCalledWith("one");
    }
  );
});

it("keeps the passage readable during section entry, blocks duplicate entry, and discards a stale acquired session after close", async () => {
  let complete!: (value: unknown) => void;
  mocks.beginSectionEdit.mockReturnValue(new Promise(resolve => { complete = resolve; }));
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("a.md"));
  const edit = await screen.findByRole("button",{name:"Edit section “One”"});
  edit.focus(); fireEvent.click(edit); fireEvent.click(edit);
  expect(document.activeElement).toBe(edit);
  expect(mocks.beginSectionEdit).toHaveBeenCalledOnce();
  expect(screen.getByText("alpha")).toBeTruthy();
  expect(within(edit).getByRole("status",{name:"Loading…"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Close tab: a.md"}));
  complete({sessionId:"late-session",diskVersion:"v1",section:sections[0],source:"# One\nalpha\n",lineSeparator:"\n"});
  await waitFor(()=>expect(mocks.discardSectionEdit).toHaveBeenCalledWith("late-session"));
  expect(screen.queryByRole("button",{name:"Change draft"})).toBeNull();
});
