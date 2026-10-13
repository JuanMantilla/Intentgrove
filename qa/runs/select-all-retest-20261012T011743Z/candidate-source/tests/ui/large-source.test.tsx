// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  loadWorkspaceSession: vi.fn(), listRecentItems: vi.fn(), selectFile: vi.fn(),
  readDocument: vi.fn(), inspectLargeFile: vi.fn(), openLargeSource: vi.fn(),
  cancelLargeOpen: vi.fn(),
  readSourceWindow: vi.fn(), sourceLineOffset: vi.fn(), findLargeSource: vi.fn(),
  cancelLargeFind: vi.fn(),
  copySourceSelection: vi.fn(),
  closeLargeSource: vi.fn(), checkpointWorkspaceSession: vi.fn()
}));
vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.loadWorkspaceSession.mockResolvedValue(null);
  mocks.listRecentItems.mockResolvedValue({ items: [], recoveredCorrupt: false });
  mocks.selectFile.mockResolvedValue({ id: "large-1", name: "large.md",
    displayPath: "/tmp/fixture/large.md", generation: 1 });
  mocks.readDocument.mockRejectedValue({ code: "oversize", message: "fixture exceeds rich limit" });
  mocks.inspectLargeFile.mockResolvedValue({ fileId: "large-1", name: "large.md",
    displayPath: "/tmp/fixture/large.md", sizeBytes: 12 * 1024 * 1024, overLimit: false });
  mocks.openLargeSource.mockResolvedValue({ snapshotId: "snapshot-1", fileId: "large-1",
    sizeBytes: 12 * 1024 * 1024, lineCount: 120_000, diskVersion: "v1" });
  mocks.readSourceWindow.mockResolvedValue({ startByte: 0, endByte: 12, sizeBytes: 12 * 1024 * 1024,
    lineNumber: 1, text: "# first line\n" });
  mocks.sourceLineOffset.mockResolvedValue(100_000);
  mocks.findLargeSource.mockResolvedValue(100_000);
  mocks.closeLargeSource.mockResolvedValue(undefined);
  mocks.cancelLargeFind.mockResolvedValue(undefined);
  mocks.cancelLargeOpen.mockResolvedValue(undefined);
  mocks.copySourceSelection.mockResolvedValue("#");
  mocks.checkpointWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1 });
});
afterEach(cleanup);

describe("large source consent and bounded view", () => {
  it("requires explicit consent and never sends the oversized document to MarkdownView", async () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open file" })[0]);
    expect(await screen.findByRole("heading", { name: /too large for rich reading/ })).toBeTruthy();
    expect(mocks.openLargeSource).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open read-only source" }));
    await waitFor(() => expect(mocks.openLargeSource).toHaveBeenCalledWith("large-1", true));
    expect(await screen.findByText("# first line")).toBeTruthy();
    expect(mocks.readSourceWindow).toHaveBeenCalledWith("snapshot-1", 0);
    const source = document.querySelector("pre.large-source-text")!;
    const range = document.createRange();
    range.setStart(source.firstChild!, 0); range.setEnd(source.firstChild!, 1);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
    Object.defineProperty(navigator, "clipboard", { configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    fireEvent.click(screen.getByRole("button", { name: "Copy selection" }));
    await waitFor(() => expect(mocks.copySourceSelection).toHaveBeenCalledWith("snapshot-1", 0, 1));
  });

  it("rejects a file beyond 50 MiB before opt-in", async () => {
    mocks.inspectLargeFile.mockResolvedValue({ fileId: "large-1", name: "large.md",
      displayPath: "/tmp/fixture/large.md", sizeBytes: 51 * 1024 * 1024, overLimit: true });
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open file" })[0]);
    expect(await screen.findByRole("heading", { name: /exceeds the 50 MiB/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open read-only source" })).toBeNull();
    expect(mocks.openLargeSource).not.toHaveBeenCalled();
  });
  it("pinches only the bounded source text and preserves ordinary scrolling and native consent", async () => {
    render(<App />); fireEvent.click(screen.getAllByRole("button", { name: "Open file" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only source" }));
    await screen.findByText("# first line");
    const source = document.querySelector<HTMLPreElement>(".large-source-text")!;
    const normal = new WheelEvent("wheel", { deltaY: 60, cancelable: true }); fireEvent(source, normal);
    expect(normal.defaultPrevented).toBe(false);
    fireEvent(source, new WheelEvent("wheel", { deltaY: -100, ctrlKey: true, cancelable: true }));
    expect(Number(source.dataset.sourceZoom)).toBeGreaterThan(1); expect(parseFloat(source.style.fontSize)).toBeGreaterThan(12);
    expect(document.querySelector<HTMLElement>(".large-source-toolbar")?.style.fontSize).toBe("");
    expect(source.textContent).toBe("# first line\n"); expect(mocks.readSourceWindow).toHaveBeenCalledTimes(1);
    expect(mocks.openLargeSource).toHaveBeenCalledWith("large-1", true);
  });

  it("replaces old rich content when the same file grows past 10 MiB", async () => {
    mocks.readDocument.mockResolvedValueOnce({ fileId: "large-1", name: "large.md",
      displayPath: "/tmp/fixture/large.md", identityKey: "1:2",
      content: "# Old readable content", diskVersion: "v1" });
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open file" })[0]);
    expect(await screen.findByRole("heading", { name: "Old readable content" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Open file" })[0]);
    expect(await screen.findByRole("heading", { name: /too large for rich reading/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Old readable content" })).toBeNull();
  });

  it("searches from byte zero and invalidates an obsolete Find", async () => {
    let resolveFind: ((value: number | null) => void) | undefined;
    mocks.findLargeSource.mockImplementationOnce(() => new Promise<number | null>((resolve) => {
      resolveFind = resolve;
    }));
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open file" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only source" }));
    await screen.findByText("# first line");
    fireEvent.change(screen.getByRole("searchbox", { name: "Find in source" }),
      { target: { value: "first" } });
    fireEvent.click(screen.getByRole("button", { name: "Find in source" }));
    await waitFor(() => expect(mocks.findLargeSource).toHaveBeenCalledWith(
      "snapshot-1", "first", 0, expect.any(Number)));
    fireEvent.click(screen.getByRole("button", { name: "Stop Find" }));
    await waitFor(() => expect(mocks.cancelLargeFind).toHaveBeenCalled());
    resolveFind?.(0);
    await waitFor(() => expect(mocks.readSourceWindow).toHaveBeenCalledTimes(1));
  });
});
