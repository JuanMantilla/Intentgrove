// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsWindow from "../../src/app/SettingsWindow";
import { newerSettings, type SettingsSnapshot } from "../../src/app/settings-contract";

const bridge = vi.hoisted(() => ({ get: vi.fn(), apply: vi.fn(), acknowledge: vi.fn(), close: vi.fn() }));
vi.mock("../../src/app/settings-contract", async importOriginal => ({ ...await importOriginal<typeof import("../../src/app/settings-contract")>(), settingsApi: bridge }));
vi.mock("../../src/app/appearance", () => ({ APPEARANCE_KEY: "md-reader-appearance", useAppearance: () => ({ nativeWarning: false }), getAppearance: () => ({ applyPreference: vi.fn() }) }));
let snapshot: SettingsSnapshot;
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  snapshot = { revision: 4, activation: 1, group: "Reading", ownerAvailable: true, requestId: null, persistence: "saved", nativeThemeFailed: false, retryPatch: null,
    values: { language: "en", appearance: "system", readingFont: "roboto", readingSize: 16, readingLineHeight: 1.6, readingWidth: 760, documentsAndImagesOnly: true } };
  bridge.get.mockImplementation(async () => snapshot);
  bridge.apply.mockImplementation(async (requestId, revision, patch) => {
    expect(revision).toBe(snapshot.revision);
    snapshot = { ...snapshot, requestId, revision: revision + 1, persistence: "pending", retryPatch: patch, values: { ...snapshot.values, ...patch } };
    return snapshot;
  });
  bridge.acknowledge.mockImplementation(async (requestId, revision, persistence) => {
    expect(requestId).toBe(snapshot.requestId); expect(revision).toBe(snapshot.revision);
    snapshot = { ...snapshot, persistence, retryPatch: persistence === "saved" ? null : snapshot.retryPatch }; return snapshot;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("IR-04 preference-only Settings entry", () => {
  it("renders the three groups and commits General using existing storage keys and correlated acknowledgments", async () => {
    render(<SettingsWindow />);
    await screen.findByRole("heading", { name: "Project tree" });
    expect(document.activeElement?.id).toBe("settings-reading");
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    await waitFor(() => expect(bridge.acknowledge).toHaveBeenCalledWith(snapshot.requestId, 5, "saved"));
    expect(localStorage.getItem("md-reader-appearance")).toBe('{"schema":1,"mode":"dark"}');
    fireEvent.click(screen.getByRole("button", { name: "Done" })); expect(bridge.close).toHaveBeenCalledOnce();
  });
  it("retains an applied General value on storage failure and Retry uses a fresh ID/revision", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota"); });
    render(<SettingsWindow />); await screen.findByRole("heading", { name: "General" });
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "es" } });
    await screen.findByRole("button", { name: "Reintentar" });
    expect(snapshot.persistence).toBe("failed"); expect(snapshot.values.language).toBe("es");
    const oldId = snapshot.requestId;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(snapshot.persistence).toBe("saved"));
    expect(snapshot.requestId).not.toBe(oldId); expect(snapshot.revision).toBe(6);
    expect(localStorage.getItem("md-reader-locale")).toBe("es");
  });
  it("owner loss disables Reading and tree while General remains available", async () => {
    snapshot = { ...snapshot, ownerAvailable: false };
    render(<SettingsWindow />); await screen.findByText(/workspace owner is unavailable/);
    expect(screen.getByRole("spinbutton", { name: "Text size (px)" }).closest("fieldset")?.disabled).toBe(true);
    expect(screen.getByRole("checkbox").closest("fieldset")?.disabled).toBe(true);
    expect(screen.getByRole("combobox", { name: "Language" }).closest("fieldset")?.disabled).toBe(false);
  });
  it("numeric Escape reverts the draft first; window Escape closes without any file/session operation", async () => {
    render(<SettingsWindow />);
    await waitFor(() => expect(document.activeElement?.id).toBe("settings-reading"));
    const size = screen.getByRole("spinbutton", { name: "Text size (px)" });
    size.focus();
    fireEvent.change(size, { target: { value: "23" } }); fireEvent.keyDown(size, { key: "Escape" });
    expect((size as HTMLInputElement).value).toBe("16"); expect(bridge.close).not.toHaveBeenCalled(); expect(bridge.apply).not.toHaveBeenCalled();
    fireEvent.keyDown(size, { key: "Escape" }); expect(bridge.close).toHaveBeenCalledOnce();
  });
  it("keeps an edited numeric draft through a pending owner publication", async () => {
    let publish!: (value: SettingsSnapshot) => void;
    bridge.get.mockImplementationOnce(() => new Promise(resolve => { publish = resolve; }));
    render(<SettingsWindow />);
    expect(screen.queryByRole("spinbutton")).toBeNull();
    await act(async () => publish(snapshot));
    await waitFor(() => expect(document.activeElement?.id).toBe("settings-reading"));
    const size = screen.getByRole("spinbutton", { name: "Text size (px)" });
    size.focus(); fireEvent.change(size, { target: { value: "23" } });
    fireEvent.keyDown(size, { key: "Escape" });
    expect((size as HTMLInputElement).value).toBe("16");
    expect(bridge.close).not.toHaveBeenCalled(); expect(bridge.apply).not.toHaveBeenCalled();
    fireEvent.keyDown(size, { key: "Escape" }); expect(bridge.close).toHaveBeenCalledOnce();
  });
  it("closes on Escape when native focus lands on the document after a preference commit", async () => {
    render(<SettingsWindow />);
    await waitFor(() => expect(document.activeElement?.id).toBe("settings-reading"));
    fireEvent.keyDown(document.documentElement, { key: "Escape" });
    expect(bridge.close).toHaveBeenCalledOnce();
  });
  it("shows the default and all layout descriptions but refuses unsupported native writes", async () => {
    render(<SettingsWindow />);
    const margin = await screen.findByRole("radio", { name: /Margin/ });
    expect((margin as HTMLInputElement).checked).toBe(true);
    expect(margin.closest("fieldset")?.disabled).toBe(true);
    expect(screen.getByRole("radio", { name: /Folio/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Atlas/ })).toBeTruthy();
    expect(screen.getByText(/native version cannot yet save/)).toBeTruthy();
    expect(bridge.apply).not.toHaveBeenCalled();
  });
  it.each(["margin", "folio", "atlas"] as const)("dispatches %s only through the supported Settings owner", async layout => {
    snapshot.values.workspaceLayout = "margin";
    render(<SettingsWindow />);
    const radio = await screen.findByRole("radio", { name: new RegExp(layout, "i") });
    expect(radio.closest("fieldset")?.disabled).toBe(false);
    expect(screen.queryByText(/native version cannot yet save/)).toBeNull();
    fireEvent.click(radio);
    if (layout !== "margin") await waitFor(() => expect(bridge.apply).toHaveBeenCalledWith(expect.any(String), 4, { workspaceLayout: layout }));
    expect(localStorage.length).toBe(0);
    expect(bridge.acknowledge).not.toHaveBeenCalled(); // Only the workspace may acknowledge its durable checkpoint.
  });
  it("restores the explicit layout in Spanish without applying a default write", async () => {
    snapshot.values.workspaceLayout = "atlas"; snapshot.values.language = "es";
    render(<SettingsWindow />);
    const atlas = await screen.findByRole("radio", { name: /Atlas/ });
    expect((atlas as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("heading", { name: "Distribución del espacio de trabajo" })).toBeTruthy();
    expect(bridge.apply).not.toHaveBeenCalled();
  });
  it("late invoke completions cannot undo an acknowledgment or newer owner revision", () => {
    const pending = { ...snapshot, requestId: "a", persistence: "pending" as const };
    const saved = { ...pending, persistence: "saved" as const };
    expect(newerSettings(saved, pending)).toBe(saved);
    expect(newerSettings({ ...saved, revision: 8 }, pending).revision).toBe(8);
    const laterGroup = { ...pending, revision: 3, activation: 2, group: "ProjectTree" as const };
    expect(newerSettings(saved, laterGroup)).toMatchObject({ revision: 4, activation: 2, group: "ProjectTree", persistence: "saved" });
    expect(newerSettings(laterGroup, { ...saved, activation: 1 })).toMatchObject({ revision: 4, activation: 2, group: "ProjectTree" });
  });
});

it("shows known rows until the authoritative snapshot and labels the real persistence wait", async () => {
  let loaded!: (value: SettingsSnapshot) => void;
  bridge.get.mockImplementation(() => new Promise(resolve => {loaded = resolve;}));
  const view = render(<SettingsWindow />);
  expect(view.container.querySelector(".loading-rows")).toBeTruthy();
  expect(screen.queryByRole("radio")).toBeNull();
  await act(async()=>loaded(snapshot));
  let applied!: (value: SettingsSnapshot) => void;
  bridge.apply.mockImplementationOnce(()=>new Promise(resolve=>{applied=resolve;}));
  fireEvent.click(screen.getByRole("radio",{name:"Dark"}));
  expect(screen.getByRole("status",{name:"Applying preference"})).toBeTruthy();
  expect(screen.getByRole("status",{name:"Applying preference"}).closest("section")?.getAttribute("aria-labelledby")).toBe("settings-general");
  await act(async()=>{ snapshot = {...snapshot,requestId:"pending",revision:5,persistence:"pending",values:{...snapshot.values,appearance:"dark"}}; applied(snapshot); });
  await waitFor(()=>expect(screen.queryByRole("status",{name:"Applying preference"})).toBeNull());
});
