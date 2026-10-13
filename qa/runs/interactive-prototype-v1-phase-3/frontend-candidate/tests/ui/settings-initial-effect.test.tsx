// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsWindow from "../../src/app/SettingsWindow";

const gate = vi.hoisted(() => ({ effects: [] as Array<() => unknown>, legacy: false, close: vi.fn() }));
vi.mock("react", async original => {
  const react = await original<typeof import("react")>();
  return { ...react, useLayoutEffect: (effect: () => unknown, deps?: unknown[]) => {
    if (gate.legacy && effect.toString().includes("setDraft")) gate.effects.push(effect);
    else react.useLayoutEffect(effect as () => void, deps);
  }, useEffect: (effect: () => unknown, deps?: unknown[]) => {
    // Model a mount's draft synchronization delayed until after a user edit.
    // Forward every unrelated effect, including cleanup and native polling.
    if (effect.toString().includes("setDraft")) gate.effects.push(effect);
    else react.useEffect(effect as () => void, deps);
  } };
});
vi.mock("../../src/app/appearance", () => ({ useAppearance: () => ({ nativeWarning: false }),
  getAppearance: () => ({ applyPreference: vi.fn() }) }));
vi.mock("../../src/app/settings-contract", async original => ({
  ...await original<typeof import("../../src/app/settings-contract")>(), settingsApi: {
    get: async () => ({ revision: 1, activation: 1, group: "Reading", ownerAvailable: true,
      persistence: "saved", requestId: null, retryPatch: null, nativeThemeFailed: false,
      values: { language: "en", appearance: "system", readingFont: "roboto", readingSize: 16,
        readingLineHeight: 1.6, readingWidth: 760, documentsAndImagesOnly: true } }), close: gate.close
  }
}));
afterEach(() => { cleanup(); gate.effects = []; gate.legacy = false; vi.clearAllMocks(); });
it("negative control reproduces the original passive-sync Escape failure", async () => {
  gate.legacy = true;
  render(<SettingsWindow />);
  await waitFor(() => expect(document.activeElement?.id).toBe("settings-reading"));
  const size = screen.getByRole("spinbutton", { name: "Text size (px)" });
  size.focus(); fireEvent.change(size, { target: { value: "23" } });
  expect(gate.effects.length).toBeGreaterThan(0);
  await act(async () => { for (const effect of gate.effects) effect(); });
  expect((size as HTMLInputElement).value).toBe("16");
  fireEvent.keyDown(size, { key: "Escape" }); expect(gate.close).toHaveBeenCalledOnce();
});
it("cannot erase the first numeric draft through delayed passive mount synchronization (QA-0008)", async () => {
  render(<SettingsWindow />);
  await waitFor(() => expect(document.activeElement?.id).toBe("settings-reading"));
  const size = screen.getByRole("spinbutton", { name: "Text size (px)" });
  size.focus(); fireEvent.change(size, { target: { value: "23" } });
  await act(async () => { for (const effect of gate.effects) effect(); });
  expect((size as HTMLInputElement).value).toBe("23");
  fireEvent.keyDown(size, { key: "Escape" });
  expect((size as HTMLInputElement).value).toBe("16"); expect(gate.close).not.toHaveBeenCalled();
  fireEvent.keyDown(size, { key: "Escape" }); expect(gate.close).toHaveBeenCalledOnce();
});
