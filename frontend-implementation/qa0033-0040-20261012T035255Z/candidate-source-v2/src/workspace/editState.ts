import type { SectionDescriptor } from "../app/api";

export interface SectionEdit {
  sessionId: string;
  diskVersion: string;
  section: SectionDescriptor;
  source: string;
  draft: string;
  lineSeparator: string;
  initialEditorJson?: unknown;
  editorScrollTop?: number;
  editorScrollLeft?: number;
  checkpointStatus: "pending" | "saved" | "error";
  sequence: number;
  paused?: boolean;
  conflict?: boolean;
}

export type EditAction =
  | { type: "begin"; tabId: string; edit: SectionEdit }
  | { type: "draft"; tabId: string; sessionId: string; draft: string }
  | { type: "checkpoint"; tabId: string; sessionId: string; sequence: number;
      draft: string; editorJson: unknown; scrollTop: number; scrollLeft: number }
  | { type: "checkpointResult"; tabId: string; sessionId: string; sequence: number;
      status: "saved" | "error" }
  | { type: "pause"; tabId: string; paused: boolean }
  | { type: "conflict"; tabId: string }
  | { type: "remove"; tabId: string };

export function editReducer(current: Record<string, SectionEdit>, action: EditAction): Record<string, SectionEdit> {
  const edit = current[action.tabId];
  if (action.type === "begin") {
    return edit ? current : { ...current, [action.tabId]: action.edit };
  }
  if (action.type === "remove") {
    if (!edit) return current;
    const next = { ...current };
    delete next[action.tabId];
    return next;
  }
  if (!edit) return current;
  if (action.type === "draft") {
    return edit.sessionId === action.sessionId
      ? { ...current, [action.tabId]: { ...edit, draft: action.draft, checkpointStatus: "pending" } }
      : current;
  }
  if (action.type === "checkpoint") {
    return edit.sessionId === action.sessionId && action.sequence > edit.sequence
      ? { ...current, [action.tabId]: { ...edit, draft: action.draft,
        initialEditorJson: action.editorJson, editorScrollTop: action.scrollTop,
        editorScrollLeft: action.scrollLeft, sequence: action.sequence, checkpointStatus: "pending" } }
      : current;
  }
  if (action.type === "checkpointResult") {
    return edit.sessionId === action.sessionId && edit.sequence === action.sequence
      ? { ...current, [action.tabId]: { ...edit, checkpointStatus: action.status } }
      : current;
  }
  if (action.type === "pause") {
    return { ...current, [action.tabId]: { ...edit, paused: action.paused } };
  }
  return { ...current, [action.tabId]: { ...edit, conflict: true } };
}
