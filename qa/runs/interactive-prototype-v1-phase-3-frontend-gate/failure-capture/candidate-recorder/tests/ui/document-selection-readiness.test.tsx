// @vitest-environment jsdom
// An explicitly held adapter boundary; native file access is mocked.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import type MarkdownView from "../../src/reader/MarkdownView";
import type { DocumentSelectionAdapter } from "../../src/reader/document-selection";
import App from "../../src/app/App";
import { projectAction } from "./project-navigation-helpers";

const mocks = vi.hoisted(() => ({ selectRoot: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(),
  listEditSections: vi.fn(), loadSectionRecovery: vi.fn(), deliver: vi.fn(),
  callback: undefined as ComponentProps<typeof MarkdownView>["onSelectionReady"],
  adapter: null as DocumentSelectionAdapter | null }));
vi.mock("../../src/app/api", async original => ({
  ...await original<typeof import("../../src/app/api")>(), api: mocks
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock("../../src/reader/MarkdownView", async original => {
  const module = await original<typeof import("../../src/reader/MarkdownView")>();
  return { ...module, default: (props: ComponentProps<typeof MarkdownView>) => {
    mocks.callback = props.onSelectionReady;
    return <module.default {...props} onSelectionReady={mocks.deliver} />;
  } };
});
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); window.getSelection()?.removeAllRanges();
  mocks.adapter = null; mocks.callback = undefined;
  mocks.deliver.mockImplementation((adapter: DocumentSelectionAdapter | null) => { mocks.adapter = adapter; });
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/selection-readiness", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "one.md", kind: "markdown" }], nextOffset: null });
  mocks.readDocument.mockResolvedValue({ fileId: "one", identityKey: "one", name: "one.md", displayPath: "/tmp/selection-readiness/one.md",
    diskVersion: "v1", content: "# Current document\n\nCurrent ending." });
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections: [] });
  mocks.loadSectionRecovery.mockResolvedValue(null);
});
afterEach(cleanup);
it("wakes queued document intent when its adapter arrives after the active commit", async () => {
  render(<App />); fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("one.md"));
  await screen.findByRole("heading", { name: "Current document" });
  await act(async () => {});
  expect(mocks.adapter?.fileId).toBe("one");
  const key = new KeyboardEvent("keydown", { key: "a", metaKey: true, bubbles: true, cancelable: true });
  act(() => window.dispatchEvent(key));
  expect(key.defaultPrevented).toBe(true);
  expect(window.getSelection()!.toString()).toBe("");
  act(() => mocks.callback?.(mocks.adapter));
  await waitFor(() => expect(window.getSelection()!.toString()).toBe("Current documentCurrent ending."));
});
