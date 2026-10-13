// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useSettingsOwner } from "../../src/app/useSettingsOwner";
import type { Preferences, SettingsSnapshot } from "../../src/app/settings-contract";
const host = vi.hoisted(() => ({ events: new Map<string, (event: { payload: any }) => void>(), publish: vi.fn(), acknowledge: vi.fn(), getWorkspace: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true, invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (name, handler) => { host.events.set(name, handler); return () => host.events.delete(name); }) }));
vi.mock("../../src/app/settings-contract", async importOriginal => ({ ...await importOriginal<typeof import("../../src/app/settings-contract")>(), settingsApi: host }));
let snapshot: SettingsSnapshot;
const initial: Preferences = { language: "en", appearance: "system", readingFont: "roboto", readingSize: 16, readingLineHeight: 1.6, readingWidth: 760, documentsAndImagesOnly: true };
const checkpoint = vi.fn(); const focus = vi.fn();
let changeMenu: (appearance: Preferences["appearance"]) => void;
function Fixture() {
  const [values, setValues] = useState(initial);
  changeMenu = appearance => setValues(old => ({ ...old, appearance }));
  useSettingsOwner(values, true, {
    general: next => setValues(old => ({ ...old, language: next.language, appearance: next.appearance })),
    workspace: patch => setValues(old => ({ ...old, ...patch })), checkpoint, focus
  });
  return <div data-testid="preferences">{JSON.stringify(values)}</div>;
}
beforeEach(() => {
  vi.clearAllMocks(); host.events.clear();
  snapshot = { revision: 0, activation: 0, group: "General", ownerAvailable: true, values: initial, requestId: null, persistence: "saved", nativeThemeFailed: false, retryPatch: null };
  host.getWorkspace.mockImplementation(async () => snapshot);
  host.publish.mockImplementation(async (revision, values) => { snapshot = { ...snapshot, revision: revision + 1, values }; return snapshot; });
  host.acknowledge.mockImplementation(async (requestId, revision, persistence) => {
    snapshot = { ...snapshot, requestId, revision, persistence }; return snapshot;
  });
  checkpoint.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("only the workspace checkpoints Reading/tree, reports failure, and close only restores focus", async () => {
  checkpoint.mockRejectedValueOnce(new Error("disk"));
  const view = render(<Fixture />); await waitFor(() => expect(host.publish).toHaveBeenCalledOnce());
  snapshot = { ...snapshot, revision: 2, requestId: "reading", persistence: "pending", values: { ...initial, readingSize: 22, documentsAndImagesOnly: false } };
  await act(async () => {
    host.events.get("settings:state")!({ payload: { ...snapshot, values: initial } });
    host.events.get("settings:intent")!({ payload: { requestId: "reading", revision: 2, patch: { readingSize: 22, documentsAndImagesOnly: false } } });
  });
  await waitFor(() => expect(host.acknowledge).toHaveBeenCalledWith("reading", 2, "failed"));
  expect(view.getByTestId("preferences").textContent).toContain('"readingSize":22');
  expect(view.getByTestId("preferences").textContent).toContain('"documentsAndImagesOnly":false');
  await act(async () => { host.events.get("settings:closed")!({ payload: null }); });
  expect(focus).toHaveBeenCalledOnce(); expect(checkpoint).toHaveBeenCalledOnce();
  expect(host.publish.mock.calls.every(([, values]) => !Object.keys(values).some(key => /draft|path|grant|tabs|root/.test(key)))).toBe(true);
});

it("a newer workspace menu choice survives an older Settings acknowledgment", async () => {
  render(<Fixture />); await waitFor(() => expect(host.publish).toHaveBeenCalledOnce());
  snapshot = { ...snapshot, revision: 2, requestId: "general", persistence: "pending", values: { ...initial, language: "es" } };
  await act(async () => { host.events.get("settings:state")!({ payload: snapshot }); });
  await act(async () => { changeMenu("dark"); });
  snapshot = { ...snapshot, persistence: "saved" };
  await act(async () => { host.events.get("settings:state")!({ payload: snapshot }); });
  await waitFor(() => expect(host.publish).toHaveBeenLastCalledWith(2, { ...initial, language: "es", appearance: "dark" }));
});

it("a late owner acknowledgment resynchronizes applied workspace preferences after timeout", async () => {
  render(<Fixture />); await waitFor(() => expect(host.publish).toHaveBeenCalledOnce());
  host.acknowledge.mockRejectedValueOnce({ code: "settings_stale" });
  snapshot = { ...snapshot, revision: 2, requestId: "late", persistence: "ownerUnavailable", ownerAvailable: false };
  await act(async () => { host.events.get("settings:intent")!({ payload: { requestId: "late", revision: 2, patch: { readingSize: 22 } } }); });
  await waitFor(() => expect(host.publish).toHaveBeenLastCalledWith(2, { ...initial, readingSize: 22 }));
});

it("startup waits for an in-flight General acknowledgment and preserves that newer app preference", async () => {
  snapshot = { ...snapshot, revision: 1, requestId: "startup-general", persistence: "pending", values: { ...initial, language: "es" } };
  const view = render(<Fixture />);
  await waitFor(() => expect(view.getByTestId("preferences").textContent).toContain('"language":"es"'));
  expect(host.publish).not.toHaveBeenCalled();
  snapshot = { ...snapshot, persistence: "saved" };
  await act(async () => { host.events.get("settings:state")!({ payload: snapshot }); });
  await waitFor(() => expect(host.publish).toHaveBeenCalledWith(1, { ...initial, language: "es" }));
});
