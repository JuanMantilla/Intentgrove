// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PreviewLoading from "../../src/reader/PreviewLoading";
import LargeSourceView from "../../src/reader/LargeSourceView";
import ImageView from "../../src/reader/ImageView";
import MarkdownView from "../../src/reader/MarkdownView";
import { parseBounded } from "../../src/reader/bounded-parser";
import { BLOCK_PROTOCOL } from "../../src/reader/block-budget";
import { api, type SourceWindow, type ImageResponse } from "../../src/app/api";

vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => { vi.spyOn(api, "cancelLargeFind").mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const opened = { snapshotId: "disposable", fileId: "fixture", sizeBytes: 1000, lineCount: 20, diskVersion: "v1" };
const windowAt = (startByte: number, text: string): SourceWindow => ({ startByte, endByte: startByte + 20, sizeBytes: 1000, lineNumber: 1, text });

it("does not invent a percentage for unknown totals; measured progress uses actual bytes", () => {
  const view = render(<PreviewLoading label="Preparing source" progress={{}} detail="148 examined" />);
  expect(screen.getByRole("progressbar").hasAttribute("aria-valuenow")).toBe(false);
  expect(screen.getByText("148 examined")).toBeTruthy();
  view.rerender(<PreviewLoading label="Preparing source" progress={{completed: 42, total: 100}} />);
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("42");
  view.rerender(<PreviewLoading label="Preparing source" progress={{completed: 42, total: 0}} />);
  expect(screen.getByRole("progressbar").hasAttribute("aria-valuenow")).toBe(false);
});
it("pauses feedback for hidden documents and offscreen regions without removing accessible status", () => {
  let intersect!: IntersectionObserverCallback;
  vi.stubGlobal("IntersectionObserver", class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect() {} });
  const view = render(<PreviewLoading label="Cargando…" />);
  act(() => intersect([{isIntersecting: false}] as IntersectionObserverEntry[], {} as IntersectionObserver));
  expect(screen.getByRole("status").getAttribute("data-motion")).toBe("off");
  act(() => intersect([{isIntersecting: true}] as IntersectionObserverEntry[], {} as IntersectionObserver));
  Object.defineProperty(document, "hidden", {configurable: true, value: true});
  fireEvent(document, new Event("visibilitychange"));
  expect(screen.getByRole("status").getAttribute("data-motion")).toBe("off");
  Object.defineProperty(document, "hidden", {configurable: true, value: false});
  fireEvent(document, new Event("visibilitychange"));
  expect(view.container.querySelectorAll(".preview-loading-dots i")).toHaveLength(3);
});
it("retains source, scroll and focused control through a failed replacement, then retries", async () => {
  const next = deferred<SourceWindow>();
  vi.spyOn(api, "readSourceWindow").mockResolvedValueOnce(windowAt(0, "Known readable source"))
    .mockReturnValueOnce(next.promise).mockResolvedValueOnce(windowAt(20, "Verified replacement"));
  render(<LargeSourceView opened={opened} locale="en" onReload={() => {}} />);
  await screen.findByText("Known readable source");
  const source = document.querySelector("pre")!; source.scrollTop = 32;
  const button = screen.getByRole("button", {name:"Next window"}); button.focus(); fireEvent.click(button);
  expect(source.textContent).toBe("Known readable source"); expect(source.scrollTop).toBe(32); expect(document.activeElement).toBe(button);
  await act(async () => next.reject({code:"io_error"}));
  expect(source.textContent).toBe("Known readable source");
  fireEvent.click(button); await screen.findByText("Verified replacement");
});
it("ignores late source windows and late line lookups after a newer navigation", async () => {
  const old = deferred<SourceWindow>(), line = deferred<number>();
  vi.spyOn(api, "readSourceWindow").mockResolvedValueOnce(windowAt(0,"Initial"))
    .mockReturnValueOnce(old.promise).mockResolvedValueOnce(windowAt(980,"Newest"));
  vi.spyOn(api, "sourceLineOffset").mockReturnValue(line.promise);
  render(<LargeSourceView opened={opened} locale="en" onReload={() => {}} />);
  await screen.findByText("Initial"); fireEvent.click(screen.getByRole("button",{name:"Next window"}));
  fireEvent.click(screen.getByRole("button",{name:"Go to line"})); fireEvent.click(screen.getByRole("button",{name:"End"}));
  await screen.findByText("Newest");
  await act(async () => { old.resolve(windowAt(20,"Stale")); line.resolve(100); });
  expect(screen.queryByText("Stale")).toBeNull(); expect(api.readSourceWindow).not.toHaveBeenCalledWith("disposable",100);
});
it("keeps the image preview while visible detail tiles settle or fail", async () => {
  const tile = deferred<Awaited<ReturnType<typeof api.openImageTile>>>();
  vi.spyOn(api,"openImageTile").mockReturnValue(tile.promise);
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:disposable"), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLElement.prototype,"clientWidth","get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype,"clientHeight","get").mockReturnValue(300);
  const image: ImageResponse = {fileId:"fixture", name:"pixels.png",displayPath:"/disposable/pixels.png",identityKey:"1:2",diskVersion:"v1",format:"png",mime:"image/png",width:800,height:400,still:false,
    bytes:[137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,1,144,0,0,0,200]};
  render(<ImageView image={image} locale="en" />);
  fireEvent.click(screen.getByRole("button",{name:"Actual size"}));
  expect(document.querySelectorAll(".preview-loading")).toHaveLength(1);
  expect(screen.getByRole("img",{name:"pixels.png"})).toBeTruthy();
  await act(async () => tile.reject({code:"image_corrupt"}));
  await waitFor(() => expect(document.querySelector(".preview-loading")).toBeNull());
  expect(screen.getByRole("img",{name:"pixels.png"})).toBeTruthy();
  expect(document.querySelector(".image-detail-error")).toBeTruthy();
});
it("keeps a verified Markdown tree while its same-file replacement parses and ignores stale workers", async () => {
  const workers: Array<{onmessage?: (e: MessageEvent) => void; payload?: {generation:number}; terminate: () => void}> = [];
  vi.stubGlobal("Worker", class { onmessage?: (e:MessageEvent) => void; payload?: {generation:number}; constructor(){workers.push(this);} postMessage(p:{generation:number}){this.payload=p;} terminate(){} });
  const props = {fileId:"fixture",locale:"en" as const,onNavigate:()=>{}};
  const view = render(<MarkdownView {...props} content="# Initial\n\nReadable" />);
  const finish = (index:number, source:string) => act(() => workers[index].onmessage?.({data:{kind:"parsed",version:BLOCK_PROTOCOL,generation:workers[index].payload!.generation,...parseBounded(source)}} as MessageEvent));
  finish(0,"# Initial\n\nReadable"); expect(screen.getByRole("heading",{name:"Initial"})).toBeTruthy();
  view.rerender(<MarkdownView {...props} content="# Replacement" />);
  expect(screen.getByRole("heading",{name:"Initial"})).toBeTruthy(); expect(document.querySelector(".preview-loading")).toBeTruthy();
  view.rerender(<MarkdownView {...props} content="# Newest" />);
  finish(1,"# Replacement"); expect(screen.queryByRole("heading",{name:"Replacement"})).toBeNull();
  finish(2,"# Newest"); expect(screen.getByRole("heading",{name:"Newest"})).toBeTruthy();
  expect(screen.queryByRole("heading",{name:"Initial"})).toBeNull();
});
