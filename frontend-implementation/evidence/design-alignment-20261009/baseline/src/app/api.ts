import { invoke } from "@tauri-apps/api/core";
import { requireMarkdownResponse } from "./htmlBoundary";

export interface GrantInfo {
  id: string;
  name: string;
  displayPath: string;
  generation: number;
}

export interface RecentItem {
  id: string;
  kind: "folder" | "document";
  name: string;
  parent: string;
  displayPath: string;
  status: "available" | "missing" | "replaced" | "denied" | "unavailable";
  lastUsedMs: number;
}
export interface RecentList { items: RecentItem[]; recoveredCorrupt: boolean }
export interface RecentOpen { kind: "folder" | "document"; grant: GrantInfo }
export interface NativePreview {
  id: string;
  source: "finder" | "drop";
  name: string;
  displayPath: string;
  kind: "folder" | "document" | "unsupported";
  errorCode: string | null;
}
export interface NativeAccepted { kind: "folder" | "document"; grant: GrantInfo }

export interface DirectoryEntry {
  name: string;
  kind: "directory" | "markdown" | "html" | "image" | "other";
}

export interface DirectoryPage {
  entries: DirectoryEntry[];
  nextOffset: number | null;
  snapshotId: string;
}

export interface FolderSearchHit {
  id: string;
  segments: string[];
  path: string;
  line: number;
  startByte: number;
  endByte: number;
  context: string;
  kind: "name" | "content";
  ignored: boolean;
  version: string;
}
export interface FolderSearchBatch {
  jobId: string;
  generation: number;
  results: FolderSearchHit[];
  scanned: number;
  skipped: number;
  matched: number;
  status: "searching" | "stopped" | "complete" | "partial";
  errorCode: string | null;
}
export interface FolderSearchStarted { jobId: string; generation: number; scopeSegments: string[] }
export interface OpenFolderSearchHit {
  document: DocumentResponse;
  line: number;
  ordinal: number | null;
  changed: boolean;
  matchMoved: boolean;
}

export interface DocumentResponse {
  fileId: string;
  name: string;
  displayPath: string;
  identityKey: string;
  content: string;
  diskVersion: string;
}

export interface LargeInspection {
  fileId: string;
  name: string;
  displayPath: string;
  sizeBytes: number;
  overLimit: boolean;
}
export interface LargeOpened {
  snapshotId: string;
  fileId: string;
  sizeBytes: number;
  lineCount: number;
  diskVersion: string;
}
export interface SourceWindow {
  startByte: number;
  endByte: number;
  sizeBytes: number;
  lineNumber: number;
  text: string;
}

export interface SectionDescriptor {
  id: string;
  kind: "preheading" | "heading" | "whole";
  ordinal: number;
  level?: number;
  label: string;
  startByte: number;
  endByte: number;
  sourceHash: string;
}

export interface SectionsResponse {
  diskVersion: string;
  sections: SectionDescriptor[];
}

export interface BeginEditResponse {
  sessionId: string;
  diskVersion: string;
  section: SectionDescriptor;
  source: string;
  lineSeparator: string;
}

export interface SaveEditResponse {
  diskVersion: string;
  content: string;
  sections: SectionDescriptor[];
  recoveryCleanupFailed: boolean;
  safetyCopyStatusFailed: boolean;
}

export interface SafetyCopyInventory {
  resolvedCount: number;
  resolvedBytes: number;
  unresolvedCount: number;
  unresolvedBytes: number;
  usedBytes: number;
  quotaBytes: number;
}

export interface RecoveryResponse {
  sessionId: string;
  diskVersion: string;
  section: SectionDescriptor;
  source: string;
  lineSeparator: string;
  draft: string;
  editorJson: unknown;
  editorScrollTop: number;
  editorScrollLeft: number;
  readerScrollTop: number;
  sequence: number;
  savedAtMs?: number | null;
  conflict: boolean;
}

export interface CheckpointAck {
  sequence: number;
  durationMs: number;
}

export interface SessionAnchor {
  htmlZoom?: number;
  htmlScrollLeft?: number;
  headingId: string | null;
  offset: number;
  scrollTop: number;
  viewportWidth: number;
  viewportHeight: number;
  contentVersion: string | null;
}

