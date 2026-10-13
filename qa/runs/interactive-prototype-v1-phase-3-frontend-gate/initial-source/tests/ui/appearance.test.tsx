// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";
import { APPEARANCE_KEY, createAppearanceController, getAppearance, readPreference } from "../../src/app/appearance";

afterEach(() => { cleanup(); vi.restoreAllMocks(); getAppearance().applyPreference("system"); localStorage.clear(); });
function fixture(dark = false, saved: string | null = null) {
  const media = Object.assign(new EventTarget(), { matches: dark }) as unknown as MediaQueryList;
  const storage = { getItem: vi.fn(() => saved), setItem: vi.fn() };
  const root = document.createElement("div");
  const options = { media, storage, root, events: window };
  return { ...options, changeSystem(value: boolean) {
    Object.assign(media, { matches: value }); media.dispatchEvent(new Event("change"));
  } };
}

describe("F002A appearance preference and native synchronization", () => {
  it.each([null, "broken", "null", "[]", '{"schema":2,"mode":"dark"}',
    '{"schema":1,"mode":"remote"}', " ".repeat(257)])("falls back safely for %s", (raw) => {
    expect(readPreference(raw)).toBe("system");
  });

  it("applies saved Dark synchronously before content and restores the enum after restart", () => {
    const env = fixture(false, '{"schema":1,"mode":"dark"}');
    const controller = createAppearanceController(env);
    expect(env.root.dataset.theme).toBe("dark");
    expect(env.root.style.colorScheme).toBe("dark");
    controller.applyPreference("light");
    expect(env.storage.setItem).toHaveBeenCalledWith(APPEARANCE_KEY, '{"schema":1,"mode":"light"}');
    const restored = createAppearanceController(fixture(true, env.storage.setItem.mock.calls[0][1]));
    expect(restored.getSnapshot().preference).toBe("light");
    expect(restored.getSnapshot().resolved).toBe("light");
    controller.dispose(); restored.dispose();
  });

  it("tracks system events, preserves explicit choices and removes subscriptions on disposal", () => {
    const env = fixture(); const controller = createAppearanceController(env);
    const subscriber = vi.fn(); controller.subscribe(subscriber);
    env.changeSystem(true);
    expect(controller.getSnapshot().resolved).toBe("dark");
    controller.applyPreference("light"); env.changeSystem(false); env.changeSystem(true);
    expect(controller.getSnapshot().resolved).toBe("light");
    controller.applyPreference("system");
    expect(controller.getSnapshot().resolved).toBe("dark");
    window.dispatchEvent(new StorageEvent("storage", { key: APPEARANCE_KEY, newValue: '{"schema":1,"mode":"light"}' }));
    expect(controller.getSnapshot().preference).toBe("light");
    controller.dispose(); subscriber.mockClear(); env.changeSystem(false);
    window.dispatchEvent(new StorageEvent("storage", { key: APPEARANCE_KEY, newValue: null }));
    expect(subscriber).not.toHaveBeenCalled();
  });

  it("retains readable session colors and warns when preference storage fails", () => {
    const env = fixture(true);
    env.storage.getItem.mockImplementation(() => { throw new Error("unavailable"); });
    env.storage.setItem.mockImplementation(() => { throw new Error("quota"); });
    const controller = createAppearanceController(env);
    expect(controller.getSnapshot()).toMatchObject({ preference: "system", resolved: "dark", persistenceWarning: true });
    controller.applyPreference("light");
    expect(controller.getSnapshot()).toMatchObject({ preference: "light", resolved: "light", persistenceWarning: true });
    controller.dispose();
  });

  it("orders native overrides and resolves System only after releasing the last override", async () => {
    let finishFirst!: () => void;
    let notifyTheme!: (event: { payload: "light" | "dark" }) => void;
    const unlisten = vi.fn();
    const native = {
      setTheme: vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }))
        .mockResolvedValue(undefined),
      theme: vi.fn().mockResolvedValue("light"),
      onThemeChanged: vi.fn(async (handler) => { notifyTheme = handler; return unlisten; })
    };
    const env = fixture(true, '{"schema":1,"mode":"dark"}');
    const controller = createAppearanceController({ ...env, native });
    await waitFor(() => expect(native.setTheme).toHaveBeenCalledWith("dark"));
    controller.applyPreference("light"); controller.applyPreference("system");
    notifyTheme({ payload: "dark" }); // Event caused by the old override is stale.
    expect(native.setTheme).toHaveBeenCalledTimes(1);
    finishFirst();
    await waitFor(() => expect(controller.getSnapshot().resolved).toBe("light"));
    expect(native.setTheme.mock.calls.map((call) => call[0])).toEqual(["dark", null]);
    notifyTheme({ payload: "dark" });
    expect(controller.getSnapshot().resolved).toBe("dark");
    controller.applyPreference("light");
    notifyTheme({ payload: "dark" });
    expect(controller.getSnapshot().resolved).toBe("light");
    controller.dispose(); expect(unlisten).toHaveBeenCalledOnce();
  });

  it("keeps app colors usable when native synchronization fails", async () => {
    const env = fixture(false, '{"schema":1,"mode":"dark"}');
    const controller = createAppearanceController({ ...env, native: {
      setTheme: vi.fn().mockRejectedValue(new Error("native denied")),
      theme: vi.fn(), onThemeChanged: vi.fn(async () => () => {})
    } });
    await waitFor(() => expect(controller.getSnapshot().nativeWarning).toBe(true));
    expect(env.root.dataset.theme).toBe("dark"); controller.dispose();
  });

  it("offers localized accessible choices while retaining selector focus", () => {
    localStorage.clear(); render(<App />);
    const control = screen.getByRole("combobox", { name: "Appearance" }); control.focus();
    fireEvent.change(control, { target: { value: "dark" } });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.activeElement).toBe(control);
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "es" } });
    expect(screen.getByRole("combobox", { name: "Apariencia" })).toBe(control);
    expect(Array.from(control.querySelectorAll("option")).map((option) => option.textContent))
      .toEqual(["Sistema", "Claro", "Oscuro"]);
  });

  it("keeps the actual app available and displays a persistence warning when storage is inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    render(<App />);
    fireEvent.change(screen.getByRole("combobox", { name: "Appearance" }), { target: { value: "dark" } });
    expect(screen.getByText("Appearance changed, but could not be saved.")).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("heading", { name: "Read your local Markdown" })).toBeTruthy();
  });
});
