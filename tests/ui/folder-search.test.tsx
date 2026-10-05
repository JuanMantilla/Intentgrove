// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FolderSearchPanel from "../../src/app/FolderSearchPanel";
import type { FolderSearchBatch } from "../../src/app/api";

const mocks = vi.hoisted(() => ({
  startFolderSearch: vi.fn(), cancelFolderSearch: vi.fn(), openSearchHit: vi.fn(),
  listener: null as null | ((event: { payload: FolderSearchBatch }) => void)
}));
vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (_name, callback) => {
  mocks.listener = callback;
  return () => { mocks.listener = null; };
}) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listener = null;
  mocks.startFolderSearch.mockResolvedValue({ jobId: "job-1", generation: 1 });
  mocks.cancelFolderSearch.mockResolvedValue(true);
  mocks.openSearchHit.mockResolvedValue({
    document: { fileId: "file-1", name: "a.md", displayPath: "/fixture/a.md",
      identityKey: "1:2", content: "# Needle", diskVersion: "v1" },
    line: 1, ordinal: 0, changed: false, matchMoved: false
  });
});
afterEach(cleanup);

const root = { id: "root-1", name: "fixture", displayPath: "/fixture", generation: 1 };
const hit = { id: "hit-1", segments: ["a.md"], path: "a.md", line: 1,
  startByte: 2, endByte: 8, context: "# Needle", kind: "content" as const,
  ignored: false, version: "v1" };

describe("folder search panel", () => {
  it("stops a pending start and cancels the job as soon as its ID arrives", async () => {
    let resolve!: (value: unknown) => void;
    mocks.startFolderSearch.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    render(<FolderSearchPanel root={root} locale="en" onOpen={vi.fn()} />);
    await waitFor(() => expect(mocks.listener).toBeTruthy());
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Needle" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await act(async () => resolve({ jobId: "pending", generation: 1 }));
    expect(mocks.cancelFolderSearch).toHaveBeenCalledWith("pending");
    expect(screen.getByRole("status").textContent).toContain("Stopped · partial results");
  });
  it("does not let an older cancellation stop a replacement search", async () => {
    let resolve!: (value: boolean) => void;
    mocks.startFolderSearch.mockResolvedValueOnce({ jobId: "old", generation: 1 })
      .mockResolvedValueOnce({ jobId: "new", generation: 1 });
    render(<FolderSearchPanel root={root} locale="en" onOpen={vi.fn()} />);
    await waitFor(() => expect(mocks.listener).toBeTruthy());
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Needle" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(mocks.startFolderSearch).toHaveBeenCalledTimes(1));
    await act(async () => {});
    mocks.cancelFolderSearch.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Other" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(mocks.startFolderSearch).toHaveBeenCalledTimes(2));
    await act(async () => resolve(true));
    expect(screen.getByRole("status").textContent).toContain("Searching…");
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
  });

  it("shows verified batches, stops with partial results and opens through the native hit command", async () => {
    const onOpen = vi.fn().mockResolvedValue(undefined);
    render(<FolderSearchPanel root={root} locale="en" onOpen={onOpen} />);
    await waitFor(() => expect(mocks.listener).toBeTruthy());
    fireEvent.change(screen.getByRole("searchbox", { name: "Search folder" }),
      { target: { value: "Needle" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(mocks.startFolderSearch).toHaveBeenCalledWith(
      "root-1", "Needle", "both", false));
    mocks.listener?.({ payload: { jobId: "job-1", generation: 1, results: [hit],
      scanned: 12, skipped: 3, matched: 1, status: "searching", errorCode: null } });
    expect(await screen.findByRole("button", { name: /a\.md/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(mocks.cancelFolderSearch).toHaveBeenCalledWith("job-1"));
    expect(screen.getByText(/Stopped · partial results/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /a\.md/ }));
    await waitFor(() => expect(mocks.openSearchHit).toHaveBeenCalledWith("job-1", "hit-1"));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ line: 1 }), hit, "Needle");
  });

  it("clears old results when the query changes and rejects a late batch", async () => {
    render(<FolderSearchPanel root={root} locale="es" onOpen={vi.fn()} />);
    await waitFor(() => expect(mocks.listener).toBeTruthy());
    const input = screen.getByRole("searchbox", { name: "Buscar en la carpeta" });
    fireEvent.change(input, { target: { value: "Needle" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(mocks.startFolderSearch).toHaveBeenCalled());
    fireEvent.change(input, { target: { value: "Other" } });
    mocks.listener?.({ payload: { jobId: "job-1", generation: 1, results: [hit],
      scanned: 12, skipped: 3, matched: 1, status: "complete", errorCode: null } });
    expect(screen.queryByRole("button", { name: /a\.md/ })).toBeNull();
    expect(screen.getByText(/Escribe texto/)).toBeTruthy();
  });

  it("invalidates the current query and waits for explicit Search when include ignored changes", async () => {
    mocks.startFolderSearch.mockResolvedValueOnce({ jobId: "job-1", generation: 1 })
      .mockResolvedValueOnce({ jobId: "job-2", generation: 1 });
    render(<FolderSearchPanel root={root} locale="en" onOpen={vi.fn()} />);
    await waitFor(() => expect(mocks.listener).toBeTruthy());
    fireEvent.change(screen.getByRole("searchbox", { name: "Search folder" }),
      { target: { value: "Needle" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(mocks.startFolderSearch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("checkbox", { name: "Include ignored files" }));
    expect(mocks.startFolderSearch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(mocks.startFolderSearch).toHaveBeenLastCalledWith(
      "root-1", "Needle", "both", true));
    expect(mocks.cancelFolderSearch).toHaveBeenCalledWith("job-1");
  });
});