export interface SessionTree {
  expanded: string[][];
  selected: string[] | null;
  scrollTop: number;
}

export interface SessionPanel {
  /** Optional until the native session contract supports layouts. */
  workspaceLayout?: import("./workspaceLayout").WorkspaceLayout;
  sidebarOpen: boolean;
  sidebarWidth: number;
  outlineOpen: boolean;
  outlineWidth: number;
  readingWidth: number;
  readingFont: "roboto" | "serif" | "sans" | "mono";
  readingSize: number;
  readingLineHeight: number;
  documentsAndImagesOnly?: boolean;
}

export interface SessionCheckpointInput {
  sequence: number;
  rootId: string | null;
  priorRoot: boolean;
  tabs: Array<{ key: string; fileId: string | null; priorKey: string | null;
    rootSegments: string[] | null; anchor: SessionAnchor; savedDiskVersion: string | null;
    editingActive: boolean }>;
  activeKey: string | null;
  tree: SessionTree;
  panel: SessionPanel;
}

export interface SessionCheckpointAck { sequence: number; completedAtMs: number }

export interface SessionRestore {
  sequence: number;
  completedAtMs: number;
  exitDisposition: "running" | "normal";
  root: { id: string | null; name: string; displayPath: string;
    generation: number | null; errorCode: string | null } | null;
  tabs: Array<{ kind?: "html" | "markdown" | "image"; key: string; fileId: string | null; name: string; displayPath: string;
    rootSegments: string[] | null; explicitFile: boolean; anchor: SessionAnchor;
    savedDiskVersion: string | null; errorCode: string | null; editingActive: boolean }>;
  activeKey: string | null;
  tree: SessionTree;
  panel: SessionPanel;
  window: { x: number; y: number; width: number; height: number; scaleFactor: number } | null;
}

export interface SaveAsChoice {
  token: string;
  name: string;
  exists: boolean;
}

export type RefreshTarget =
  | { kind: "root-file"; rootId: string; segments: string[] }
  | { kind: "folder"; rootId: string; segments: string[] }
  | { kind: "explicit-file"; fileId: string };

export type RefreshReasonCode =
  | "invalid_grant" | "invalid_path" | "reselection_required" | "root_reselection_required"
  | "version_changed" | "unstable" | "missing" | "denied" | "unsupported_type"
  | "encoding" | "binary" | "oversize" | "cloud_placeholder" | "unsupported_mount"
  | "watch_failed" | "cancelled";

export interface RefreshJob {
  jobId: string;
  generation: number;
  accepted: true;
}

export interface RefreshFileChanged {
  generation: number;
  fileId: string;
  diskVersion: string;
  identityKey: string;
  checkedAt: number;
}

export interface RefreshDirectoryChanged {
  generation: number;
  rootId: string;
  segments: string[];
  snapshotId: string;
}

export interface RefreshItemStatus {
  generation: number;
  targetRef: string | { rootId: string; segments: string[] };
  state: "changed" | "current" | "checking" | "uncertain" | "unavailable" | "conflict";
  reasonCode?: RefreshReasonCode;
  checkedAt: number;
}

export interface RefreshJobProgress {
  generation: number;
  jobId: string;
  examinedCount: number;
  confirmedCount: number;
  currentSegments?: string[];
  state: "queued" | "running" | "completed" | "cancelled" | "failed";
}

export interface LinkResponse {
  kind: "anchor" | "document" | "html" | "image" | "details" | "blocked" | "unsupported" | "missing";
  fileId: string | null;
  anchor: string | null;
  reason: string | null;
}

export interface ImageResponse {
  fileId: string;
  name: string;
  displayPath: string;
  identityKey: string;
  diskVersion: string;
  format: string;
  mime: string;
  width: number;
  height: number;
  still: boolean;
  bytes: number[];
}

export interface ImageTileResponse {
  fileId: string;
  diskVersion: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bytes: number[];
}

export interface ReaderError {
  code: string;
  message: string;
}

export function readerError(error: unknown): ReaderError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return { code: String(error.code), message: String(error.message) };
  }
  return { code: "unknown", message: String(error) };
}

