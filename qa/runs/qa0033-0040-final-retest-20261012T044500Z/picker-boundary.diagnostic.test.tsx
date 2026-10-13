// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import filenameCases from "../fixtures/new-markdown-filenames.json";
import NewMarkdownDialog, { markdownFilename } from "/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3/src/app/NewMarkdownDialog";
import userEvent from "@testing-library/user-event";
import { typeRich } from "./rich-edit-helpers";
import InitialApp from "/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3/src/app/App";
let App = InitialApp;
let startupAppearance: typeof import("/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3/src/app/appearance").getAppearance | undefined;
const mocks = vi.hoisted(() => ({ selectRoot: vi.fn(), chooseMarkdownDestination: vi.fn(), cancelMarkdownDestination: vi.fn(), createMarkdownFile: vi.fn(), beginSectionEdit: vi.fn(), discardSectionEdit: vi.fn(), checkpointSectionEdit: vi.fn(), rememberRecentDocument: vi.fn(), loadWorkspaceSession: vi.fn(), listRecentItems: vi.fn(), listNativeEntries: vi.fn(),
  listSafetyCopies: vi.fn(), setNativeMenuState: vi.fn(), checkpointWorkspaceSession: vi.fn(), selectFile: vi.fn(), readDocument: vi.fn(), loadSectionRecovery: vi.fn(), listEditSections: vi.fn(),
  setTheme: vi.fn(), theme: vi.fn(), onThemeChanged: vi.fn(), appearanceUnlisten: vi.fn(),
  menu: null as null | ((event: { payload: string }) => void), native: false }));
vi.mock("/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3/src/app/api", async () => ({ ...await vi.importActual("/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3/src/app/api"), api: mocks }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => mocks.native, invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (name, callback) => { if (name === "native:menu") mocks.menu = callback; return () => {}; }) }));
// Faithful window/appearance boundary for native=true jsdom scenarios.
// This supplies the native dependency; it does not bypass production appearance.
vi.mock("@tauri-apps/api/window", async original => ({
  ...await original<typeof import("@tauri-apps/api/window")>(),
  getCurrentWindow: () => ({ setTheme: mocks.setTheme, theme: mocks.theme, onThemeChanged: mocks.onThemeChanged })
}));
const folder = { id: "granted", name: "Disposable", displayPath: "/tmp/disposable", generation: 1 };
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); mocks.native = false; mocks.menu = null;
  mocks.loadWorkspaceSession.mockResolvedValue(null); mocks.listRecentItems.mockResolvedValue({ items: [], recoveredCorrupt: false });
  mocks.listNativeEntries.mockResolvedValue([]); mocks.listSafetyCopies.mockResolvedValue(null); mocks.setNativeMenuState.mockResolvedValue(undefined);
  mocks.cancelMarkdownDestination.mockResolvedValue(undefined); mocks.rememberRecentDocument.mockResolvedValue(undefined);
  mocks.checkpointSectionEdit.mockResolvedValue({ sequence: 1, durationMs: 1 });
  mocks.chooseMarkdownDestination.mockResolvedValue(null); mocks.checkpointWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1 });
});
beforeEach(async () => {
  App = InitialApp;
  mocks.setTheme.mockResolvedValue(undefined);
  mocks.theme.mockResolvedValue("light");
  mocks.onThemeChanged.mockResolvedValue(mocks.appearanceUnlisten);
  if (expect.getState().currentTestName?.startsWith("retains the created tab on editor startup failure")) {
    // The original scenario owns a fresh singleton. No preceding nonnative
    // render is allowed to provide its native appearance prerequisite.
    vi.resetModules();
    App = (await import("/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3/src/app/App")).default;
    startupAppearance = (await import("/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3/src/app/appearance")).getAppearance;
  }
});
afterEach(() => {
  cleanup();
  startupAppearance?.().dispose();
  startupAppearance = undefined;
});
it("diagnostic: API invocation alone does not release legitimate picker ownership", async () => {
  let concurrentClickDisabled: boolean|undefined;
  mocks.chooseMarkdownDestination.mockImplementationOnce(() => {
    queueMicrotask(() => {
      const button=screen.getByText("Choose folder…") as HTMLButtonElement;
      concurrentClickDisabled=button.disabled;
      mocks.chooseMarkdownDestination.mockRejectedValueOnce({code:"denied",message:"test"});
      fireEvent.click(button);
    });
    return Promise.resolve(null);
  });
  render(<NewMarkdownDialog locale="en" defaultDestination={null} onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Filename"),{target:{value:"first.MD"}});
  fireEvent.click(screen.getByText("Choose folder…"));
  await waitFor(()=>expect(concurrentClickDisabled).toBe(true));
  expect(mocks.chooseMarkdownDestination).toHaveBeenCalledOnce();
  expect(screen.queryByRole("alert")).toBeNull();
  await waitFor(()=>expect((screen.getByText("Choose folder…") as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByText("Choose folder…"));
  expect((await screen.findByRole("alert")).textContent).toMatch(/Permission denied/);
  expect(screen.getByLabelText("Filename").getAttribute("value")).toBe("first.MD");
});
