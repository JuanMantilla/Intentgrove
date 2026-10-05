import type { SessionAnchor, SessionCheckpointInput, SessionPanel, SessionTree } from "./api";

export const defaultSessionPanel: SessionPanel = {
  sidebarOpen: true,
  sidebarWidth: 260,
  outlineOpen: false,
  outlineWidth: 220,
  readingWidth: 760,
  readingFont: "roboto",
  readingSize: 16,
  readingLineHeight: 1.6
};

export const emptySessionTree: SessionTree = {
  expanded: [], selected: null, scrollTop: 0
};

export function sessionAnchor(
  saved: { headingId: string | null; offset: number; scrollTop: number } | undefined,
  viewport: { width: number; height: number },
  contentVersion: string | null
): SessionAnchor {
  return {
    headingId: saved?.headingId ?? null,
    offset: Number.isFinite(saved?.offset) ? saved!.offset : 0,
    scrollTop: Number.isFinite(saved?.scrollTop) ? Math.max(0, saved!.scrollTop) : 0,
    viewportWidth: Number.isFinite(viewport.width) ? Math.max(0, viewport.width) : 0,
    viewportHeight: Number.isFinite(viewport.height) ? Math.max(0, viewport.height) : 0,
    contentVersion
  };
}

export function makeSessionCheckpoint(input: Omit<SessionCheckpointInput, "sequence">,
  sequence: number): SessionCheckpointInput {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Invalid session sequence");
  const keys = new Set<string>();
  for (const tab of input.tabs) {
    if (!tab.key || keys.has(tab.key)) throw new Error("Duplicate session tab");
    keys.add(tab.key);
  }
  if (input.activeKey && !keys.has(input.activeKey)) throw new Error("Invalid active session tab");
  return { ...input, sequence };
}
