import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";
const mocks = vi.hoisted(() => ({ selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(),
  listEditSections: vi.fn(), beginSectionEdit: vi.fn(), saveSectionEdit: vi.fn() }));
vi.mock("../../src/app/platform", async (original) => ({ ...await original<typeof import("../../src/app/platform")>(),
  isWindows: true, editingAvailable: false,
  commandPressed: (event: KeyboardEvent) => event.ctrlKey && !event.metaKey && !event.altKey,
  shortcutHint: (key: string, shift = false) => `Ctrl+${shift ? "Shift+" : ""}${key}`,
  deviceText: (text: string) => text.replaceAll("this Mac", "this device").replaceAll("este Mac", "este dispositivo").replaceAll("macOS", "Windows") }));
vi.mock("../../src/app/api", async (original) => ({ ...await original<typeof import("../../src/app/api")>(), api: mocks }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });
it("composes the Windows read-only interface and Ctrl picker without invoking edits", async () => {
  mocks.selectRoot.mockResolvedValue({ id: "r", name: "fixture", displayPath: "C:\\fixture", generation: 1 });
  mocks.selectFile.mockResolvedValue(null);
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "a.md", kind: "markdown" }], snapshotId: "s", nextOffset: null });
  mocks.readDocument.mockResolvedValue({ fileId: "f", name: "a.md", displayPath: "C:\\fixture\\a.md", identityKey: "1:2", content: "# One\nalpha\n", diskVersion: "v1" });
  render(<App />);
  expect(screen.getByText(/Documents stay on this device/)).toBeTruthy();
  fireEvent.keyDown(window, { key: "o", ctrlKey: true });
  await waitFor(() => expect(mocks.selectFile).toHaveBeenCalledTimes(1));
  fireEvent.keyDown(window, { key: "o", metaKey: true });
  expect(mocks.selectFile).toHaveBeenCalledTimes(1);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("a.md"));
  const edit = await screen.findByRole("button", { name: "Edit section" });
  expect((edit as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/Windows preview is read-only/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Edit section “One”" })).toBeNull();
  fireEvent.keyDown(window, { key: "s", ctrlKey: true });
  expect(mocks.listEditSections).not.toHaveBeenCalled();
  expect(mocks.beginSectionEdit).not.toHaveBeenCalled();
  expect(mocks.saveSectionEdit).not.toHaveBeenCalled();
});
it("preserves platform-specific modifier rules and translated device copy", async () => {
  const actual = await vi.importActual<typeof import("../../src/app/platform")>("../../src/app/platform");
  expect(actual.commandPressed({ ctrlKey: true, metaKey: false, altKey: false }, true)).toBe(true);
  expect(actual.commandPressed({ ctrlKey: true, metaKey: false, altKey: true }, true)).toBe(false);
  expect(actual.commandPressed({ ctrlKey: false, metaKey: true, altKey: false }, false)).toBe(true);
  expect(actual.commandPressed({ ctrlKey: true, metaKey: false, altKey: false }, false)).toBe(false);
  expect(actual.shortcutHint("O", true, true)).toBe("Ctrl+Shift+O");
  expect(actual.shortcutHint("O", true, false)).toBe("⇧⌘O");
  expect(actual.deviceText("en este Mac", true)).toBe("en este dispositivo");
  expect(actual.deviceText("on this Mac", false)).toBe("on this Mac");
});
it("derives Windows breadcrumbs from display paths without authorizing siblings", async () => {
  const { workspaceSegments, distinguishingParent } = await import("../../src/app/documentIdentity");
  expect(workspaceSegments("C:\\repo\\docs\\a.md", "C:\\repo")).toEqual(["docs", "a.md"]);
  expect(workspaceSegments("C:\\repo-other\\a.md", "C:\\repo")).toBeNull();
  expect(distinguishingParent({ name: "a.md", displayPath: "C:\\repo\\one\\a.md" }, [
    { name: "a.md", displayPath: "C:\\repo\\two\\a.md" }])).toBe("one");
});
