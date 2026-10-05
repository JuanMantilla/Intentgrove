// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(),
  selectFile: vi.fn(),
  listEntries: vi.fn(),
  cancelListing: vi.fn(),
  readDocument: vi.fn(),
  getConfirmedDocument: vi.fn(),
  resolveLink: vi.fn(),
  readImage: vi.fn(),
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

function emit(name: string, payload: unknown) {
  const listener = mocks.listeners[name];
  expect(listener, `missing ${name} listener`).toBeTypeOf("function");
  return act(async () => listener({ payload }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  for (const key of Object.keys(mocks.listeners)) delete mocks.listeners[key];
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture" });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.listEntries.mockResolvedValue({
    entries: [{ name: "a.md", kind: "markdown" }, { name: "b.md", kind: "markdown" }, { name: "docs", kind: "directory" }],
    nextOffset: null,
    snapshotId: "initial"
  });
  mocks.readDocument.mockImplementation(async (request: { segments?: string[] }) => {
    const name = request.segments?.at(-1) ?? "a.md";
    return {
      fileId: name, identityKey: `1:${name}`, name, displayPath: `/tmp/fixture/${name}`,
      content: `# ${name}\n\nOriginal passage`, diskVersion: `${name}-v1`
    };
  });
});

afterEach(cleanup);

describe("automatic refresh", () => {
  it("updates an inactive clean tab without taking focus or losing the active passage", async () => {
    mocks.getConfirmedDocument.mockResolvedValue({
      fileId: "a.md", identityKey: "1:a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      content: "# a.md\n\nUpdated passage", diskVersion: "a-v2"
    });
    const { container } = render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("a.md"));
    await screen.findByText("Original passage");
    const scroll = container.querySelector(".reader-scroll") as HTMLDivElement;
    scroll.scrollTop = 180;
    fireEvent.scroll(scroll);
    fireEvent.click(screen.getByTitle("b.md"));
    await screen.findByRole("heading", { name: "b.md" });
    scroll.scrollTop = 320;
    fireEvent.scroll(scroll);

    await emit("refresh:file_changed", {
      generation: 1, fileId: "a.md", diskVersion: "a-v2", identityKey: "1:a.md", checkedAt: Date.now()
    });
    await waitFor(() => expect(mocks.getConfirmedDocument).toHaveBeenCalledWith("a.md", "a-v2", 1));
    expect(screen.getByRole("tab", { name: /b\.md/ }).getAttribute("aria-selected")).toBe("true");
    expect(scroll.scrollTop).toBe(320);
    fireEvent.click(screen.getByRole("tab", { name: /a\.md/ }));
    expect(await screen.findByText("Updated passage")).toBeTruthy();
    expect(scroll.scrollTop).toBe(180);
  });

  it("refreshes a changed expanded branch without collapsing it or shifting the reader", async () => {
    let docsVersion = 1;
    mocks.listEntries.mockImplementation(async (_rootId: string, segments: string[]) => ({
      entries: segments.length
        ? docsVersion === 1
          ? [{ name: "one.md", kind: "markdown" }]
          : [{ name: "one.md", kind: "markdown" }, { name: "two.md", kind: "markdown" }]
        : [{ name: "a.md", kind: "markdown" }, { name: "docs", kind: "directory" }],
      nextOffset: null,
      snapshotId: segments.length ? "docs-v2" : "root-v1"
    }));
    const { container } = render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("a.md"));
    fireEvent.click(screen.getByTitle("docs"));
    await screen.findByTitle("docs/one.md");
    const reader = container.querySelector(".reader-scroll") as HTMLDivElement;
    reader.scrollTop = 275;
    fireEvent.scroll(reader);
    const treeScroll = container.querySelector(".tree-scroll") as HTMLDivElement;
    treeScroll.scrollTop = 75;
    fireEvent.scroll(treeScroll);
    mocks.listEntries.mockClear();
    docsVersion = 2;

    await emit("refresh:directory_changed", { generation: 1, rootId: "root", segments: ["docs"], snapshotId: "docs-v2" });
    expect(await screen.findByTitle("docs/two.md")).toBeTruthy();
    expect(screen.getByTitle("docs/one.md")).toBeTruthy();
    expect(reader.scrollTop).toBe(275);
    expect(treeScroll.scrollTop).toBe(75);
    expect(screen.getByRole("tab", { name: /a\.md/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("ignores events from an older workspace generation", async () => {
    mocks.getConfirmedDocument.mockResolvedValue({
      fileId: "a.md", identityKey: "1:a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      content: "# a.md\n\nNew", diskVersion: "a-v2"
    });
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("a.md"));
    await screen.findByText("Original passage");
    mocks.selectRoot.mockResolvedValueOnce({ id: "next", name: "next", displayPath: "/tmp/next" });
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open folder" }));
    await waitFor(() => expect(screen.queryByRole("tab", { name: /a\.md/ })).toBeNull());
    await emit("refresh:file_changed", {
      generation: 1, fileId: "a.md", diskVersion: "a-v2", identityKey: "1:a.md", checkedAt: Date.now()
    });
    expect(mocks.getConfirmedDocument).not.toHaveBeenCalled();
  });
});
