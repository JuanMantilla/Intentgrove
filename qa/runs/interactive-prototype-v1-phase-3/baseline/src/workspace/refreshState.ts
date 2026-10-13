import type { DirectoryPage, DocumentResponse, RefreshDirectoryChanged, RefreshFileChanged } from "../app/api";

export type Freshness = "current" | "checking" | "changed" | "uncertain" | "unavailable" | "conflict";

export interface RefreshableTab {
  id: string;
  content?: string;
  identityKey?: string;
  name?: string;
  displayPath?: string;
  diskVersion?: string;
  pendingDiskVersion?: string;
  freshness?: Freshness;
  dirty?: boolean;
  editingActive?: boolean;
}

export interface RefreshableDirectory {
  entries: DirectoryPage["entries"];
  nextOffset: number | null;
  snapshotId?: string;
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
  refreshStatus?: Freshness;
  error?: string;
}

export function noteFileChange<T extends RefreshableTab>(
  tabs: T[], event: RefreshFileChanged, generation: number
): T[] {
  if (event.generation !== generation) return tabs;
  return tabs.map((tab) => {
    if (tab.id !== event.fileId || tab.diskVersion === event.diskVersion) return tab;
    return {
      ...tab,
      pendingDiskVersion: event.diskVersion,
      freshness: tab.dirty || tab.editingActive ? "conflict" as const : "checking" as const
    };
  });
}

export function confirmCleanDocument<T extends RefreshableTab>(
  tabs: T[], document: DocumentResponse, generation: number, currentGeneration: number
): T[] {
  if (generation !== currentGeneration) return tabs;
  return tabs.map((tab) => {
    if (tab.id !== document.fileId || tab.dirty || tab.editingActive || tab.pendingDiskVersion !== document.diskVersion) return tab;
    return {
      ...tab,
      content: document.content,
      identityKey: document.identityKey,
      name: document.name,
      displayPath: document.displayPath,
      diskVersion: document.diskVersion,
      pendingDiskVersion: undefined,
      freshness: "changed" as const
    };
  });
}

export function noteDirectoryChange<T extends RefreshableDirectory>(
  directories: Record<string, T>, key: string, event: RefreshDirectoryChanged, generation: number
): Record<string, T> {
  if (event.generation !== generation || !directories[key]?.expanded) return directories;
  return {
    ...directories,
    [key]: { ...directories[key], refreshStatus: "checking" as const }
  };
}

export function confirmDirectoryPage<T extends RefreshableDirectory>(
  current: T, page: DirectoryPage, append: boolean
): T {
  return {
    ...current,
    entries: append ? [...current.entries, ...page.entries] : page.entries,
    nextOffset: page.nextOffset,
    snapshotId: page.snapshotId,
    loading: false,
    loaded: true,
    refreshStatus: "current",
    error: undefined
  };
}
