import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(),
  listEditSections: vi.fn(), loadSectionRecovery: vi.fn(),
  saveSectionEdit: vi.fn(), reconcileVisibleState: vi.fn(),
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
  default: ({ initialDraft, initialEditorJson }: { initialDraft: string; initialEditorJson: unknown }) =>
    <div data-testid="restored-editor">{initialDraft}<span data-testid="history-present">{String(Boolean(initialEditorJson))}</span></div>
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "a.md", kind: "markdown" }], nextOffset: null, snapshotId: "v1" });
  mocks.readDocument.mockResolvedValue({ fileId: "file", identityKey: "1:file", name: "a.md",
    displayPath: "/tmp/fixture/a.md", content: "# A\noriginal\n", diskVersion: "v2" });
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v2", sections: [] });
  mocks.reconcileVisibleState.mockResolvedValue({ generation: 1, jobId: "job", accepted: true });
  mocks.loadSectionRecovery.mockResolvedValue({
    sessionId: "session", diskVersion: "v1",
    section: { id: "section", kind: "heading", ordinal: 0, level: 1, label: "A",
      startByte: 0, endByte: 13, sourceHash: "hash" },
    source: "# A\noriginal\n", draft: "# A\nmy draft\n", lineSeparator: "\n",
    editorJson: { doc: "# A\nmy draft\n", history: { done: [] } },
    editorScrollTop: 12, editorScrollLeft: 0, readerScrollTop: 88,
    sequence: 7, savedAtMs: Date.UTC(2026, 8, 26, 20, 0, 0), conflict: true
  });
});
afterEach(cleanup);

describe("recovery offer", () => {
  it("shows the latest saved time and restores a conflicting draft without writing the source", async () => {
    render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await waitFor(() => expect(mocks.loadSectionRecovery).toHaveBeenCalledWith("file"));
    expect(screen.getByText(/Last recovery saved:/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recover unsaved edit" }));
    expect((await screen.findByTestId("restored-editor")).textContent).toContain("# A\nmy draft\n");
    expect(screen.getByTestId("history-present").textContent).toBe("true");
    expect(screen.getByRole("alert").textContent).toContain("This file changed in another app");
    expect(mocks.saveSectionEdit).not.toHaveBeenCalled();
  });
});
