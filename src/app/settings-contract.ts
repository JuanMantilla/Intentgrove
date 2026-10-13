import type { WorkspaceLayout } from "./workspaceLayout";
import { invoke } from "@tauri-apps/api/core";
import type { AppearanceMode } from "./appearance";
import type { Locale } from "./i18n";
import type { ReadingPreferences } from "./ReadingSettings";

export type SettingsGroup = "General" | "Reading" | "ProjectTree";
export type Preferences = ReadingPreferences & { language: Locale; appearance: AppearanceMode; documentsAndImagesOnly: boolean; workspaceLayout?: WorkspaceLayout };
export type PreferencePatch = Partial<Preferences>;
export interface SettingsSnapshot {
  revision: number; activation: number; group: SettingsGroup; ownerAvailable: boolean; values: Preferences;
  requestId: string | null; persistence: "saved" | "failed" | "pending" | "ownerUnavailable";
  nativeThemeFailed: boolean;
  retryPatch: PreferencePatch | null;
}
export interface SettingsIntent { requestId: string; revision: number; patch: PreferencePatch }
export const settingsApi = {
  show: (group: SettingsGroup) => invoke<void>("show_settings", { group }),
  get: () => invoke<SettingsSnapshot>("get_settings_state"),
  getWorkspace: () => invoke<SettingsSnapshot>("get_workspace_preferences"),
  apply: (requestId: string, expectedRevision: number, patch: PreferencePatch) =>
    invoke<SettingsSnapshot>("apply_settings_change", { requestId, expectedRevision, patch }),
  acknowledge: (requestId: string, revision: number, persistence: "saved" | "failed") =>
    invoke<SettingsSnapshot>("acknowledge_settings_change", { requestId, revision, persistence }),
  publish: (expectedRevision: number, values: Preferences) =>
    invoke<SettingsSnapshot>("publish_workspace_preferences", { expectedRevision, values }),
  close: () => invoke<void>("close_settings")
};

/** Revision plus request correlation prevents late invoke results undoing newer events. */
export function newerSettings(current: SettingsSnapshot | null, next: SettingsSnapshot) {
  if (!current) return next;
  let chosen = next.revision < current.revision ? current : next;
  if (next.revision === current.revision && current.requestId === next.requestId
    && current.persistence !== "pending" && next.persistence === "pending") chosen = current;
  const activation = next.activation > current.activation ? next : current;
  if (chosen.activation < activation.activation) return { ...chosen, activation: activation.activation, group: activation.group };
  return chosen;
}