export const api = {
  renderDiagram: (source: string, jobId: string, generation: number) => invoke<import("../reader/diagram-host").DiagramPixels>("render_diagram", { source, jobId, generation }),
  cancelDiagram: (jobId: string) => invoke<void>("cancel_diagram", { jobId }),
  listRecentItems: () => invoke<RecentList>("list_recent_items"),
  openRecentItem: (entryId: string) => invoke<RecentOpen>("open_recent_item", { entryId }),
  reselectRecentItem: (entryId: string) => invoke<RecentOpen | null>("reselect_recent_item", { entryId }),
  rememberRecentDocument: (fileId: string) => invoke<void>("remember_recent_document", { fileId }),
  removeRecentItem: (entryId: string) => invoke<void>("remove_recent_item", { entryId }),
  clearRecentItems: (confirmed: boolean) => invoke<void>("clear_recent_items", { confirmed }),
  listNativeEntries: () => invoke<NativePreview[]>("list_native_entries"),
  acceptNativeEntry: (entryId: string) => invoke<NativeAccepted>("accept_native_entry", { entryId }),
  dismissNativeEntry: (entryId: string) => invoke<void>("dismiss_native_entry", { entryId }),
  setNativeMenuState: (state: { closeTab: boolean; save: boolean; find: boolean; reload: boolean; locale: string;
    back?: boolean; forward?: boolean; visited?: boolean; clearHistory?: boolean;
    editingOwner?: boolean; editingUndo?: boolean; editingRedo?: boolean; editingSelection?: boolean }) =>
    invoke<void>("set_native_menu_state", state),
  selectRoot: (reselectId?: string) => invoke<GrantInfo | null>("select_root", reselectId ? { reselectId } : {}),
  prepareRootSelection: () => invoke<string | null>("prepare_root_selection"),
  commitRootSelection: (token: string) => invoke<GrantInfo>("commit_root_selection", { token }),
  cancelRootSelection: (token: string) => invoke<void>("cancel_root_selection", { token }),
  selectFile: (reselectId?: string) => invoke<GrantInfo | null>("select_file", reselectId ? { reselectId } : {}),
  listEntries: (rootId: string, segments: string[], offset: number, token: string, snapshotId?: string) =>
    invoke<DirectoryPage>("list_entries", { rootId, segments, offset, token, snapshotId }),
  cancelListing: (token: string) => invoke<void>("cancel_listing", { token }),
  startFolderSearch: (rootId: string, query: string, mode: "name" | "content" | "both", includeIgnored: boolean, scopeSegments?: string[]) =>
    invoke<FolderSearchStarted>("start_folder_search", { rootId, query, mode, includeIgnored, scopeSegments }),
  cancelFolderSearch: (jobId: string) => invoke<boolean>("cancel_folder_search", { jobId }),
  openSearchHit: (jobId: string, resultId: string) =>
    invoke<OpenFolderSearchHit>("open_search_hit", { jobId, resultId }).then(result => ({
      ...result, document: requireMarkdownResponse(result.document)
    })),
  readDocument: (args: { fileId?: string; rootId?: string; segments?: string[] }) =>
    invoke<DocumentResponse>("read_document", args).then(requireMarkdownResponse),
  inspectLargeFile: (args: { fileId?: string; rootId?: string; segments?: string[] }) =>
    invoke<LargeInspection>("inspect_large_file", args),
  openLargeSource: (fileId: string, explicitConsent: boolean) =>
    invoke<LargeOpened>("open_large_source", { fileId, explicitConsent }),
  cancelLargeOpen: () => invoke<void>("cancel_large_open"),
  readSourceWindow: (snapshotId: string, offset: number) =>
    invoke<SourceWindow>("read_source_window", { snapshotId, offset }),
  sourceLineOffset: (snapshotId: string, line: number) =>
    invoke<number>("source_line_offset", { snapshotId, line }),
  findLargeSource: (snapshotId: string, query: string, afterOffset: number, requestId: number) =>
    invoke<number | null>("find_large_source", { snapshotId, query, afterOffset, requestId }),
  cancelLargeFind: () => invoke<void>("cancel_large_find"),
  copySourceSelection: (snapshotId: string, startByte: number, endByte: number) =>
    invoke<string>("copy_source_selection", { snapshotId, startByte, endByte }),
  closeLargeSource: (snapshotId: string) => invoke<void>("close_large_source", { snapshotId }),
  listEditSections: (fileId: string) =>
    invoke<SectionsResponse>("list_edit_sections", { fileId }),
  beginSectionEdit: (fileId: string, sectionId: string, expectedDiskVersion: string) =>
    invoke<BeginEditResponse>("begin_section_edit", { fileId, sectionId, expectedDiskVersion }),
  saveSectionEdit: (sessionId: string, replacement: string) =>
    invoke<SaveEditResponse>("save_section_edit", { sessionId, replacement }),
  discardSectionEdit: (sessionId: string) =>
    invoke<void>("discard_section_edit", { sessionId }),
  suspendSectionEdit: (sessionId: string) =>
    invoke<void>("suspend_section_edit", { sessionId }),
  checkpointSectionEdit: (args: {
    sessionId: string; sequence: number; draft: string; editorJson: unknown;
    editorScrollTop: number; editorScrollLeft: number; readerScrollTop: number;
  }) => invoke<CheckpointAck>("checkpoint_section_edit", args),
  loadSectionRecovery: (fileId: string) =>
    invoke<RecoveryResponse | null>("load_section_recovery", { fileId }),
  chooseSectionSaveAs: (sessionId: string) =>
    invoke<SaveAsChoice | null>("choose_section_save_as", { sessionId }),
  commitSectionSaveAs: (sessionId: string, token: string, replacement: string, replaceExisting: boolean) =>
    invoke<void>("commit_section_save_as", { sessionId, token, replacement, replaceExisting }),
  finishEditingClose: (quit: boolean) => invoke<void>("finish_editing_close", { quit }),
  clearAllRecovery: () => invoke<number>("clear_all_recovery"),
  listSafetyCopies: () => invoke<SafetyCopyInventory>("list_safety_copies"),
  clearResolvedSafetyCopies: (confirmed: boolean) =>
    invoke<SafetyCopyInventory>("clear_resolved_safety_copies", { confirmed }),
  loadWorkspaceSession: () => invoke<SessionRestore | null>("load_workspace_session"),
  checkpointWorkspaceSession: (input: SessionCheckpointInput) =>
    invoke<SessionCheckpointAck>("checkpoint_workspace_session", { input }),
  finishWorkspaceSession: (input: SessionCheckpointInput) =>
    invoke<SessionCheckpointAck>("finish_workspace_session", { input }),
  clearWorkspaceSession: () => invoke<void>("clear_workspace_session"),
  reselectSessionRoot: () => invoke<SessionRestore | null>("reselect_session_root"),
  reselectSessionFile: (key: string) => invoke<GrantInfo | null>("reselect_session_file", { key }),
  resolveLink: (sourceId: string, target: string) =>
    invoke<LinkResponse>("resolve_link", { sourceId, target }),
  readImage: (sourceId: string, target: string) =>
    invoke<ImageResponse>("read_image", { sourceId, target }),
  openImage: (args: { fileId?: string; rootId?: string; segments?: string[]; maxDimension?: number }) =>
    invoke<ImageResponse>("open_image", args),
  openImageTile: (fileId: string, expectedDiskVersion: string, x: number, y: number) =>
    invoke<ImageTileResponse>("open_image_tile", { fileId, expectedDiskVersion, x, y }),
  reloadItem: (target: RefreshTarget, requestId: string) =>
    invoke<RefreshJob>("reload_item", { target, requestId }),
  cancelReload: (jobId: string, generation: number) =>
    invoke<{ cancelled: boolean }>("cancel_reload", { jobId, generation }),
  reconcileVisibleState: (args: {
    generation: number; rootId?: string; expandedDirectories: string[][]; openFileIds: string[];
  }) => invoke<RefreshJob>("reconcile_visible_state", args),
  getConfirmedDocument: (fileId: string, expectedDiskVersion: string, generation: number) =>
    invoke<DocumentResponse>("get_confirmed_document", { fileId, expectedDiskVersion, generation }).then(requireMarkdownResponse)
};
