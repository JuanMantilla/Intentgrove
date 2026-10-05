import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, readerError, type DirectoryEntry, type DocumentResponse, type FolderSearchHit, type GrantInfo, type ImageResponse, type LargeInspection, type LargeOpened, type NativePreview, type OpenFolderSearchHit, type RecentItem, type RecentList, type RefreshDirectoryChanged, type RefreshFileChanged, type RefreshItemStatus, type RefreshJobProgress, type RefreshTarget, type SectionDescriptor, type RecoveryResponse, type SaveEditResponse, type SafetyCopyInventory, type SessionCheckpointInput, type SessionPanel, type SessionRestore } from "./api";
import { errorText, t, type Locale } from "./i18n";
import { useAppearance, type AppearanceMode } from "./appearance";
import { useRetainedOverlay } from "./useRetainedOverlay";
import MarkdownView, { exceedsRenderBudget, headingSlug } from "../reader/MarkdownView";
import ImageView, { type ImageViewState } from "../reader/ImageView";
import { boundZoom, usePinchZoom, zoomRect, normalizeZoomRect } from "../reader/usePinchZoom";
import { emptyHistory, recordVisit, updateVisit, type VisitHistory } from "../workspace/visitHistory";
import SectionEditor, { type DraftFindAdapter } from "../reader/SectionEditor";
import LargeSourceView from "../reader/LargeSourceView";
import FolderSearchPanel from "./FolderSearchPanel";
import WorkspaceDialog from "./WorkspaceDialog";
import StorageManagement from "./StorageManagement";
import DocumentLocation from "./DocumentLocation";
import ActionMenu from "./ActionMenu";
import { tabFilename, distinguishingParent, workspaceSegments } from "./documentIdentity";
import { editReducer, type SectionEdit } from "../workspace/editState";
import { confirmCleanDocument, confirmDirectoryPage, noteDirectoryChange, noteFileChange, type Freshness } from "../workspace/refreshState";
import { defaultSessionPanel, makeSessionCheckpoint, sessionAnchor } from "./session";
import { FindIndex, findLiteral } from "../reader/find-index";
import type { HeadingEntry } from "../reader/heading-model";

type OpenRequest = { fileId?: string; rootId?: string; segments?: string[]; explicitFile?: boolean };
const imageName = (name: string) => /\.(?:jpe?g|png|gif|webp|svg|bmp|tiff?|heic|heif)$/i.test(name);

interface DirectoryState {
  entries: DirectoryEntry[];
  nextOffset: number | null;
  snapshotId?: string;
  token: string;
  loading: boolean;
  loaded: boolean;
  expanded: boolean;
  error?: string;
  refreshStatus?: Freshness;
}

interface Tab {
  id: string;
  identityKey?: string;
  name: string;
  displayPath: string;
  content?: string;
  kind?: "markdown" | "image";
  image?: ImageResponse;
  imageLoading?: boolean;
  request: OpenRequest;
  errorCode?: string;
  diskVersion?: string;
  pendingDiskVersion?: string;
  freshness?: Freshness;
  freshnessReason?: string;
  dirty?: boolean;
  editingActive?: boolean;
  explicitFile?: boolean;
  restoredKey?: string;
  largeInspection?: LargeInspection;
  largeOpened?: LargeOpened;
  largeConsent?: boolean;
}
type VisitTarget = Pick<Tab, "id" | "request" | "name" | "displayPath" | "kind" | "explicitFile"> & { imageView?: ImageViewState; zoom?: number };

type ReloadMenu = { target: RefreshTarget; label: string; x: number; y: number; anchor: HTMLElement };
type ReloadJobView = { target: RefreshTarget; progress: RefreshJobProgress };
type InspectedDisk = { tabId: string; generation: number; sessionId: string; document: DocumentResponse };

const pathKey = (segments: string[]) => JSON.stringify(segments);
const copySize = (bytes: number, locale: Locale) => {
  const unit = bytes >= 1024 ** 3 ? 3 : bytes >= 1024 ** 2 ? 2 : bytes >= 1024 ? 1 : 0;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 ** unit)} ${["B", "KiB", "MiB", "GiB"][unit]}`;
};

export default function App() {
  const appearance = useAppearance();
  const [locale, setLocale] = useState<Locale>(() => {
    try { return localStorage.getItem("md-reader-locale") === "es" ? "es" : "en"; }
    catch { return "en"; }
  });
  const [root, setRoot] = useState<GrantInfo | null>(null);
  const [rootProblem, setRootProblem] = useState<string | null>(null);
  const [directories, setDirectories] = useState<Record<string, DirectoryState>>({});
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [sectionsByTab, setSectionsByTab] = useState<Record<string, SectionDescriptor[]>>({});
  const [edits, setEdits] = useState<Record<string, SectionEdit>>({});
  const editsRef = useRef(edits);
  const [pendingRecoveries, setPendingRecoveries] = useState<Record<string, RecoveryResponse>>({});
  const pendingRecoveriesRef = useRef(pendingRecoveries);
  const [pendingSaveAs, setPendingSaveAs] = useState<{ tabId: string; token: string; name: string } | null>(null);
  const [pendingSection, setPendingSection] = useState<{ tabId: string; section: SectionDescriptor } | null>(null);
  const [inspectedDisk, setInspectedDisk] = useState<InspectedDisk | null>(null);
  const inspectedDiskRef = useRef<InspectedDisk | null>(null);
  const inspectionSequence = useRef(0);
  const [discardConflictConfirm, setDiscardConflictConfirm] = useState<InspectedDisk | null>(null);
  const discardConflictRef = useRef<InspectedDisk | null>(null);
  const [closeIntent, setCloseIntent] = useState<{ kind: "app" | "window" | "folder" | "tab" | "read"; tabId?: string } | null>(null);
  const [pendingFolder, setPendingFolder] = useState<string | null>(null);
  const [pendingNativeEntry, setPendingNativeEntry] = useState<string | null>(null);
  const [nativeEntries, setNativeEntries] = useState<NativePreview[]>([]);
  const [clearDraftsConfirm, setClearDraftsConfirm] = useState(false);
  const [clearCopiesConfirm, setClearCopiesConfirm] = useState(false);
  const [safetyCopies, setSafetyCopies] = useState<SafetyCopyInventory | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [projectsMenu, setProjectsMenu] = useState<{ anchor: HTMLElement; x: number; y: number } | null>(null);
  const [storageOpen, setStorageOpen] = useState(false);
  const [storageLoading, setStorageLoading] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [discardSectionId, setDiscardSectionId] = useState<string | null>(null);
  const [savingTabId, setSavingTabId] = useState<string | null>(null);
  const savingTabRef = useRef<string | null>(null);
  const cleanupRef = useRef(false);
  const [revealing, setRevealing] = useState(false);
  const revealSequence = useRef(0);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const [folderQuery, setFolderQuery] = useState("");
  const [largeProgress, setLargeProgress] = useState<{ fileId: string; completedBytes: number;
    totalBytes: number } | null>(null);
  const openingLarge = useRef<string | null>(null);
  const [clearSessionConfirm, setClearSessionConfirm] = useState(false);
  const [clearRecentsConfirm, setClearRecentsConfirm] = useState(false);
  const [recents, setRecents] = useState<RecentList | null>(null);
  const [recentIssue, setRecentIssue] = useState(false);
  const [restoreOffer, setRestoreOffer] = useState<SessionRestore | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const sessionReadyRef = useRef(false);
  const sessionClearedRef = useRef(false);
  const [priorRoot, setPriorRoot] = useState(false);
  const priorRootRef = useRef(false);
  const sessionSequence = useRef(0);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionWrite = useRef<Promise<unknown>>(Promise.resolve());
  const restoreLoads = useRef(new Map<string, symbol>());
  const imageLoads = useRef(new Map<string, symbol>());
  const documentLoads = useRef(new Map<string, symbol>());
  const openSequence = useRef(0);
  const [history, setHistory] = useState<VisitHistory<VisitTarget>>(emptyHistory);
  const historyRef = useRef(history);
  const traversal = useRef<symbol | null>(null);
  const [goMenu, setGoMenu] = useState<{ anchor: HTMLElement; x: number; y: number } | null>(null);
  const [historyDirection, setHistoryDirection] = useState<-1 | 1 | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAnnouncement, setHistoryAnnouncement] = useState("");
  const imageViews = useRef(new Map<string, ImageViewState>());
  const documentZooms = useRef(new Map<string, number>());
  const [zoomRevision, setZoomRevision] = useState(0);
  const documentZoomAnchor = useRef<{ id: string; reader: HTMLDivElement; anchor: HTMLElement; x: number; y: number; point: { x: number; y: number }; next: number } | null>(null);
  const draggedTab = useRef<string | null>(null);
  const restoredDisposition = useRef<"running" | "normal">("normal");
  const closeInProgress = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const sidebarOpenRef = useRef(true);
  const treeRef = useRef<HTMLDivElement>(null);
  const checkpointSequence = useRef(new Map<string, number>());
  const readerCheckpointTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabsRef = useRef<Tab[]>([]);
  const rootRef = useRef<GrantInfo | null>(null);
  const generationRef = useRef(0);
  const localeRef = useRef(locale);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [readingSettingsOpen, setReadingSettingsOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const outlineTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarElementRef = useRef<HTMLElement>(null);
  const outlineElementRef = useRef<HTMLElement>(null);
  const [sidebarAnimating, setSidebarAnimating] = useState(false);
  const sidebarAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsOverlay = useRetainedOverlay(readingSettingsOpen ? true : null, 90, "(max-width: 700px)");
  const [readingSettings, setReadingSettings] = useState<Pick<SessionPanel,
    "readingFont" | "readingSize" | "readingLineHeight" | "readingWidth">>(() => ({
      readingFont: defaultSessionPanel.readingFont,
      readingSize: defaultSessionPanel.readingSize,
      readingLineHeight: defaultSessionPanel.readingLineHeight,
      readingWidth: defaultSessionPanel.readingWidth
    }));
  const readingSettingsRef = useRef(readingSettings);
  function applyReadingSettings(next: typeof readingSettings) {
    if (activeIdRef.current && readerRef.current)
      captureReadingPosition(activeIdRef.current, readerRef.current);
    readingSettingsRef.current = next;
    setReadingSettings(next);
  }
  const [headingsByTab, setHeadingsByTab] = useState<Record<string, HeadingEntry[]>>({});
  const [renderedMarkdown, setRenderedMarkdown] = useState<{ id: string; content: string } | null>(null);
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const [sidebarPanel, setSidebarPanel] = useState<"explorer" | "search">("explorer");
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [compactSidebarOpen, setCompactSidebarOpen] = useState(false);
  const compactSidebar = viewportWidth < sidebarWidth + 480;
  const sidebarVisible = compactSidebar ? compactSidebarOpen : sidebarOpen;
  const sidebarWidthRef = useRef(264);
  const pendingTreeScroll = useRef<number | null>(null);
  const [markdownOnly, setMarkdownOnly] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findOrdinal, setFindOrdinal] = useState(0);
  const [findRoot, setFindRoot] = useState<HTMLElement | null>(null);
  const [findIndex, setFindIndex] = useState<FindIndex | null>(null);
  const [findIndexError, setFindIndexError] = useState(false);
  const [findScrollVersion, setFindScrollVersion] = useState(0);
  const [findOverlays, setFindOverlays] = useState<Array<{ left: number; top: number;
    width: number; height: number; active: boolean }>>([]);
  const findInputRef = useRef<HTMLInputElement>(null);
  const editorFindRef = useRef<DraftFindAdapter | null>(null);
  const findFocusBefore = useRef<HTMLElement | null>(null);
  const pendingSearchReveal = useRef(false);
  const menuActionRef = useRef<(id: string) => void>(() => {});
  const findRootRef = useCallback((node: HTMLElement | null) => setFindRoot(node), []);
  const [reloadMenu, setReloadMenu] = useState<ReloadMenu | null>(null);
  const [reloadJobs, setReloadJobs] = useState<Record<string, ReloadJobView>>({});
  const [reloadResults, setReloadResults] = useState<Record<string, { state: RefreshItemStatus["state"]; reasonCode?: string }>>({});
  const progressRef = useRef(new Map<string, RefreshJobProgress>());
  const directoriesRef = useRef(directories);
  const [pendingAnchor, setPendingAnchor] = useState<{ fileId: string; anchor: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const readingAnchors = useRef(new Map<string, { headingId: string | null; offset: number; scrollTop: number }>());

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const measure = () => toolbar.parentElement?.style.setProperty("--toolbar-height", `${toolbar.getBoundingClientRect().height}px`);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure); observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    if (readerCheckpointTimer.current) clearTimeout(readerCheckpointTimer.current);
  }, []);

  useLayoutEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useLayoutEffect(() => { editsRef.current = edits; }, [edits]);
  useLayoutEffect(() => { pendingRecoveriesRef.current = pendingRecoveries; }, [pendingRecoveries]);
  useEffect(() => { rootRef.current = root; }, [root]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => {
    setTabs((old) => old.some((tab) => tab.kind === "image" && tab.id !== activeId && tab.image)
      ? old.map((tab) => tab.kind === "image" && tab.id !== activeId ? { ...tab, image: undefined } : tab)
      : old);
  }, [activeId]);
  useEffect(() => { setActiveOutlineId(readingAnchors.current.get(activeId ?? "")?.headingId ?? null); }, [activeId]);
  useEffect(() => { sidebarOpenRef.current = sidebarOpen; }, [sidebarOpen]);
  useEffect(() => { sidebarWidthRef.current = sidebarWidth; }, [sidebarWidth]);
  useEffect(() => () => {
    if (sidebarAnimationTimer.current) clearTimeout(sidebarAnimationTimer.current);
  }, []);
  useEffect(() => { priorRootRef.current = priorRoot; }, [priorRoot]);
  useEffect(() => { directoriesRef.current = directories; }, [directories]);
  useEffect(() => { localeRef.current = locale; }, [locale]);
  useEffect(() => {
    try { localStorage.setItem("md-reader-locale", locale); } catch { /* Keep reading available if app storage fails. */ }
    document.documentElement.lang = locale;
  }, [locale]);

  async function refreshRecents() {
    if (typeof api.listRecentItems !== "function") return;
    try { setRecents(await api.listRecentItems()); setRecentIssue(false); }
    catch { setRecentIssue(true); }
  }
  useEffect(() => { void refreshRecents(); }, []);
  useEffect(() => { void refreshSafetyCopies(); }, []);
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;
    void listen<{ fileId: string; completedBytes: number; totalBytes: number }>(
      "large-source:progress", (event) => { if (!disposed) setLargeProgress(event.payload); })
      .then((stop) => { if (disposed) stop(); else unlisten = stop; })
      .catch(() => {});
    return () => { disposed = true; unlisten?.(); };
  }, []);

  async function refreshNativeEntries() {
    if (typeof api.listNativeEntries !== "function") return;
    try { setNativeEntries(await api.listNativeEntries()); }
    catch (error) { setNotice(errorText(localeRef.current, readerError(error).code)); }
  }
  useEffect(() => {
    void refreshNativeEntries();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    try {
      void listen("native:entry_pending", () => { void refreshNativeEntries(); })
        .then((stop) => { if (disposed) stop(); else unlisten = stop; }).catch(() => {});
    } catch { /* Browser-only preview has no Tauri event host. */ }
    return () => { disposed = true; unlisten?.(); };
  }, []);

  async function dismissNativeEntry(id: string) {
    try { await api.dismissNativeEntry(id); await refreshNativeEntries(); }
    catch (error) { setNotice(errorText(locale, readerError(error).code)); }
  }

  async function acceptNativeEntry(id: string) {
    const entry = nativeEntries.find((item) => item.id === id);
    if (!entry || busy) return;
    if (entry.errorCode || entry.kind === "unsupported") {
      setNotice(errorText(locale, entry.errorCode ?? "unsupported_type"));
      await dismissNativeEntry(id);
      return;
    }
    if (entry.kind === "folder" && (Object.keys(editsRef.current).length
      || Object.keys(pendingRecoveriesRef.current).length)) {
      setPendingNativeEntry(id);
      setCloseIntent({ kind: "folder" });
      return;
    }
    setBusy(true);
    try {
      const accepted = await api.acceptNativeEntry(id);
      await refreshNativeEntries();
      if (accepted.kind === "folder") activateFolder(accepted.grant);
      else {
        sessionClearedRef.current = false;
        sessionReadyRef.current = true;
        setSessionReady(true);
        await (imageName(accepted.grant.name) ? openImage : openDocument)(
          { fileId: accepted.grant.id, explicitFile: true },
          { name: accepted.grant.name, path: accepted.grant.displayPath });
      }
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
      await refreshNativeEntries();
    } finally { setBusy(false); }
  }

  async function useRecent(entry: RecentItem) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const opened = entry.status === "available"
        ? await api.openRecentItem(entry.id) : await api.reselectRecentItem(entry.id);
      if (!opened) return;
      if (opened.kind === "folder") activateFolder(opened.grant);
      else {
        sessionClearedRef.current = false;
        sessionReadyRef.current = true;
        setSessionReady(true);
        await (imageName(opened.grant.name) ? openImage : openDocument)(
          { fileId: opened.grant.id, explicitFile: true },
          { name: opened.grant.name, path: opened.grant.displayPath });
      }
      await refreshRecents();
    } catch (error) {
      const code = readerError(error).code;
      setNotice(code === "reselect_required" ? t(locale, "recentUnavailable") : errorText(locale, code));
      await refreshRecents();
    } finally { setBusy(false); }
  }

  async function removeRecent(id: string) {
    try { await api.removeRecentItem(id); await refreshRecents(); }
    catch (error) { setNotice(errorText(locale, readerError(error).code)); }
  }

  async function clearRecents() {
    try { await api.clearRecentItems(true); setClearRecentsConfirm(false); await refreshRecents(); }
    catch (error) { setNotice(errorText(locale, readerError(error).code)); }
  }

  function sessionSnapshot(): SessionCheckpointInput {
    const currentTabs = tabsRef.current;
    const currentRoot = rootRef.current;
    const reader = readerRef.current;
    const currentDirectories = directoriesRef.current;
    const currentActive = activeIdRef.current;
    return makeSessionCheckpoint({
      rootId: currentRoot?.id ?? null,
      priorRoot: !currentRoot && priorRootRef.current,
      tabs: currentTabs.map((tab) => ({
        key: tab.restoredKey ?? tab.id,
        fileId: tab.request.fileId ?? null,
        priorKey: tab.restoredKey ?? null,
        rootSegments: !tab.request.fileId && currentRoot ? tab.request.segments ?? null : null,
        anchor: sessionAnchor(readingAnchors.current.get(tab.id),
          { width: reader?.clientWidth ?? 0, height: reader?.clientHeight ?? 0 }, tab.diskVersion ?? null),
        savedDiskVersion: tab.diskVersion ?? null,
        editingActive: Boolean(editsRef.current[tab.id] && !editsRef.current[tab.id].paused)
      })),
      activeKey: currentTabs.find((tab) => tab.id === currentActive)?.restoredKey ?? currentActive,
      tree: {
        expanded: Object.entries(currentDirectories).filter(([, value]) => value.expanded)
          .map(([key]) => JSON.parse(key) as string[]).filter((path) => path.length > 0),
        selected: currentTabs.find((tab) => tab.id === currentActive)?.request.segments ?? null,
        scrollTop: treeRef.current?.scrollTop ?? 0
      },
      panel: { ...defaultSessionPanel, ...readingSettingsRef.current, sidebarOpen: sidebarOpenRef.current,
        outlineOpen,
        sidebarWidth: Math.min(800, Math.max(160,
          (window.innerWidth < sidebarWidthRef.current + 480 ? sidebarWidthRef.current
            : document.querySelector<HTMLElement>(".sidebar")?.getBoundingClientRect().width)
            || sidebarWidthRef.current)) }
    }, ++sessionSequence.current);
  }

  function checkpointSession(final = false): Promise<void> {
    if (!sessionReadyRef.current || typeof api.checkpointWorkspaceSession !== "function")
      return Promise.resolve();
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = null;
    const input = sessionSnapshot();
    const write = sessionWrite.current.catch(() => {}).then(async () => {
      if (final && typeof api.finishWorkspaceSession === "function") await api.finishWorkspaceSession(input);
      else await api.checkpointWorkspaceSession(input);
    });
    sessionWrite.current = write;
    return write.catch((error) => {
      setNotice(errorText(localeRef.current, readerError(error).code));
      throw error;
    });
  }

  function scheduleSessionCheckpoint() {
    if (!sessionReadyRef.current || typeof api.checkpointWorkspaceSession !== "function") return;
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = setTimeout(() => { void checkpointSession().catch(() => {}); }, 300);
  }

  function applyRestoredSession(saved: SessionRestore) {
    sessionClearedRef.current = false;
    restoredDisposition.current = saved.exitDisposition;
    sessionSequence.current = saved.sequence;
    const restoredRoot = saved.root?.id ? {
      id: saved.root.id, name: saved.root.name, displayPath: saved.root.displayPath,
      generation: saved.root.generation ?? 0
    } as GrantInfo : null;
    rootRef.current = restoredRoot;
    setRoot(restoredRoot);
    setRootProblem(saved.root?.errorCode ?? null);
    priorRootRef.current = Boolean(saved.root && !saved.root.id);
    setPriorRoot(priorRootRef.current);
    generationRef.current = restoredRoot?.generation ?? 0;
    const restoredTabs: Tab[] = saved.tabs.map((tab) => ({
      id: tab.fileId ?? `restore:${tab.key}`, restoredKey: tab.key,
      name: tab.name, displayPath: tab.displayPath, explicitFile: tab.explicitFile,
      request: { fileId: tab.fileId ?? undefined,
        rootId: tab.rootSegments && restoredRoot ? restoredRoot.id : undefined,
        segments: tab.rootSegments ?? undefined, explicitFile: tab.explicitFile },
      errorCode: tab.errorCode ?? undefined,
      diskVersion: tab.savedDiskVersion ?? undefined,
      editingActive: tab.editingActive
    }));
    tabsRef.current = restoredTabs;
    setTabs(restoredTabs);
    readingAnchors.current.clear();
    scrollPositions.current.clear();
    saved.tabs.forEach((tab, index) => {
      const id = restoredTabs[index].id;
      readingAnchors.current.set(id, { headingId: tab.anchor.headingId,
        offset: tab.anchor.offset, scrollTop: tab.anchor.scrollTop });
      scrollPositions.current.set(id, tab.anchor.scrollTop);
    });
    const selected = saved.tabs.findIndex((tab) => tab.key === saved.activeKey);
    const selectedId = restoredTabs[selected]?.id ?? restoredTabs[0]?.id ?? null;
    activeIdRef.current = selectedId;
    setActiveId(selectedId);
    sidebarOpenRef.current = saved.panel.sidebarOpen;
    setSidebarOpen(saved.panel.sidebarOpen);
    setSidebarWidth(saved.panel.sidebarWidth);
    sidebarWidthRef.current = saved.panel.sidebarWidth;
    setOutlineOpen(saved.panel.outlineOpen);
    const restoredReading = {
      readingFont: saved.panel.readingFont ?? defaultSessionPanel.readingFont,
      readingSize: saved.panel.readingSize ?? defaultSessionPanel.readingSize,
      readingLineHeight: saved.panel.readingLineHeight ?? defaultSessionPanel.readingLineHeight,
      readingWidth: saved.panel.readingWidth ?? defaultSessionPanel.readingWidth
    };
    readingSettingsRef.current = restoredReading;
    setReadingSettings(restoredReading);
    const expanded = saved.tree.expanded;
    if (restoredRoot) {
      pendingTreeScroll.current = saved.tree.scrollTop;
      const generation = generationRef.current;
      const branches = [[], ...expanded.filter((path) => path.length)];
      const loadBranches = () => {
        if (generation !== generationRef.current) return;
        for (const path of branches.splice(0, 16)) void loadDirectory(restoredRoot.id, path);
        if (branches.length) setTimeout(loadBranches, 0);
      };
      setTimeout(loadBranches, 0);
    }
    sessionReadyRef.current = true;
    setSessionReady(true);
  }

  useEffect(() => {
    let cancelled = false;
    if (typeof api.loadWorkspaceSession !== "function") {
      sessionReadyRef.current = true;
      setSessionReady(true);
      return;
    }
    void api.loadWorkspaceSession().then((saved) => {
      if (cancelled) return;
      if (saved?.exitDisposition === "running") setRestoreOffer(saved);
      else if (saved) applyRestoredSession(saved);
      else { sessionReadyRef.current = true; setSessionReady(true); }
    }).catch((error) => {
      if (cancelled) return;
      setNotice(errorText(localeRef.current, readerError(error).code));
      sessionReadyRef.current = true;
      setSessionReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (sessionSequence.current === 0 && !root && !priorRoot && tabs.length === 0
      && readingSettings.readingFont === defaultSessionPanel.readingFont
      && readingSettings.readingSize === defaultSessionPanel.readingSize
      && readingSettings.readingLineHeight === defaultSessionPanel.readingLineHeight
      && readingSettings.readingWidth === defaultSessionPanel.readingWidth) return;
    scheduleSessionCheckpoint();
  }, [sessionReady, root, priorRoot, tabs, activeId, directories, sidebarOpen, sidebarWidth, outlineOpen, readingSettings]);

  useLayoutEffect(() => {
    if (pendingTreeScroll.current === null || !treeRef.current) return;
    treeRef.current.scrollTop = pendingTreeScroll.current;
    if (treeRef.current.scrollTop >= pendingTreeScroll.current - 1)
      pendingTreeScroll.current = null;
  }, [directories, sidebarOpen]);

  useEffect(() => {
    const tab = tabs.find((item) => item.id === activeId);
    if (!tab?.request.fileId || (tab.kind !== "image" && !tab.restoredKey)
      || tab.content !== undefined || tab.image || tab.imageLoading || tab.largeInspection || tab.errorCode
      || restoreLoads.current.has(tab.id)) return;
    const token = Symbol("restored file load");
    restoreLoads.current.set(tab.id, token);
    const generation = generationRef.current;
    const owned = () => generation === generationRef.current && restoreLoads.current.get(tab.id) === token;
    if (imageName(tab.name)) {
      imageLoads.current.set(tab.id, token);
      setTabs((old) => old.map((item) => item.id === tab.id ? { ...item, imageLoading: true } : item));
      void api.openImage({ fileId: tab.request.fileId }).then((image) => {
        if (generation !== generationRef.current || imageLoads.current.get(tab.id) !== token) return;
        setTabs((old) => old.map((item) => item.id === tab.id ? {
          ...item, kind: "image", image: activeIdRef.current === tab.id ? image : undefined, imageLoading: false, identityKey: image.identityKey,
          diskVersion: image.diskVersion, name: image.name, displayPath: image.displayPath,
          freshness: "current", errorCode: undefined
        } : item));
      }).catch((error) => {
        if (generation === generationRef.current && imageLoads.current.get(tab.id) === token)
          setTabs((old) => old.map((item) => item.id === tab.id
            ? { ...item, kind: "image", imageLoading: false, errorCode: readerError(error).code } : item));
      }).finally(() => {
        if (imageLoads.current.get(tab.id) === token) imageLoads.current.delete(tab.id);
        if (restoreLoads.current.get(tab.id) === token) restoreLoads.current.delete(tab.id);
      });
      return;
    }
    documentLoads.current.set(tab.request.fileId, token);
    const current = () => owned() && documentLoads.current.get(tab.request.fileId!) === token;
    void api.readDocument({ fileId: tab.request.fileId }).then((document) => {
      if (!current()) return;
      setTabs((old) => old.map((item) => item.id === tab.id ? {
        ...item, identityKey: document.identityKey, content: document.content,
        diskVersion: document.diskVersion, name: document.name, displayPath: document.displayPath,
        freshness: item.diskVersion && item.diskVersion !== document.diskVersion ? "changed" : "current",
        errorCode: undefined
      } : item));
      if (typeof api.loadSectionRecovery === "function") {
        return api.loadSectionRecovery(tab.request.fileId!).then((recovery) => {
          if (!recovery || !current()) return;
          setPendingRecoveries((old) => ({ ...old, [tab.id]: recovery }));
          if (recovery.conflict) setTabs((old) => old.map((item) => item.id === tab.id
            ? { ...item, freshness: "conflict" } : item));
          if (restoredDisposition.current === "normal" && tab.editingActive)
            activateRecovery(tab.id, recovery);
        }).catch((error) => { if (current()) setNotice(errorText(localeRef.current, readerError(error).code)); });
      }
    }).catch(async (error) => {
      if (!current()) return;
      if (readerError(error).code === "oversize") {
        try {
          const inspected = await api.inspectLargeFile({ fileId: tab.request.fileId });
          if (current()) setTabs((old) => old.map((item) => item.id === tab.id
            ? { ...item, largeInspection: inspected, name: inspected.name,
              displayPath: inspected.displayPath, errorCode: undefined } : item));
          return;
        } catch (inspectionError) { error = inspectionError; }
      }
      setTabs((old) => old.map((item) => item.id === tab.id
        ? { ...item, errorCode: readerError(error).code } : item));
    }).finally(() => {
      if (restoreLoads.current.get(tab.id) === token) restoreLoads.current.delete(tab.id);
      if (documentLoads.current.get(tab.request.fileId!) === token) documentLoads.current.delete(tab.request.fileId!);
    });
  }, [activeId, tabs]);

  useEffect(() => {
    let disposed = false;
    let unlisten: Array<() => void> = [];
    const onFileChanged = (event: RefreshFileChanged) => {
      if (event.generation !== generationRef.current) return;
      const tab = tabsRef.current.find((item) => item.id === event.fileId);
      if (!tab || tab.diskVersion === event.diskVersion) return;
      setTabs((old) => noteFileChange(old, event, generationRef.current));
      if (tab.dirty || tab.editingActive) {
        setEdits((old) => editReducer(old, { type: "conflict", tabId: event.fileId }));
        if (discardConflictRef.current?.tabId === event.fileId) {
          discardConflictRef.current = null;
          setDiscardConflictConfirm(null);
        }
        if (inspectedDiskRef.current?.tabId === event.fileId
          && inspectedDiskRef.current.document.diskVersion !== event.diskVersion) {
          void inspectConflict(event.fileId).then(() => setNotice(t(localeRef.current, "diskChangedAgain")));
        }
        return;
      }
      if (tab.largeInspection) {
        void reloadLargeTab(tab.id);
        return;
      }
      if (tab.kind === "image") {
        void refreshRetainedTab(tab.id);
        return;
      }
      void api.getConfirmedDocument(event.fileId, event.diskVersion, event.generation)
        .then((document) => {
          if (event.generation !== generationRef.current) return;
          setTabs((old) => confirmCleanDocument(old, document, event.generation, generationRef.current));
          window.setTimeout(() => {
            if (disposed || event.generation !== generationRef.current) return;
            setTabs((old) => old.map((item) => item.id === document.fileId
              && item.diskVersion === document.diskVersion && item.freshness === "changed"
              ? { ...item, freshness: "current" } : item));
          }, 3000);
        })
        .catch((error) => {
          if (event.generation !== generationRef.current) return;
          const detail = readerError(error);
          setTabs((old) => old.map((item) => item.id === event.fileId
            ? { ...item, freshness: detail.code === "missing" ? "unavailable" : "uncertain" }
            : item));
        });
    };
    const onDirectoryChanged = (event: RefreshDirectoryChanged) => {
      if (event.generation !== generationRef.current || rootRef.current?.id !== event.rootId) return;
      const key = pathKey(event.segments);
      if (!directoriesRef.current[key]?.loaded) return;
      setDirectories((old) => noteDirectoryChange(old, key, event, generationRef.current));
      void loadDirectory(event.rootId, event.segments);
    };
    const onItemStatus = (event: RefreshItemStatus) => {
      if (event.generation !== generationRef.current) return;
      const targetKey = typeof event.targetRef === "string" ? `file:${event.targetRef}`
        : `path:${event.targetRef.rootId}:${pathKey(event.targetRef.segments)}`;
      setReloadResults((old) => ({ ...old, [targetKey]: { state: event.state, reasonCode: event.reasonCode } }));
      if (typeof event.targetRef === "string") {
        const large = tabsRef.current.find((tab) => tab.id === event.targetRef)?.largeOpened;
        if (large && event.state !== "current") void api.closeLargeSource(large.snapshotId).catch(() => {});
        setTabs((old) => old.map((item) => item.id === event.targetRef
          ? { ...item, freshness: event.state === "unavailable" ? "unavailable"
            : event.state === "uncertain" ? "uncertain" : item.freshness,
            freshnessReason: event.reasonCode,
            image: item.kind === "image" && (event.state === "unavailable" || event.state === "uncertain")
              ? undefined : item.image,
            largeOpened: item.largeInspection && event.state !== "current" ? undefined : item.largeOpened }
          : item));
        if (event.state === "unavailable")
          setEdits((old) => editReducer(old, { type: "conflict", tabId: event.targetRef as string }));
      }
      if ((event.reasonCode === "root_reselection_required"
        || (event.targetRef === rootRef.current?.id && event.state === "unavailable")) && rootRef.current) {
        setRootProblem(event.reasonCode ?? "missing");
        setTabs((old) => old.map((item) => item.explicitFile ? item : {
          ...item, freshness: "unavailable", freshnessReason: event.reasonCode
        }));
        setEdits((old) => {
          let next = old;
          for (const tab of tabsRef.current.filter((item) => !item.explicitFile))
            next = editReducer(next, { type: "conflict", tabId: tab.id });
          return next;
        });
      }
      if (event.reasonCode === "watch_failed" || event.reasonCode === "root_reselection_required") {
        setNotice(errorText(localeRef.current, event.reasonCode));
      }
    };
    const onJobProgress = (event: RefreshJobProgress) => {
      if (event.generation !== generationRef.current) return;
      progressRef.current.set(event.jobId, event);
      setReloadJobs((old) => old[event.jobId]
        ? { ...old, [event.jobId]: { ...old[event.jobId], progress: event } } : old);
    };
    void (async () => {
      try {
        const subscriptions = await Promise.all([
          listen<RefreshFileChanged>("refresh:file_changed", ({ payload }) => onFileChanged(payload)),
          listen<RefreshDirectoryChanged>("refresh:directory_changed", ({ payload }) => onDirectoryChanged(payload)),
          listen<RefreshItemStatus>("refresh:item_status", ({ payload }) => onItemStatus(payload)),
          listen<RefreshJobProgress>("refresh:job_progress", ({ payload }) => onJobProgress(payload)),
          listen<"quit" | "window">("editing:close_requested", ({ payload }) => {
            if (closeInProgress.current) return;
            setPendingSaveAs(null);
            setPendingSection(null);
            setClearDraftsConfirm(false);
            discardConflictRef.current = null;
            setDiscardConflictConfirm(null);
            if (Object.keys(editsRef.current).length || Object.keys(pendingRecoveriesRef.current).length)
              setCloseIntent({ kind: payload === "window" ? "window" : "app" });
            else void finishClose(payload !== "window");
          })
        ]);
        if (disposed) subscriptions.forEach((remove) => remove());
        else unlisten = subscriptions;
      } catch { /* Native event bridge is unavailable in a browser-only preview. */ }
    })();
    return () => {
      disposed = true;
      unlisten.forEach((remove) => remove());
    };
  }, []);

  useEffect(() => {
    if (!closeIntent && !pendingSaveAs && !pendingSection && !discardConflictConfirm
      && !clearDraftsConfirm && !clearCopiesConfirm && !clearSessionConfirm && !clearRecentsConfirm && !restoreOffer) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = modalRef.current;
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (cleanupRef.current) return;
        if (closeIntent) void resolveClose("cancel");
        else if (pendingSaveAs) setPendingSaveAs(null);
        else if (pendingSection) setPendingSection(null);
        else if (discardConflictConfirm) setDiscardConflictConfirm(null);
        else if (restoreOffer) return;
        else if (clearSessionConfirm) setClearSessionConfirm(false);
        else if (clearRecentsConfirm) setClearRecentsConfirm(false);
        else if (clearCopiesConfirm) setClearCopiesConfirm(false);
        else setClearDraftsConfirm(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        buttons.at(-1)?.focus();
      } else if (!event.shiftKey && index === buttons.length - 1) {
        event.preventDefault();
        buttons[0].focus();
      }
    };
    dialog?.addEventListener("keydown", handleKeys);
    return () => {
      dialog?.removeEventListener("keydown", handleKeys);
      previous?.focus();
    };
  }, [closeIntent, pendingSaveAs, pendingSection, discardConflictConfirm,
    clearDraftsConfirm, clearCopiesConfirm, clearSessionConfirm, clearRecentsConfirm, restoreOffer]);

  function showReloadMenu(event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, target: RefreshTarget, label: string) {
    event.preventDefault();
    setProjectsMenu(null); setGoMenu(null);
    const anchor = event.currentTarget;
    const bounds = anchor.getBoundingClientRect();
    setReloadMenu({ target, label,
      x: "clientX" in event && event.clientX ? event.clientX : bounds.left,
      y: "clientY" in event && event.clientY ? event.clientY : bounds.bottom,
      anchor });
  }

  function reloadResultKey(target: RefreshTarget): string {
    return target.kind === "explicit-file" ? `file:${target.fileId}`
      : `path:${target.rootId}:${pathKey(target.segments)}`;
  }

  function reloadFeedback(target: RefreshTarget): string | null {
    const result = reloadResults[reloadResultKey(target)];
    if (!result) return null;
    if (result.reasonCode) return errorText(locale, result.reasonCode);
    if (result.state === "checking") return t(locale, "checking");
    if (result.state === "changed") return t(locale, "updatedFromDisk");
    if (result.state === "current") return t(locale, "alreadyCurrent");
    if (result.state === "uncertain") return t(locale, "unableConfirm");
    return null;
  }

  function reloadProgress(target: RefreshTarget): React.ReactNode {
    const job = Object.values(reloadJobs).find((item) => reloadResultKey(item.target) === reloadResultKey(target));
    if (!job) return null;
    const { progress } = job;
    if (progress.state === "completed" || progress.state === "failed") return null;
    return <div className="reload-progress" role="status" aria-live="polite">
      <span>{progress.state === "cancelled" ? `${t(locale, "notFullyChecked")}${progress.currentSegments ? `: ${progress.currentSegments.join("/")}` : ""}`
        : `${t(locale, "examinedItems")}: ${progress.examinedCount}`}</span>
      {(progress.state === "running" || progress.state === "queued") &&
        <button type="button" onClick={() => void cancelReloadJob(progress.jobId, progress.generation)}>{t(locale, "cancel")}</button>}
    </div>;
  }

  async function startReload(menu: ReloadMenu) {
    setReloadMenu(null);
    menu.anchor.focus();
    setReloadResults((old) => ({ ...old, [reloadResultKey(menu.target)]: { state: "checking" } }));
    try {
      const response = await api.reloadItem(menu.target, crypto.randomUUID());
      if (response.generation !== generationRef.current) return;
      const progress = progressRef.current.get(response.jobId) ?? {
        generation: response.generation, jobId: response.jobId,
        examinedCount: 0, confirmedCount: 0, state: "queued" as const
      };
      setReloadJobs((old) => ({ ...old, [response.jobId]: { target: menu.target, progress } }));
      const imageTab = tabsRef.current.find((tab) => tab.kind === "image" && (
        menu.target.kind === "explicit-file" ? tab.id === menu.target.fileId
          : menu.target.kind === "root-file" && tab.request.rootId === menu.target.rootId
            && pathKey(tab.request.segments ?? []) === pathKey(menu.target.segments)));
      if (imageTab) void refreshRetainedTab(imageTab.id);
    } catch (error) {
      const reasonCode = readerError(error).code;
      setReloadResults((old) => ({ ...old, [reloadResultKey(menu.target)]: { state: "uncertain", reasonCode } }));
    }
  }

  async function cancelReloadJob(jobId: string, generation: number) {
    try { await api.cancelReload(jobId, generation); }
    catch (error) { setNotice(errorText(locale, readerError(error).code)); }
  }

  const visibleFileIds = tabs.filter((tab) => tab.request.fileId && !tab.errorCode).map((tab) => tab.id).sort().join("|");
  const expandedDirectoryKeys = JSON.stringify(Object.entries(directories)
    .filter(([, directory]) => directory.expanded && directory.loaded)
    .map(([key]) => key).sort());
  useEffect(() => {
    if (!root && !visibleFileIds) return;
    if (typeof api.reconcileVisibleState !== "function") return;
    const expandedDirectories = (JSON.parse(expandedDirectoryKeys) as string[])
      .map((key) => JSON.parse(key) as string[]);
    void api.reconcileVisibleState({
      generation: generationRef.current,
      rootId: root?.id,
      expandedDirectories,
      openFileIds: visibleFileIds ? visibleFileIds.split("|") : []
    }).catch(() => {});
  }, [root, visibleFileIds, expandedDirectoryKeys]);

  const active = tabs.find((tab) => tab.id === activeId) ?? null;
  const documentZoom = documentZooms.current.get(activeId ?? "") ?? 1;
  usePinchZoom(readerRef, activeId ?? "", Boolean(active?.content !== undefined && active.kind !== "image"),
    documentZoom, (next, point) => {
      const reader = readerRef.current;
      const page = reader?.querySelector<HTMLElement>(".document-page");
      if (!reader || !page || !activeId) return;
      const hit = document.elementFromPoint?.(point.x, point.y);
      const anchor = hit instanceof HTMLElement && page.contains(hit)
        ? hit.closest<HTMLElement>("p,li,h1,h2,h3,h4,h5,h6,pre,td,th") ?? hit : page;
      const bounds = zoomRect(anchor, documentZoom);
      const x = (point.x - bounds.left) / documentZoom;
      const y = (point.y - bounds.top) / documentZoom;
      const bounded = boundZoom(next);
      documentZooms.current.set(activeId, bounded);
      setZoomRevision((value) => value + 1);
      documentZoomAnchor.current = { id: activeId, reader, anchor, x, y, point, next: bounded };
    });
  useLayoutEffect(() => {
    const pending = documentZoomAnchor.current;
    documentZoomAnchor.current = null;
    if (!pending || pending.id !== activeId || !pending.anchor.isConnected) return;
    // Restore after React has committed the zoomed layout, before it paints.
    const bounds = zoomRect(pending.anchor, pending.next);
    pending.reader.scrollLeft += bounds.left + pending.x * pending.next - pending.point.x;
    pending.reader.scrollTop += bounds.top + pending.y * pending.next - pending.point.y;
    captureReadingPosition(pending.id, pending.reader);
  }, [documentZoom, activeId, zoomRevision]);
  function changeHistory(next: VisitHistory<VisitTarget>) { historyRef.current = next; setHistory(next); }
  useLayoutEffect(() => {
    if (traversal.current || !active || active.errorCode || active.imageLoading
      || (active.kind === "image" ? !active.image : active.content === undefined && !active.largeInspection)) return;
    if (historyRef.current.entries[historyRef.current.cursor]?.key === active.id) return;
    changeHistory(recordVisit(historyRef.current, { key: active.id,
      target: { id: active.id, request: active.request, kind: active.kind, name: active.name, displayPath: active.displayPath, explicitFile: active.explicitFile,
        imageView: imageViews.current.get(active.id), zoom: documentZooms.current.get(active.id) },
      scrollTop: scrollPositions.current.get(active.id) ?? 0, scrollLeft: 0 }));
  }, [activeId, active?.content, active?.image, active?.imageLoading, active?.errorCode, active?.largeInspection]);
  useEffect(() => {
    if (typeof api.setNativeMenuState !== "function") return;
    void api.setNativeMenuState({
      closeTab: Boolean(active),
      save: Boolean(active && edits[active.id] && !edits[active.id].paused
        && edits[active.id].draft !== edits[active.id].source),
      find: Boolean(active?.content && !active.errorCode),
      reload: Boolean(active), locale
    }).catch(() => {});
  }, [active, edits, locale]);
  const activeEdit = activeId ? edits[activeId] : undefined;
  const findInDraft = Boolean(activeEdit && !activeEdit.paused);
  const findOverBudget = useMemo(() => active?.content
    ? exceedsRenderBudget(active.content) : false, [active?.content]);
  const findAvailable = Boolean(active && !active.errorCode
    && !findOverBudget && (findInDraft || active.content !== undefined));
  const findResults = useMemo(() => findIndex && findQuery.trim()
    ? findLiteral(findIndex, findQuery) : null, [findIndex, findQuery]);
  const activeFindOrdinal = findResults?.count
    ? Math.min(findOrdinal, findResults.count - 1) : -1;

  useLayoutEffect(() => {
    if (!findOpen || !findAvailable) { setFindIndex(null); setFindIndexError(false); return; }
    try {
      if (findInDraft && activeEdit) setFindIndex(new FindIndex(activeEdit.draft));
      else if (findRoot) setFindIndex(new FindIndex(findRoot));
      else setFindIndex(null);
      setFindIndexError(false);
    } catch {
      setFindIndex(null);
      setFindIndexError(true);
    }
  }, [findOpen, findAvailable, findInDraft, active?.content, activeEdit?.draft, findRoot]);

  useLayoutEffect(() => {
    setFindOpen(false);
    setFindQuery("");
    setFindOrdinal(0);
  }, [activeId]);

  useEffect(() => {
    if (findOpen) findInputRef.current?.focus();
  }, [findOpen]);

  useLayoutEffect(() => {
    const registry = typeof CSS === "undefined" ? undefined
      : (CSS as unknown as { highlights?: { set: (key: string, value: unknown) => void;
        delete: (key: string) => void } }).highlights;
    const HighlightType = (globalThis as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
    registry?.delete("md-reader-find");
    registry?.delete("md-reader-find-active");
    if (!findOpen || findInDraft || !findIndex || !findResults?.count || !readerRef.current) {
      setFindOverlays([]);
      return;
    }
    const viewport = readerRef.current.getBoundingClientRect();
    const visible = findIndex.visibleBounds(viewport, element => zoomRect(element, documentZoom));
    const starts = findResults.starts;
    let lower = 0;
    if (visible) {
      let high = starts.length;
      while (lower < high) {
        const mid = (lower + high) >>> 1;
        if (starts[mid] < visible.start - findResults.queryLength) lower = mid + 1;
        else high = mid;
      }
    }
    const ordinary: Range[] = [];
    let activeRange: Range | null = null;
    const overlays: Array<{ left: number; top: number; width: number; height: number; active: boolean }> = [];
    let painted = 0;
    for (let ordinal = lower; ordinal < findResults.count && painted < 300; ordinal++) {
      if (visible && starts[ordinal] > visible.end) break;
      const span = findIndex.span(starts[ordinal], findResults.queryLength);
      const range = span && findIndex.range(span);
      if (!range) continue;
      if (ordinal === activeFindOrdinal) activeRange = range;
      else ordinary.push(range);
      painted++;
    }
    if (!activeRange && activeFindOrdinal >= 0) {
      const span = findIndex.span(starts[activeFindOrdinal], findResults.queryLength);
      activeRange = span && findIndex.range(span);
    }
    if (registry && HighlightType) {
      if (ordinary.length) registry.set("md-reader-find", new HighlightType(...ordinary));
      if (activeRange) registry.set("md-reader-find-active", new HighlightType(activeRange));
    } else {
      for (const [range, activeMatch] of [...ordinary.map((item) => [item, false] as const),
        ...(activeRange ? [[activeRange, true] as const] : [])]) {
        const rects = typeof range.getClientRects === "function" ? Array.from(range.getClientRects()) : [];
        for (const raw of rects) {
          const rect = normalizeZoomRect(raw, documentZoom);
          if (rect.width <= 0 || rect.height <= 0 || rect.bottom < viewport.top
            || rect.top > viewport.bottom) continue;
          overlays.push({ left: rect.left, top: rect.top, width: rect.width,
            height: rect.height, active: activeMatch });
        }
      }
    }
    setFindOverlays(overlays);
    return () => { registry?.delete("md-reader-find"); registry?.delete("md-reader-find-active"); };
  }, [findOpen, findInDraft, findIndex, findResults, activeFindOrdinal, findScrollVersion, documentZoom]);

  function openFind() {
    if (!active || active.kind === "image") return;
    findFocusBefore.current = document.activeElement as HTMLElement | null;
    setFindOpen(true);
    requestAnimationFrame(() => findInputRef.current?.focus());
  }

  function closeFind() {
    setFindOpen(false);
    setFindQuery("");
    const target = findInDraft
      ? document.querySelector<HTMLElement>(".cm-content")
      : findRoot ?? findFocusBefore.current;
    requestAnimationFrame(() => {
      if (findInDraft && editorFindRef.current) editorFindRef.current.focus();
      else target?.focus();
    });
  }

  function revealFind(ordinal: number) {
    if (!findIndex || !findResults?.count) return;
    const span = findIndex.span(findResults.starts[ordinal], findResults.queryLength);
    if (findInDraft && span) { editorFindRef.current?.reveal(span); return; }
    const range = span && findIndex.range(span);
    range?.startContainer.parentElement?.scrollIntoView?.({ block: "center", behavior: "instant" });
  }

  function moveFind(direction: number) {
    if (!findResults?.count) return;
    const next = (activeFindOrdinal + direction + findResults.count) % findResults.count;
    setFindOrdinal(next);
    revealFind(next);
  }

  useEffect(() => {
    if (findOpen && findResults?.count && (activeFindOrdinal === 0 || pendingSearchReveal.current)) {
      revealFind(Math.max(0, activeFindOrdinal));
      pendingSearchReveal.current = false;
    }
  }, [findQuery, findIndex, findOrdinal]);

  function focusSectionBoundary(tabId: string, section: SectionDescriptor) {
    const focus = () => {
      if (tabsRef.current.find((tab) => tab.id === tabId)?.id !== activeId) return;
      const editButton = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-edit-section]"))
        .find((element) => element.dataset.editSection === section.id);
      if (editButton) { editButton.focus(); return; }
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-section-id]"))
        .find((element) => element.dataset.sectionId === section.id && element.tabIndex >= 0);
      target?.focus();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => requestAnimationFrame(focus));
    else setTimeout(focus, 0);
  }

  useEffect(() => {
    if (!active?.diskVersion || active.errorCode || activeEdit) return;
    if (typeof api.listEditSections !== "function") return;
    let cancelled = false;
    void api.listEditSections(active.id).then((result) => {
      if (!cancelled && result.diskVersion === active.diskVersion) {
        setSectionsByTab((old) => ({ ...old, [active.id]: result.sections }));
      }
    }).catch(() => {
      if (!cancelled) setSectionsByTab((old) => ({ ...old, [active.id]: [] }));
    });
    return () => { cancelled = true; };
  }, [activeId, active?.diskVersion, active?.errorCode, Boolean(activeEdit)]);

  async function startEdit(tabId: string, section: SectionDescriptor, diskVersion: string) {
    try {
      const started = await api.beginSectionEdit(tabId, section.id, diskVersion);
      setEdits((old) => editReducer(old, { type: "begin", tabId, edit: {
        sessionId: started.sessionId, diskVersion: started.diskVersion,
        section: started.section, source: started.source,
        draft: started.source, lineSeparator: started.lineSeparator,
        checkpointStatus: "pending", sequence: 0
      } }));
      setTabs((old) => old.map((tab) => tab.id === tabId
        ? { ...tab, editingActive: true, dirty: false } : tab));
      setNotice(null);
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
    }
  }

  async function beginEdit(section: SectionDescriptor) {
    if (!active?.diskVersion) return;
    const current = edits[active.id];
    if (current) {
      if (current.section.id === section.id && current.paused) {
        setEdits((old) => editReducer(old, { type: "pause", tabId: active.id, paused: false }));
      } else if (current.section.id !== section.id) {
        setPendingSection({ tabId: active.id, section });
      } else setNotice(t(locale, "pendingDraft"));
      return;
    }
    await startEdit(active.id, section, active.diskVersion);
  }

  async function resolvePendingSection(choice: "resume" | "save" | "discard" | "cancel") {
    const pending = pendingSection;
    if (!pending) return;
    if (choice === "cancel") { setPendingSection(null); return; }
    if (choice === "resume") {
      setPendingSection(null);
      setEdits((old) => editReducer(old, { type: "pause", tabId: pending.tabId, paused: false }));
      return;
    }
    const tab = tabs.find((item) => item.id === pending.tabId);
    if (!tab?.diskVersion) return;
    let version = tab.diskVersion;
    if (choice === "save") {
      const result = await saveEdit(pending.tabId);
      if (!result) return;
      version = result.diskVersion;
    } else if (!(await discardEdit(pending.tabId))) return;
    setPendingSection(null);
    try {
      const current = await api.listEditSections(pending.tabId);
      const section = current.sections.find((candidate) => candidate.kind === pending.section.kind
        && candidate.ordinal === pending.section.ordinal && candidate.label === pending.section.label);
      if (!section || current.diskVersion !== version) {
        setNotice(t(locale, "reselectSection"));
        return;
      }
      setSectionsByTab((old) => ({ ...old, [pending.tabId]: current.sections }));
      await startEdit(pending.tabId, section, version);
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
    }
  }

  function checkpointEdit(tabId: string, edit: SectionEdit, draft: string,
    editorJson: unknown, editorScrollTop: number, editorScrollLeft: number) {
    const sequence = (checkpointSequence.current.get(tabId) ?? edit.sequence) + 1;
    checkpointSequence.current.set(tabId, sequence);
    setEdits((old) => editReducer(old, { type: "checkpoint", tabId, sessionId: edit.sessionId,
      sequence, draft, editorJson, scrollTop: editorScrollTop, scrollLeft: editorScrollLeft }));
    void api.checkpointSectionEdit({
      sessionId: edit.sessionId, sequence, draft, editorJson, editorScrollTop, editorScrollLeft,
      readerScrollTop: readerRef.current?.scrollTop ?? 0
    }).then((ack) => {
      if (checkpointSequence.current.get(tabId) !== ack.sequence) return;
      setEdits((old) => editReducer(old, { type: "checkpointResult", tabId,
        sessionId: edit.sessionId, sequence: ack.sequence, status: "saved" }));
    }).catch(() => {
      if (checkpointSequence.current.get(tabId) !== sequence) return;
      setEdits((old) => editReducer(old, { type: "checkpointResult", tabId,
        sessionId: edit.sessionId, sequence, status: "error" }));
    });
  }

  async function saveEdit(tabId: string): Promise<SaveEditResponse | null> {
    const edit = edits[tabId];
    if (!edit) return null;
    if (edit.conflict || tabsRef.current.find((tab) => tab.id === tabId)?.freshness === "conflict") {
      setNotice(t(locale, "saveConflict"));
      return null;
    }
    if (savingTabRef.current) return null;
    savingTabRef.current = tabId;
    setSavingTabId(tabId);
    setBusy(true);
    try {
      const saved = await api.saveSectionEdit(edit.sessionId, edit.draft);
      setTabs((old) => old.map((tab) => tab.id === tabId
        ? { ...tab, content: saved.content, diskVersion: saved.diskVersion,
          pendingDiskVersion: undefined, freshness: "current", dirty: false, editingActive: false }
        : tab));
      setSectionsByTab((old) => ({ ...old, [tabId]: saved.sections }));
      setEdits((old) => editReducer(old, { type: "remove", tabId }));
      checkpointSequence.current.delete(tabId);
      setNotice(saved.recoveryCleanupFailed ? t(locale, "recoveryCleanupFailed") : `${t(locale, "sourceSaved")}: ${tabsRef.current.find((tab) => tab.id === tabId)?.displayPath ?? ""}`);
      if (saved.safetyCopyStatusFailed) setNotice(t(locale, "safetyCopyStatusFailed"));
      void refreshSafetyCopies();
      const nextSection = saved.sections.find((candidate) => candidate.kind === edit.section.kind
        && candidate.ordinal === edit.section.ordinal && candidate.label === edit.section.label)
        ?? saved.sections.find((candidate) => candidate.kind === edit.section.kind
          && candidate.ordinal === edit.section.ordinal);
      if (nextSection && !pendingSection) focusSectionBoundary(tabId, nextSection);
      return saved;
    } catch (error) {
      const code = readerError(error).code;
      if (code === "version_changed" || code === "save_race"
        || code === "save_race_uncaptured" || code === "reselection_required") {
        setTabs((old) => old.map((tab) => tab.id === tabId
          ? { ...tab, freshness: "conflict" } : tab));
        setEdits((old) => editReducer(old, { type: "conflict", tabId }));
      }
      setNotice(code === "version_changed" ? t(locale, "saveConflict") : errorText(locale, code));
      return null;
    } finally {
      savingTabRef.current = null;
      setSavingTabId(null);
      setBusy(false);
    }
  }

  async function commitSaveAs(tabId: string, token: string, replaceExisting: boolean, copyName?: string) {
    const edit = edits[tabId];
    if (!edit) return;
    setBusy(true);
    try {
      await api.commitSectionSaveAs(edit.sessionId, token, edit.draft, replaceExisting);
      setPendingSaveAs(null);
      setNotice(t(locale, "copySavedOriginalDirty").replace("{name}", copyName ?? pendingSaveAs?.name ?? ""));
      void refreshSafetyCopies();
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
    } finally {
      setBusy(false);
    }
  }

  async function saveEditAs(tabId: string) {
    const edit = edits[tabId];
    if (!edit) return;
    setBusy(true);
    try {
      const choice = await api.chooseSectionSaveAs(edit.sessionId);
      if (!choice) return;
      if (choice.exists) setPendingSaveAs({ tabId, token: choice.token, name: choice.name });
      else void commitSaveAs(tabId, choice.token, false, choice.name);
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
    } finally {
      setBusy(false);
    }
  }

  async function discardEdit(tabId: string): Promise<boolean> {
    const edit = edits[tabId];
    const sessionId = edit?.sessionId ?? pendingRecoveries[tabId]?.sessionId;
    if (!sessionId) return false;
    try {
      await api.discardSectionEdit(sessionId);
      setEdits((old) => editReducer(old, { type: "remove", tabId }));
      setPendingRecoveries((old) => {
        const next = { ...old };
        delete next[tabId];
        return next;
      });
      checkpointSequence.current.delete(tabId);
      setTabs((old) => old.map((tab) => tab.id === tabId
        ? { ...tab, dirty: false, editingActive: false } : tab));
      setNotice(null);
      if (edit && !pendingSection) focusSectionBoundary(tabId, edit.section);
      return true;
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
      return false;
    }
  }

  async function inspectConflict(tabId: string): Promise<InspectedDisk | null> {
    const sequence = ++inspectionSequence.current;
    const generation = generationRef.current;
    const sessionId = editsRef.current[tabId]?.sessionId;
    if (!sessionId) return null;
    try {
      const document = await api.readDocument({ fileId: tabId });
      if (generation !== generationRef.current || sequence !== inspectionSequence.current
        || editsRef.current[tabId]?.sessionId !== sessionId) return null;
      const inspected = { tabId, generation, sessionId, document };
      inspectedDiskRef.current = inspected;
      setInspectedDisk(inspected);
      setNotice(null);
      return inspected;
    } catch (error) {
      if (generation === generationRef.current && sequence === inspectionSequence.current) {
        inspectedDiskRef.current = null;
        setInspectedDisk(null);
        setNotice(errorText(localeRef.current, readerError(error).code));
      }
      return null;
    }
  }

  async function requestDiskVersion(tabId: string) {
    const inspected = inspectedDiskRef.current?.tabId === tabId
      ? inspectedDiskRef.current : await inspectConflict(tabId);
    if (!inspected || inspected.generation !== generationRef.current
      || editsRef.current[tabId]?.sessionId !== inspected.sessionId) return;
    discardConflictRef.current = inspected;
    setDiscardConflictConfirm(inspected);
  }

  async function useDiskVersion(choice: InspectedDisk) {
    if (busy || discardConflictRef.current !== choice) return;
    setBusy(true);
    try {
      const document = await api.getConfirmedDocument(choice.tabId, choice.document.diskVersion, choice.generation);
      if (discardConflictRef.current !== choice || choice.generation !== generationRef.current
        || editsRef.current[choice.tabId]?.sessionId !== choice.sessionId) return;
      if (!(await discardEdit(choice.tabId))) return;
      setTabs((old) => old.map((tab) => tab.id === choice.tabId
        ? { ...tab, content: document.content, diskVersion: document.diskVersion, identityKey: document.identityKey,
          pendingDiskVersion: undefined, freshness: "current", dirty: false,
          editingActive: false } : tab));
      inspectedDiskRef.current = null;
      setInspectedDisk(null);
      discardConflictRef.current = null;
      setDiscardConflictConfirm(null);
    } catch (error) {
      discardConflictRef.current = null;
      setDiscardConflictConfirm(null);
      if (choice.generation !== generationRef.current) return;
      if (readerError(error).code === "version_changed") {
        await inspectConflict(choice.tabId);
        setNotice(t(localeRef.current, "diskChangedAgain"));
      } else setNotice(errorText(localeRef.current, readerError(error).code));
    } finally {
      setBusy(false);
    }
  }

  async function loadDirectory(rootId: string, segments: string[], append = false) {
    const key = pathKey(segments);
    const current = directoriesRef.current[key];
    const offset = append ? current?.nextOffset ?? 0 : 0;
    const token = append && current ? current.token : crypto.randomUUID();
    setDirectories((old) => ({
      ...old,
      [key]: {
        entries: append ? old[key]?.entries ?? [] : [],
        nextOffset: append ? old[key]?.nextOffset ?? null : null,
        snapshotId: append ? old[key]?.snapshotId : undefined,
        token,
        loading: true,
        loaded: append ? old[key]?.loaded ?? false : false,
        expanded: true
      }
    }));
    try {
      const page = await api.listEntries(rootId, segments, offset, token, append ? current?.snapshotId : undefined);
      if (rootRef.current?.id !== rootId) return;
      setDirectories((old) => {
        if (old[key]?.token !== token) return old;
        return {
          ...old,
          [key]: confirmDirectoryPage(old[key], page, append)
        };
      });
      return page;
    } catch (error) {
      const detail = readerError(error);
      if (append && detail.code === "version_changed") {
        void loadDirectory(rootId, segments);
        return;
      }
      if (detail.code === "root_reselection_required" && rootRef.current?.id === rootId)
        setRootProblem(detail.code);
      setDirectories((old) => {
        if (old[key]?.token !== token) return old;
        return { ...old, [key]: { ...old[key], loading: false, loaded: true, error: detail.code } };
      });
    }
  }

  async function cancelDirectory(segments: string[]) {
    const key = pathKey(segments);
    const token = directories[key]?.token;
    if (!token) return;
    setDirectories((old) => ({
      ...old,
      [key]: { ...old[key], token: crypto.randomUUID(), loading: false }
    }));
    try { await api.cancelListing(token); } catch { /* A finished page needs no cancellation. */ }
  }

  function activateFolder(selected: GrantInfo) {
    imageLoads.current.clear();
    setSidebarPanel("explorer");
    setFolderQuery("");
    sessionClearedRef.current = false;
    sessionReadyRef.current = true;
    setSessionReady(true);
    generationRef.current = typeof selected.generation === "number"
      ? selected.generation : generationRef.current + 1;
    rootRef.current = selected;
    tabsRef.current = [];
    activeIdRef.current = null;
    priorRootRef.current = false;
    setPriorRoot(false);
    for (const directory of Object.values(directoriesRef.current)) {
      if (directory.loading) void api.cancelListing(directory.token).catch(() => {});
    }
    setRoot(selected);
    setRootProblem(null);
    setDirectories({});
    setTabs([]);
    setReloadMenu(null);
    setReloadJobs({});
    setReloadResults({});
    progressRef.current.clear();
    setActiveId(null);
    scrollPositions.current.clear();
    readingAnchors.current.clear();
    restoreLoads.current.clear();
    void loadDirectory(selected.id, []);
    void refreshRecents();
  }

  async function chooseFolder() {
    setBusy(true);
    setNotice(null);
    try {
      if (typeof api.prepareRootSelection === "function") {
        const token = await api.prepareRootSelection();
        if (!token) return;
        if (Object.keys(editsRef.current).length || Object.keys(pendingRecoveriesRef.current).length) {
          setPendingFolder(token);
          setCloseIntent({ kind: "folder" });
          return;
        }
        activateFolder(await api.commitRootSelection(token));
      } else {
        if (Object.keys(editsRef.current).length || Object.keys(pendingRecoveriesRef.current).length) {
          setNotice(t(locale, "pendingDraft"));
          return;
        }
        const selected = await api.selectRoot();
        if (selected) activateFolder(selected);
      }
    } catch (error) {
      const detail = readerError(error);
      setNotice(errorText(locale, detail.code));
    } finally {
      setBusy(false);
    }
  }

  async function openDocument(request: OpenRequest, fallback?: { name: string; path: string }) {
    setNotice(null);
    const requestKey = request.fileId ?? `${request.rootId}:${pathKey(request.segments ?? [])}`;
    const token = Symbol("document load");
    documentLoads.current.set(requestKey, token);
    const sequence = ++openSequence.current;
    const generation = generationRef.current;
    const current = () => generation === generationRef.current && documentLoads.current.get(requestKey) === token;
    const activate = (id: string) => {
      if (sequence !== openSequence.current) return;
      activeIdRef.current = id;
      setActiveId(id); setCompactSidebarOpen(false);
    };
    try {
      const document: DocumentResponse = await api.readDocument(request);
      if (!current()) return;
      if (typeof api.rememberRecentDocument === "function") {
        void api.rememberRecentDocument(document.fileId).then(refreshRecents).catch(() => {});
      }
      const failedId = request.fileId ?? `error:${request.rootId}:${pathKey(request.segments ?? [])}`;
      const existing = tabsRef.current.find((tab) => tab.identityKey === document.identityKey || tab.id === document.fileId);
      if (existing) {
        if (requestKey !== document.fileId) documentLoads.current.delete(document.fileId);
        setTabs((old) => old.filter((tab) => tab.id !== failedId || tab.id === existing.id).map((tab) =>
          tab.id === existing.id && tab.content === undefined && !editsRef.current[tab.id]
            ? { ...tab, identityKey: document.identityKey, name: document.name, displayPath: document.displayPath, content: document.content, diskVersion: document.diskVersion, errorCode: undefined, freshness: "current" } : tab));
        activate(existing.id);
        return existing.id;
      }
      const tab: Tab = {
        id: document.fileId,
        restoredKey: tabsRef.current.find((item) => item.id === failedId)?.restoredKey,
        identityKey: document.identityKey,
        name: document.name,
        displayPath: document.displayPath,
        content: document.content,
        diskVersion: document.diskVersion,
        freshness: "current",
        explicitFile: request.explicitFile,
        request: { fileId: document.fileId, rootId: request.rootId, segments: request.segments }
      };
      const openEdit = editsRef.current[document.fileId];
      if (openEdit) {
        tab.editingActive = true;
        tab.dirty = openEdit.draft !== openEdit.source;
        tab.freshness = openEdit.diskVersion === document.diskVersion ? "current" : "conflict";
      }
      setTabs((old) => [
        ...old.filter((item) => item.id !== failedId && item.identityKey !== document.identityKey),
        tab
      ]);
      activate(tab.id);
      if (!openEdit && typeof api.loadSectionRecovery === "function") {
        try {
          const recovery = await api.loadSectionRecovery(document.fileId);
          if (recovery && current()) setPendingRecoveries((old) => ({ ...old, [document.fileId]: recovery }));
        } catch (recoveryError) {
          if (current() && activeIdRef.current === tab.id) setNotice(errorText(locale, readerError(recoveryError).code));
        }
      }
      return tab.id;
    } catch (error) {
      if (!current()) return;
      const detail = readerError(error);
      if (detail.code === "oversize") {
        try {
          const inspected = await api.inspectLargeFile(request);
          if (!current()) return;
          const existing = tabsRef.current.find((item) => item.id === inspected.fileId);
          if (existing) {
            if (editsRef.current[existing.id]) {
              setTabs((old) => old.map((item) => item.id === existing.id
                ? { ...item, freshness: "conflict", freshnessReason: "oversize" } : item));
              activate(existing.id);
              return;
            }
            setTabs((old) => old.map((item) => item.id === existing.id
              ? { ...item, content: undefined,
                  largeInspection: inspected, largeOpened: undefined,
                  largeConsent: false, errorCode: undefined, freshness: undefined,
                  diskVersion: undefined, name: inspected.name,
                  displayPath: inspected.displayPath } : item));
            activate(existing.id);
            return;
          }
          const tab: Tab = { id: inspected.fileId, name: inspected.name,
            displayPath: inspected.displayPath, request: { ...request, fileId: inspected.fileId },
            explicitFile: request.explicitFile, largeInspection: inspected };
          setTabs((old) => [...old, tab]);
          activate(tab.id);
          return;
        } catch (inspectionError) {
          if (!current()) return;
          setNotice(errorText(locale, readerError(inspectionError).code));
        }
      }
      const id = request.fileId ?? `error:${request.rootId}:${pathKey(request.segments ?? [])}`;
      const name = fallback?.name ?? t(locale, "genericError");
      const tab: Tab = {
        id,
        restoredKey: tabsRef.current.find((item) => item.id === id)?.restoredKey ?? crypto.randomUUID(),
        name,
        displayPath: fallback?.path ?? name,
        request,
        explicitFile: request.explicitFile,
        errorCode: detail.code
      };
      setTabs((old) => old.some((item) => item.id === id)
        ? old.map((item) => item.id === id ? tab : item)
        : [...old, tab]);
      activate(id);
    } finally {
      if (documentLoads.current.get(requestKey) === token) documentLoads.current.delete(requestKey);
    }
  }

  async function openImage(request: OpenRequest, fallback?: { name: string; path: string },
    force = false, activate = true) {
    if (activate) openSequence.current += 1;
    setNotice(null);
    setFindOpen(false);
    const pendingId = request.fileId ?? `image:${request.rootId}:${pathKey(request.segments ?? [])}`;
    const alreadyOpen = tabsRef.current.find((tab) => tab.id === pendingId && tab.kind === "image" && tab.image);
    if (alreadyOpen && !force) {
      if (activate) { activeIdRef.current = pendingId; setActiveId(pendingId); setCompactSidebarOpen(false); }
      return;
    }
    const token = Symbol("image load");
    imageLoads.current.set(pendingId, token);
    const existingPending = tabsRef.current.find((tab) => tab.id === pendingId);
    if (!existingPending) {
      const pending: Tab = { id: pendingId, kind: "image", imageLoading: true,
        name: fallback?.name ?? request.segments?.at(-1) ?? t(locale, "imageLoading"),
        displayPath: fallback?.path ?? request.segments?.join("/") ?? "",
        request, explicitFile: request.explicitFile };
      setTabs((old) => [...old, pending]);
    } else {
      setTabs((old) => old.map((tab) => tab.id === pendingId
        ? { ...tab, imageLoading: true, image: undefined, errorCode: undefined,
          freshness: force ? "checking" : tab.freshness } : tab));
    }
    if (activate) { setActiveId(pendingId); activeIdRef.current = pendingId; setCompactSidebarOpen(false); }
    const generation = generationRef.current;
    try {
      const image = await api.openImage(request);
      if (generation !== generationRef.current || imageLoads.current.get(pendingId) !== token) return;
      imageLoads.current.delete(pendingId);
      const duplicate = tabsRef.current.find((tab) => tab.id !== pendingId
        && tab.identityKey === image.identityKey);
      if (duplicate) {
        setTabs((old) => old.filter((tab) => tab.id !== pendingId));
        if (activate && activeIdRef.current === pendingId) { activeIdRef.current = duplicate.id; setActiveId(duplicate.id); }
        return;
      }
      const tab: Tab = { id: image.fileId, kind: "image",
        image: activeIdRef.current === pendingId ? image : undefined,
        identityKey: image.identityKey, name: image.name, displayPath: image.displayPath,
        diskVersion: image.diskVersion, freshness: "current", imageLoading: false,
        restoredKey: existingPending?.restoredKey,
        explicitFile: request.explicitFile,
        request: { fileId: image.fileId, rootId: request.rootId, segments: request.segments } };
      setTabs((old) => [...old.filter((item) => item.id !== pendingId && item.id !== image.fileId), tab]);
      if (activate && activeIdRef.current === pendingId) { activeIdRef.current = image.fileId; setActiveId(image.fileId); }
    } catch (error) {
      if (generation !== generationRef.current || imageLoads.current.get(pendingId) !== token) return;
      imageLoads.current.delete(pendingId);
      const code = readerError(error).code;
      setTabs((old) => old.map((tab) => tab.id === pendingId
        ? { ...tab, kind: "image", imageLoading: false, image: undefined, errorCode: code } : tab));
    }
  }

  async function openFolderSearchResult(result: OpenFolderSearchHit,
    hit: FolderSearchHit, query: string, selectedRootId: string) {
    if (rootRef.current?.id !== selectedRootId) return;
    await openDocument({ rootId: selectedRootId, segments: hit.segments },
      { name: hit.segments.at(-1) ?? hit.path, path: hit.path });
    if (result.matchMoved) setNotice(t(locale, "folderSearchMoved"));
    else if (result.changed) setNotice(t(locale, "folderSearchChanged"));
    if (hit.kind === "content" && result.ordinal !== null) {
      pendingSearchReveal.current = true;
      requestAnimationFrame(() => {
        if (rootRef.current?.id !== selectedRootId) return;
        setFindOpen(true);
        setFindQuery(query);
        setFindOrdinal(result.ordinal ?? 0);
      });
    }
  }

  function updateHeadings(tabId: string, entries: HeadingEntry[]) {
    setHeadingsByTab((old) => {
      const previous = old[tabId];
      if (previous?.length === entries.length && previous.every((entry, index) =>
        entry.id === entries[index].id && entry.label === entries[index].label
          && entry.offset === entries[index].offset && entry.level === entries[index].level)) return old;
      return { ...old, [tabId]: entries };
    });
  }

  async function openLargeTab(tabId: string) {
    const tab = tabsRef.current.find((item) => item.id === tabId);
    if (!tab?.largeInspection || tab.largeInspection.overLimit) return;
    openingLarge.current = tabId;
    setLargeProgress({ fileId: tabId, completedBytes: 0,
      totalBytes: tab.largeInspection.sizeBytes });
    setBusy(true);
    try {
      const opened = await api.openLargeSource(tabId, true);
      if (!tabsRef.current.some((item) => item.id === tabId)) {
        void api.closeLargeSource(opened.snapshotId).catch(() => {});
        return;
      }
      setTabs((old) => old.map((item) => item.id === tabId
        ? { ...item, largeOpened: opened, largeConsent: true,
          diskVersion: opened.diskVersion, freshness: "current", errorCode: undefined }
        : item.largeOpened ? { ...item, largeOpened: undefined } : item));
    } catch (error) {
      const code = readerError(error).code;
      setTabs((old) => old.map((item) => item.id === tabId
        ? { ...item, largeOpened: undefined, largeConsent: code === "cancelled" ? false : item.largeConsent,
          errorCode: code === "cancelled" ? undefined : code } : item));
    } finally {
      if (openingLarge.current === tabId) openingLarge.current = null;
      setLargeProgress(null);
      setBusy(false);
    }
  }

  useEffect(() => {
    const tab = tabs.find((item) => item.id === activeId);
    if (tab?.largeConsent && !tab.largeOpened && !tab.errorCode && !busy) {
      void openLargeTab(tab.id);
    }
  }, [activeId, tabs, busy]);

  useEffect(() => {
    if (openingLarge.current && openingLarge.current !== activeId) {
      void api.cancelLargeOpen().catch(() => {});
    }
  }, [activeId]);

  async function reloadLargeTab(tabId: string) {
    const tab = tabsRef.current.find((item) => item.id === tabId);
    if (!tab?.largeInspection) return;
    if (openingLarge.current === tabId) void api.cancelLargeOpen().catch(() => {});
    if (tab.largeOpened) void api.closeLargeSource(tab.largeOpened.snapshotId).catch(() => {});
    setTabs((old) => old.map((item) => item.id === tabId
      ? { ...item, largeOpened: undefined, freshness: "checking" } : item));
    try {
      const inspected = await api.inspectLargeFile({ fileId: tabId });
      if (inspected.sizeBytes <= 10 * 1024 * 1024) {
        await openDocument({ fileId: tabId, explicitFile: tab.explicitFile },
          { name: tab.name, path: tab.displayPath });
        return;
      }
      setTabs((old) => old.map((item) => item.id === tabId
        ? { ...item, largeInspection: inspected, errorCode: inspected.overLimit ? "source_limit" : undefined }
        : item));
      if (!inspected.overLimit) await openLargeTab(tabId);
    } catch (error) {
      setTabs((old) => old.map((item) => item.id === tabId
        ? { ...item, errorCode: readerError(error).code,
          freshness: "uncertain", largeOpened: undefined } : item));
    }
  }

  async function refreshRetainedTab(tabId: string) {
    if (tabsRef.current.find((item) => item.id === tabId)?.kind === "image") {
      const tab = tabsRef.current.find((item) => item.id === tabId)!;
      await openImage({ fileId: tabId }, { name: tab.name, path: tab.displayPath }, true, false);
      return;
    }
    if (tabsRef.current.find((item) => item.id === tabId)?.largeInspection) {
      await reloadLargeTab(tabId);
      return;
    }
    const generation = generationRef.current;
    try {
      const document = await api.readDocument({ fileId: tabId });
      if (generation !== generationRef.current) return;
      const edit = editsRef.current[tabId];
      const conflict = Boolean(edit && edit.diskVersion !== document.diskVersion);
      setTabs((old) => old.map((tab) => tab.id !== tabId ? tab : {
        ...tab, content: edit ? tab.content : document.content,
        identityKey: document.identityKey, name: document.name, displayPath: document.displayPath,
        diskVersion: edit ? tab.diskVersion : document.diskVersion,
        pendingDiskVersion: conflict ? document.diskVersion : undefined,
        freshness: conflict ? "conflict" : "current", freshnessReason: undefined, errorCode: undefined
      }));
      if (edit) setEdits((old) => old[tabId]?.sessionId === edit.sessionId
        ? { ...old, [tabId]: { ...old[tabId], conflict } } : old);
    } catch (error) {
      if (generation !== generationRef.current) return;
      const reason = readerError(error).code;
      if (reason === "oversize") {
        if (editsRef.current[tabId]) {
          setTabs((old) => old.map((tab) => tab.id === tabId
            ? { ...tab, freshness: "conflict", freshnessReason: "oversize" } : tab));
          setEdits((old) => old[tabId] ? { ...old, [tabId]: { ...old[tabId], conflict: true } } : old);
          return;
        }
        try {
          const inspected = await api.inspectLargeFile({ fileId: tabId });
          if (generation !== generationRef.current) return;
          setTabs((old) => old.map((tab) => tab.id === tabId ? {
            ...tab, content: undefined, largeInspection: inspected,
            largeOpened: undefined, largeConsent: false,
            freshness: undefined, freshnessReason: undefined, errorCode: undefined
          } : tab));
          return;
        } catch { /* Show the original failed refresh below. */ }
      }
      setTabs((old) => old.map((tab) => tab.id === tabId ? {
        ...tab, freshness: reason === "unstable" ? "uncertain" : "unavailable", freshnessReason: reason
      } : tab));
      if (reason === "root_reselection_required") setRootProblem(reason);
    }
  }

  async function reselectFolder() {
    const previous = rootRef.current;
    if (!previous || busy) return;
    setBusy(true);
    try {
      const selected = await api.selectRoot(previous.id);
      if (!selected) return;
      generationRef.current = selected.generation;
      rootRef.current = selected;
      setRoot(selected); setRootProblem(null);
      inspectionSequence.current += 1;
      inspectedDiskRef.current = null; setInspectedDisk(null);
      discardConflictRef.current = null; setDiscardConflictConfirm(null);
      setReloadJobs({}); setReloadResults({}); progressRef.current.clear();
      setTabs((old) => old.map((tab) => tab.explicitFile ? tab : {
        ...tab, request: { ...tab.request, rootId: selected.id }, freshness: "checking"
      }));
      for (const [key, directory] of Object.entries(directoriesRef.current)) {
        if (directory.loaded || directory.expanded) void loadDirectory(selected.id, JSON.parse(key));
      }
      setNotice(null);
      const retained = [...tabsRef.current].sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId));
      for (const tab of retained) await refreshRetainedTab(tab.id);
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
    } finally { setBusy(false); }
  }

  async function recoverMissingRoot() {
    if (busy || typeof api.reselectSessionRoot !== "function") return;
    setBusy(true);
    try {
      const restored = await api.reselectSessionRoot();
      if (restored) applyRestoredSession(restored);
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
    } finally { setBusy(false); }
  }

  async function recoverMissingFile(tab: Tab) {
    if (busy || !tab.restoredKey || typeof api.reselectSessionFile !== "function") return;
    setBusy(true);
    try {
      const selected = await api.reselectSessionFile(tab.restoredKey);
      if (!selected) return;
      const anchor = readingAnchors.current.get(tab.id);
      const scroll = scrollPositions.current.get(tab.id);
      if (anchor) readingAnchors.current.set(selected.id, anchor);
      if (scroll !== undefined) scrollPositions.current.set(selected.id, scroll);
      readingAnchors.current.delete(tab.id);
      scrollPositions.current.delete(tab.id);
      setTabs((old) => old.map((item) => item.id === tab.id ? {
        ...item, id: selected.id, name: selected.name, displayPath: selected.displayPath,
        request: { fileId: selected.id, explicitFile: true }, errorCode: undefined,
        diskVersion: undefined
      } : item));
      if (activeIdRef.current === tab.id) {
        activeIdRef.current = selected.id;
        setActiveId(selected.id);
      }
    } catch (error) {
      setNotice(errorText(locale, readerError(error).code));
    } finally { setBusy(false); }
  }

  async function reselectFile(tabId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const selected = await api.selectFile(tabId);
      if (selected) {
        inspectedDiskRef.current = null; setInspectedDisk(null);
        discardConflictRef.current = null; setDiscardConflictConfirm(null);
        inspectionSequence.current += 1;
        await refreshRetainedTab(tabId);
      }
    } catch (error) { setNotice(errorText(locale, readerError(error).code)); }
    finally { setBusy(false); }
  }

  async function chooseFile() {
    setBusy(true);
    setNotice(null);
    try {
      const selected = await api.selectFile();
      if (selected) {
        sessionClearedRef.current = false;
        sessionReadyRef.current = true;
        setSessionReady(true);
        if (typeof selected.generation === "number") generationRef.current = selected.generation;
        await (imageName(selected.name) ? openImage : openDocument)(
          { fileId: selected.id, explicitFile: true }, { name: selected.name, path: selected.displayPath });
      }
    } catch (error) {
      const detail = readerError(error);
      setNotice(errorText(locale, detail.code));
    } finally {
      setBusy(false);
    }
  }

  async function closeTab(id: string, handled = false) {
    if (savingTabRef.current === id) return;
    if (tabs.find((tab) => tab.id === id)?.dirty
      || (edits[id] && edits[id].draft !== edits[id].source) || pendingRecoveries[id]) {
      if (!handled) {
        setCloseIntent({ kind: "tab", tabId: id });
        return;
      }
    }
    const edit = edits[id];
    if (!handled && edit && !(await discardEdit(id))) return;
    imageLoads.current.delete(id);
    if (openingLarge.current === id) void api.cancelLargeOpen().catch(() => {});
    const large = tabs.find((tab) => tab.id === id)?.largeOpened;
    if (large) void api.closeLargeSource(large.snapshotId).catch(() => {});
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    // Session visit history retains view locations after the tab closes.
    if (activeId === id) setActiveId(next.at(-1)?.id ?? null);
    requestAnimationFrame(() => {
      (document.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
        ?? document.querySelector<HTMLButtonElement>(".welcome-actions button"))?.focus();
    });
  }

  function moveTab(id: string, destination: number) {
    setTabs((old) => {
      const source = old.findIndex((tab) => tab.id === id);
      if (source < 0 || destination < 0 || destination >= old.length || source === destination) return old;
      const next = [...old];
      const [moved] = next.splice(source, 1);
      next.splice(destination, 0, moved);
      return next;
    });
  }

  async function resolveClose(choice: "save" | "keep" | "discard" | "cancel") {
    const intent = closeIntent;
    if (!intent) return;
    if (choice === "cancel") {
      if (intent.kind === "folder" && pendingFolder) {
        void api.cancelRootSelection(pendingFolder).catch(() => {});
        setPendingFolder(null);
      }
      setPendingNativeEntry(null);
      setCloseIntent(null);
      return;
    }
    const targets = intent.kind === "app" || intent.kind === "window" || intent.kind === "folder"
      ? Array.from(new Set([...Object.keys(edits), ...Object.keys(pendingRecoveries)]))
      : intent.tabId ? [intent.tabId] : [];
    if (choice === "keep") {
      if (targets.some((id) => edits[id] && edits[id].checkpointStatus !== "saved")) {
        setNotice(t(locale, "checkpointRequired"));
        return;
      }
      if (intent.kind === "folder") {
        try {
          for (const sessionId of new Set(targets.map((id) =>
            edits[id]?.sessionId ?? pendingRecoveries[id]?.sessionId).filter((id): id is string => Boolean(id))))
            await api.suspendSectionEdit(sessionId);
        } catch (error) {
          setNotice(errorText(locale, readerError(error).code));
          return;
        }
      }
    } else if (choice === "save") {
      if (targets.some((id) => pendingRecoveries[id])) {
        setNotice(t(locale, "recoverEdit"));
        return;
      }
      for (const id of targets) {
        if (edits[id]?.draft !== edits[id]?.source) {
          if (!(await saveEdit(id))) return;
        } else if (edits[id] && !(await discardEdit(id))) return;
      }
    } else {
      for (const id of targets) {
        if (!(await discardEdit(id))) return;
      }
    }
    setCloseIntent(null);
    if (intent.kind === "app" || intent.kind === "window") {
      if (typeof api.finishWorkspaceSession === "function")
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await finishClose(intent.kind === "app");
    } else if (intent.kind === "folder" && pendingFolder) {
      try {
        const selected = await api.commitRootSelection(pendingFolder);
        setPendingFolder(null);
        setEdits({}); setPendingRecoveries({});
        editsRef.current = {}; pendingRecoveriesRef.current = {};
        activateFolder(selected);
      } catch (error) {
        setNotice(errorText(locale, readerError(error).code));
      }
    } else if (intent.kind === "folder" && pendingNativeEntry) {
      try {
        const accepted = await api.acceptNativeEntry(pendingNativeEntry);
        setPendingNativeEntry(null);
        await refreshNativeEntries();
        if (accepted.kind !== "folder") throw new Error("Expected an incoming folder");
        setEdits({}); setPendingRecoveries({});
        editsRef.current = {}; pendingRecoveriesRef.current = {};
        activateFolder(accepted.grant);
      } catch (error) {
        setNotice(errorText(locale, readerError(error).code));
      }
    } else if (intent.kind === "tab" && intent.tabId) {
      await closeTab(intent.tabId, true);
    } else if (intent.kind === "read" && intent.tabId) {
      setEdits((old) => editReducer(old, { type: "pause", tabId: intent.tabId!, paused: true }));
      if (edits[intent.tabId]) focusSectionBoundary(intent.tabId, edits[intent.tabId].section);
    }
  }

  async function finishClose(quit: boolean) {
    if (closeInProgress.current) return;
    closeInProgress.current = true;
    try {
      if (!sessionReadyRef.current && !sessionClearedRef.current) return;
      if (!sessionClearedRef.current && typeof api.finishWorkspaceSession === "function"
        && typeof api.checkpointWorkspaceSession === "function") await checkpointSession(true);
      await api.finishEditingClose(quit);
    } catch (error) {
      setNotice(errorText(localeRef.current, readerError(error).code));
    } finally {
      closeInProgress.current = false;
    }
  }

  async function clearSession() {
    setBusy(true);
    sessionReadyRef.current = false;
    setSessionReady(false);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = null;
    try {
      await sessionWrite.current.catch(() => {});
      for (const id of new Set([...Object.keys(editsRef.current),
        ...Object.keys(pendingRecoveriesRef.current)])) {
        if (!(await discardEdit(id))) throw { code: "recovery_error", message: "Could not clear the saved draft" };
      }
      if (typeof api.clearWorkspaceSession === "function") await api.clearWorkspaceSession();
      tabsRef.current = [];
      rootRef.current = null;
      activeIdRef.current = null;
      priorRootRef.current = false;
      setTabs([]); setRoot(null); setActiveId(null); setPriorRoot(false);
      setDirectories({}); setRootProblem(null);
      readingAnchors.current.clear(); scrollPositions.current.clear();
      documentZooms.current.clear(); imageViews.current.clear(); changeHistory(emptyHistory());
      setRestoreOffer(null); setClearSessionConfirm(false);
      setNotice(t(locale, "sessionCleared"));
      sessionClearedRef.current = true;
    } catch (error) {
      setNotice(`${t(locale, "cleanupFailed")} ${errorText(locale, readerError(error).code)}`);
      if (!restoreOffer) {
        sessionReadyRef.current = true;
        setSessionReady(true);
      }
    } finally { setBusy(false); }
  }

  async function clearSavedDrafts() {
    try {
      for (const tabId of new Set([...Object.keys(edits), ...Object.keys(pendingRecoveries)])) {
        if (!(await discardEdit(tabId))) { setNotice(t(locale, "cleanupFailed")); return; }
      }
      await api.clearAllRecovery();
      setClearDraftsConfirm(false);
      setNotice(t(locale, "draftsCleared"));
    } catch (error) {
      setClearDraftsConfirm(false);
      setNotice(`${t(locale, "cleanupFailed")} ${errorText(locale, readerError(error).code)}`);
    }
  }

  async function refreshSafetyCopies() {
    if (typeof api.listSafetyCopies !== "function") return;
    setStorageLoading(true);
    try { setSafetyCopies(await api.listSafetyCopies()); }
    catch { setSafetyCopies(null); }
    finally { setStorageLoading(false); }
  }

  async function clearResolvedCopies() {
    try {
      setSafetyCopies(await api.clearResolvedSafetyCopies(true));
      setClearCopiesConfirm(false);
      setNotice(t(locale, "safetyCopiesCleared"));
    } catch (error) {
      setClearCopiesConfirm(false);
      setSafetyCopies(null);
      await refreshSafetyCopies();
      setNotice(`${t(locale, "cleanupFailed")} ${errorText(locale, readerError(error).code)}`);
    }
  }

  function recoverEdit(tabId: string) {
    const recovery = pendingRecoveries[tabId];
    if (!recovery) return;
    activateRecovery(tabId, recovery);
  }

  function activateRecovery(tabId: string, recovery: RecoveryResponse) {
    checkpointSequence.current.set(tabId, recovery.sequence);
    setEdits((old) => editReducer(old, { type: "begin", tabId, edit: {
      sessionId: recovery.sessionId, diskVersion: recovery.diskVersion,
      section: recovery.section, source: recovery.source,
      draft: recovery.draft, lineSeparator: recovery.lineSeparator,
      initialEditorJson: recovery.editorJson, editorScrollTop: recovery.editorScrollTop,
      editorScrollLeft: recovery.editorScrollLeft, checkpointStatus: "saved",
      sequence: recovery.sequence, conflict: recovery.conflict
    } }));
    setTabs((old) => old.map((tab) => tab.id === tabId
      ? { ...tab, dirty: recovery.draft !== recovery.source,
        editingActive: true, freshness: recovery.conflict ? "conflict" : tab.freshness } : tab));
    setPendingRecoveries((old) => {
      const next = { ...old };
      delete next[tabId];
      return next;
    });
    if (recovery.conflict) setNotice(t(locale, "draftConflict"));
    requestAnimationFrame(() => {
      if (readerRef.current) readerRef.current.scrollTop = recovery.readerScrollTop;
    });
  }

  function documentSegments(tab: Tab): string[] | null {
    const currentRoot = rootRef.current;
    if (!currentRoot) return null;
    return tab.request.rootId === currentRoot.id && tab.request.segments?.length
      ? tab.request.segments : workspaceSegments(tab.displayPath, currentRoot.displayPath);
  }

  function refreshTarget(tab: Tab): RefreshTarget | null {
    if (tab.explicitFile) return { kind: "explicit-file", fileId: tab.id };
    const segments = documentSegments(tab), grantedRoot = rootRef.current;
    return grantedRoot && segments ? { kind: "root-file", rootId: grantedRoot.id, segments } : null;
  }

  async function copyPath(path: string) {
    try {
      if (!navigator.clipboard?.writeText) { setNotice(t(locale, "pathCopyUnavailable")); return; }
      await navigator.clipboard.writeText(path); setNotice(t(locale, "pathCopied"));
    } catch { setNotice(t(locale, "pathCopyFailed")); }
  }

  function documentStatus(tab: Tab): string {
    const status = tab.freshnessReason ? errorText(locale, tab.freshnessReason)
      : tab.errorCode ? errorText(locale, tab.errorCode)
      : tab.freshness === "unavailable" ? t(locale, "fileUnavailable")
      : tab.freshness === "checking" ? t(locale, "checking")
      : tab.freshness === "uncertain" ? t(locale, "unableConfirm")
      : tab.freshness === "conflict" ? t(locale, "conflictNotice")
      : tab.freshness === "changed" ? t(locale, "updatedFromDisk") : "";
    return [tab.dirty ? t(locale, "unsaved") : "", status].filter(Boolean).join(" · ");
  }

  useEffect(() => {
    document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
  }, [activeId]);

  async function revealDocument(tab: Tab) {
    const selectedRoot = rootRef.current;
    const segments = documentSegments(tab);
    if (!selectedRoot || !segments) { setNotice(t(locale, "revealUnavailable")); return; }
    const sequence = ++revealSequence.current;
    const current = () => sequence === revealSequence.current && rootRef.current?.id === selectedRoot.id
      && activeIdRef.current === tab.id;
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    setRevealing(true); setSidebarOpen(true); setSidebarPanel("explorer");
    try {
      for (let depth = 0; depth < segments.length; depth++) {
        if (!current()) return;
        const parent = segments.slice(0, depth);
        const key = pathKey(parent);
        let directory = directoriesRef.current[key];
        if (!directory?.loaded || directory.error) {
          if (!(await loadDirectory(selectedRoot.id, parent))) throw new Error("unavailable");
          await frame(); directory = directoriesRef.current[key];
        } else {
          setDirectories((old) => ({ ...old, [key]: { ...old[key], expanded: true } }));
          await frame();
        }
        let pages = 0;
        while (current() && !directory?.entries.some((entry) => entry.name === segments[depth])
          && directory?.nextOffset != null && pages++ < 1000) {
          if (!(await loadDirectory(selectedRoot.id, parent, true))) throw new Error("unavailable");
          await frame(); directory = directoriesRef.current[key];
        }
        if (!current()) return;
        if (!directory?.entries.some((entry) => entry.name === segments[depth])) throw new Error("unavailable");
      }
      await frame();
      if (!current()) return;
      const row = Array.from(treeRef.current?.querySelectorAll<HTMLButtonElement>("[data-tree-path]") ?? [])
        .find((element) => element.dataset.treePath === pathKey(segments));
      if (!row) throw new Error("unavailable");
      row.scrollIntoView?.({ block: "nearest", behavior: "instant" }); row.focus();
    } catch { if (current()) setNotice(t(locale, "revealUnavailable")); }
    finally { if (sequence === revealSequence.current) setRevealing(false); }
  }

  async function runCleanup(action: () => Promise<void>) {
    if (cleanupRef.current) return;
    cleanupRef.current = true; setCleanupBusy(true);
    try { await action(); }
    finally { cleanupRef.current = false; setCleanupBusy(false); }
  }

  function toggleDirectory(segments: string[]) {
    if (!root) return;
    const key = pathKey(segments);
    const current = directories[key];
    if (!current || !current.loaded) {
      void loadDirectory(root.id, segments);
      return;
    }
    setDirectories((old) => ({
      ...old,
      [key]: { ...old[key], expanded: !old[key].expanded }
    }));
  }

  function scrollToAnchor(anchor: string) {
    const decoded = headingSlug(anchor);
    const element = document.getElementById(decoded) ?? document.getElementById(anchor);
    element?.scrollIntoView({ block: "start", behavior: "instant" });
    if (!element) setNotice(t(locale, "missing"));
    else setActiveOutlineId(element.id);
  }

  async function navigate(target: string) {
    if (!active?.identityKey) return;
    const sourceId = active.id, generation = generationRef.current, sequence = ++openSequence.current;
    const current = () => sourceId === activeIdRef.current && generation === generationRef.current && sequence === openSequence.current;
    try {
      const result = await api.resolveLink(sourceId, target);
      if (!current()) return;
      if (result.kind === "anchor" && result.anchor) {
        noteLocationVisit(result.anchor);
        scrollToAnchor(result.anchor);
      } else if (result.kind === "document" && result.fileId) {
        const loading = openDocument({ fileId: result.fileId });
        const openIntent = openSequence.current;
        const loadedId = await loading;
        if (loadedId && loadedId === activeIdRef.current && generation === generationRef.current
          && openIntent === openSequence.current && result.anchor) setPendingAnchor({ fileId: loadedId, anchor: result.anchor });
      } else if (result.kind === "image" && result.fileId) {
        await openImage({ fileId: result.fileId });
      } else {
        setNotice(result.kind === "missing" ? t(locale, "missing")
          : result.kind === "unsupported" ? t(locale, "unsupported")
            : t(locale, "linkBlocked"));
      }
    } catch (error) {
      if (current()) setNotice(errorText(locale, readerError(error).code));
    }
  }

  function captureReadingPosition(id: string, reader: HTMLDivElement) {
    // A worker's pending view has no passage geometry; keep the retained position.
    const tab = tabsRef.current.find(item => item.id === id);
    if (tab && tab.kind !== "image" && !tab.largeInspection
      && (tab.content === undefined || !reader.querySelector(".document-page .markdown-body"))) return;
    const scrollTop = reader.scrollTop;
    scrollPositions.current.set(id, scrollTop);
    const headings = Array.from(reader.querySelectorAll<HTMLElement>(
      ".document-page h1[id], .document-page h2[id], .document-page h3[id], .document-page h4[id], .document-page h5[id], .document-page h6[id]"));
    const readerTop = reader.getBoundingClientRect().top;
    let closest: { headingId: string | null; offset: number; scrollTop: number } = { headingId: null, offset: 0, scrollTop };
    for (const heading of headings) {
      const top = zoomRect(heading, documentZooms.current.get(id) ?? 1).top - readerTop + scrollTop;
      if (top <= scrollTop + 24) closest = { headingId: heading.id, offset: scrollTop - top, scrollTop };
    }
    readingAnchors.current.set(id, closest);
    historyRef.current = updateVisit(historyRef.current, id, { scrollTop, scrollLeft: reader.scrollLeft });
    const currentVisit = historyRef.current.entries[historyRef.current.cursor];
    if (currentVisit?.key === id) currentVisit.target.zoom = documentZooms.current.get(id);
    setActiveOutlineId((prior) => prior === closest.headingId ? prior : closest.headingId);
  }

  async function traverseHistory(cursor: number) {
    if (traversal.current || busy) return;
    if (activeIdRef.current && readerRef.current) captureReadingPosition(activeIdRef.current, readerRef.current);
    const entry = historyRef.current.entries[cursor];
    if (!entry) return;
    const invoking = document.activeElement as HTMLElement | null;
    const generation = generationRef.current;
    const sequence = ++openSequence.current;
    const token = Symbol("history traversal");
    traversal.current = token; setHistoryBusy(true); setBusy(true); setNotice(null);
    const valid = () => generation === generationRef.current && sequence === openSequence.current;
    try {
      const target = entry.target;
      const existing = tabsRef.current.find((tab) => tab.id === target.id);
      let loaded: Tab;
      if (target.kind === "image") {
        const image = await api.openImage(target.request);
        loaded = { ...existing, ...target, id: image.fileId, image, kind: "image", imageLoading: false,
          identityKey: image.identityKey, diskVersion: image.diskVersion, freshness: "current", errorCode: undefined };
      } else {
        try {
          const document = await api.readDocument(target.request);
          const edit = editsRef.current[document.fileId];
          loaded = { ...existing, ...target, id: document.fileId, name: document.name, displayPath: document.displayPath,
            identityKey: document.identityKey, content: edit ? existing?.content ?? document.content : document.content,
            diskVersion: edit?.diskVersion ?? document.diskVersion,
            freshness: edit && edit.diskVersion !== document.diskVersion ? "conflict" : "current",
            errorCode: undefined, dirty: edit ? edit.draft !== edit.source : false, editingActive: Boolean(edit) };
          if (!existing && typeof api.loadSectionRecovery === "function") {
            const recovery = await api.loadSectionRecovery(document.fileId);
            if (recovery && valid()) setPendingRecoveries((old) => ({ ...old, [document.fileId]: recovery }));
          }
        } catch (error) {
          if (readerError(error).code !== "oversize") throw error;
          const inspected = await api.inspectLargeFile(target.request);
          loaded = { ...existing, ...target, id: inspected.fileId, largeInspection: inspected,
            content: undefined, errorCode: undefined, largeOpened: undefined, largeConsent: false };
        }
      }
      if (!valid()) return;
      // Supersede older pending reads only after the validated traversal succeeds.
      imageLoads.current.delete(target.id); documentLoads.current.delete(target.id);
      documentLoads.current.delete(`${target.request.rootId}:${pathKey(target.request.segments ?? [])}`);
      restoreLoads.current.delete(target.id);
      // Commit file identity and cursor together, only after access succeeds.
      if (target.imageView) imageViews.current.set(loaded.id, target.imageView);
      documentZooms.current.set(loaded.id, target.zoom ?? 1);
      scrollPositions.current.set(loaded.id, entry.scrollTop);
      readingAnchors.current.set(loaded.id, { headingId: null, offset: 0, scrollTop: entry.scrollTop });
      setTabs((old) => old.some((tab) => tab.id === loaded.id)
        ? old.map((tab) => tab.id === loaded.id ? loaded : tab) : [...old, loaded]);
      const direction = cursor < historyRef.current.cursor ? "historyBack" : "historyForward";
      const entries = [...historyRef.current.entries];
      entries[cursor] = { ...entry, key: loaded.id, target: { ...target, id: loaded.id, name: loaded.name, displayPath: loaded.displayPath } };
      changeHistory({ ...historyRef.current, entries, cursor });
      activeIdRef.current = loaded.id; setActiveId(loaded.id);
      setFindOpen(false); setReloadMenu(null); setHistoryOpen(false);
      setHistoryAnnouncement(`${t(locale, direction)}: ${loaded.name}`);
      requestAnimationFrame(() => {
        if (!valid()) return;
        if (readerRef.current) {
          readerRef.current.scrollTop = entry.scrollTop;
          readerRef.current.scrollLeft = entry.scrollLeft;
        }
        if (invoking?.isConnected && !(invoking instanceof HTMLButtonElement && invoking.disabled)) invoking.focus();
        else document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
      });
    } catch (error) {
      if (valid()) setNotice(`${entry.target.name}: ${errorText(locale, readerError(error).code)}`);
    } finally {
      if (traversal.current === token) { traversal.current = null; setHistoryBusy(false); setBusy(false); }
    }
  }

  function cancelHistoryTraversal() {
    openSequence.current += 1; traversal.current = null; setHistoryBusy(false); setBusy(false);
  }

  function clearVisitHistory() {
    const current = historyRef.current.entries[historyRef.current.cursor];
    changeHistory(current ? { entries: [current], cursor: 0 } : emptyHistory());
  }

  function noteLocationVisit(anchor: string) {
    if (!active) return;
    if (readerRef.current) captureReadingPosition(active.id, readerRef.current);
    changeHistory(recordVisit(historyRef.current, { key: active.id, anchor,
      target: { id: active.id, name: active.name, displayPath: active.displayPath, kind: active.kind, explicitFile: active.explicitFile,
        request: active.request, zoom: documentZoom }, scrollTop: readerRef.current?.scrollTop ?? 0, scrollLeft: 0 }));
  }

  useLayoutEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;
    if (!active || (active.kind !== "image" && !active.largeInspection
      && (active.content === undefined || renderedMarkdown?.id !== active.id
        || renderedMarkdown.content !== active.content))) return;
    const saved = readingAnchors.current.get(activeId ?? "");
    setActiveOutlineId((prior) => prior === (saved?.headingId ?? null)
      ? prior : saved?.headingId ?? null);
    if (saved?.headingId) {
      const heading = document.getElementById(saved.headingId);
      if (heading && reader.contains(heading)) {
        const headingBox = zoomRect(heading, documentZooms.current.get(activeId ?? "") ?? 1);
        const readerBox = reader.getBoundingClientRect();
        const top = headingBox.top - readerBox.top + reader.scrollTop;
        reader.scrollTop = headingBox.height === 0 && readerBox.height === 0
          ? saved.scrollTop : Math.max(0, top + saved.offset);
        return;
      }
      setNotice(t(locale, "readingPositionShifted"));
    }
    reader.scrollTop = saved?.scrollTop ?? scrollPositions.current.get(activeId ?? "") ?? 0;
  }, [activeId, active?.content, readingSettings, sidebarOpen, outlineOpen, viewportWidth, renderedMarkdown]);

  useEffect(() => {
    const resize = () => {
      if (activeIdRef.current && readerRef.current) captureReadingPosition(activeIdRef.current, readerRef.current);
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function focusActionTrigger(trigger: HTMLElement | null) {
    const disclosure = trigger?.closest("details");
    (disclosure && !disclosure.open ? disclosure.querySelector("summary") : trigger)?.focus();
  }

  function toggleSidebar() {
    if (compactSidebar) {
      if (compactSidebarOpen) sidebarTriggerRef.current?.focus();
      setCompactSidebarOpen((open) => !open); return;
    }
    if (activeId && readerRef.current) captureReadingPosition(activeId, readerRef.current);
    if (sidebarElementRef.current?.contains(document.activeElement)) sidebarTriggerRef.current?.focus();
    if (sidebarAnimationTimer.current) clearTimeout(sidebarAnimationTimer.current);
    setSidebarAnimating(true);
    sidebarAnimationTimer.current = setTimeout(() => setSidebarAnimating(false), 180);
    setSidebarOpen((open) => !open);
  }

  function toggleOutline() {
    if (activeId && readerRef.current) captureReadingPosition(activeId, readerRef.current);
    if (outlineElementRef.current?.contains(document.activeElement)) focusActionTrigger(outlineTriggerRef.current);
    setOutlineOpen((open) => !open);
  }

  useEffect(() => {
    if (!pendingAnchor || !activeId) return;
    if (pendingAnchor.fileId !== activeId) { setPendingAnchor(null); return; }
    if (renderedMarkdown?.id !== activeId || renderedMarkdown.content !== active?.content) return;
    const frame = requestAnimationFrame(() => {
      scrollToAnchor(pendingAnchor.anchor);
      setPendingAnchor(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId, active?.content, pendingAnchor, renderedMarkdown]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && compactSidebar && compactSidebarOpen) {
        event.preventDefault(); setCompactSidebarOpen(false); sidebarTriggerRef.current?.focus(); return;
      }
      if (event.key === "Escape" && historyBusy) { event.preventDefault(); cancelHistoryTraversal(); return; }
      if (event.key === "Escape" && findOpen) {
        event.preventDefault();
        closeFind();
        return;
      }
      if (!event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === "f") {
        event.preventDefault();
        if (event.shiftKey && root) { setSidebarOpen(true); setSidebarPanel("search"); }
        else openFind();
      } else if (key === "o") {
        event.preventDefault();
        if (event.shiftKey) void chooseFolder();
        else void chooseFile();
      } else if (key === "w" && activeId) {
        event.preventDefault();
        void closeTab(activeId);
      } else if (key === "s" && activeId && edits[activeId] && !edits[activeId].paused) {
        event.preventDefault();
        void saveEdit(activeId);
      } else if (key === "r" && active) {
        event.preventDefault();
        if (active.largeInspection) { void reloadLargeTab(active.id); return; }
        const target: RefreshTarget | null = active.explicitFile && active.request.fileId
          ? { kind: "explicit-file", fileId: active.request.fileId }
          : active.request.rootId && active.request.segments
            ? { kind: "root-file", rootId: active.request.rootId, segments: active.request.segments }
            : null;
        if (target) void startReload({ target, label: active.name, x: 0, y: 0,
          anchor: readerRef.current ?? document.body });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  menuActionRef.current = (payload: string) => {
      if (payload === "workspace_open_file") void chooseFile();
      else if (payload === "workspace_open_folder") void chooseFolder();
      else if (payload === "workspace_close_tab" && activeId) void closeTab(activeId);
      else if (payload === "workspace_save" && activeId && edits[activeId]) void saveEdit(activeId);
      else if (payload === "workspace_find") openFind();
      else if (payload === "workspace_reload" && active) {
        if (active.largeInspection) { void reloadLargeTab(active.id); return; }
        const target: RefreshTarget | null = active.explicitFile && active.request.fileId
          ? { kind: "explicit-file", fileId: active.request.fileId }
          : active.request.rootId && active.request.segments
            ? { kind: "root-file", rootId: active.request.rootId, segments: active.request.segments }
            : null;
        if (target) void startReload({ target, label: active.name, x: 0, y: 0,
          anchor: readerRef.current ?? document.body });
      } else if (payload === "workspace_appearance_system") appearance.applyPreference("system");
      else if (payload === "workspace_appearance_light") appearance.applyPreference("light");
      else if (payload === "workspace_appearance_dark") appearance.applyPreference("dark");
  };
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    try {
      void listen<string>("native:menu", ({ payload }) => menuActionRef.current(payload))
        .then((stop) => { if (disposed) stop(); else unlisten = stop; }).catch(() => {});
    } catch { /* Browser-only preview has no Tauri event host. */ }
    return () => { disposed = true; unlisten?.(); };
  }, []);

  function tree(segments: string[]): React.ReactNode {
    const state = directories[pathKey(segments)];
    if (!state?.expanded) return null;
    const entries = state.entries.filter((entry) => entry.kind === "directory" || !markdownOnly || entry.kind === "markdown" || entry.kind === "image");
    return (
      <div role="group" className="tree-group">
        {entries.map((entry) => {
          const path = [...segments, entry.name];
          const isFolder = entry.kind === "directory";
          const expanded = directories[pathKey(path)]?.expanded ?? false;
          const reloadTarget: RefreshTarget = isFolder
            ? { kind: "folder", rootId: root!.id, segments: path }
            : { kind: "root-file", rootId: root!.id, segments: path };
          return (
            <div key={pathKey(path)}>
              <button
                type="button"
                className="tree-row"
                disabled={historyBusy}
                data-tree-path={pathKey(path)}
                aria-current={!isFolder && active && pathKey(documentSegments(active) ?? []) === pathKey(path) ? "page" : undefined}
                aria-expanded={isFolder ? expanded : undefined}
                title={path.join("/")}
                onContextMenu={(event) => showReloadMenu(event, reloadTarget, entry.name)}
                onKeyDown={(event) => {
                  if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
                    showReloadMenu(event, reloadTarget, entry.name);
                    return;
                  }
                  const rows = Array.from(document.querySelectorAll<HTMLButtonElement>(".tree-row"));
                  const index = rows.indexOf(event.currentTarget);
                  if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
                    event.preventDefault();
                    const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1
                      : Math.max(0, Math.min(rows.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
                    rows[next]?.focus();
                  } else if (isFolder && event.key === "ArrowRight" && !expanded) {
                    event.preventDefault();
                    toggleDirectory(path);
                  } else if (isFolder && event.key === "ArrowRight" && expanded) {
                    event.preventDefault();
                    rows[index + 1]?.focus();
                  } else if (isFolder && event.key === "ArrowLeft" && expanded) {
                    event.preventDefault();
                    toggleDirectory(path);
                  } else if (event.key === "ArrowLeft" && segments.length) {
                    event.preventDefault();
                    rows.find((row) => row.title === segments.join("/"))?.focus();
                  }
                }}
                onClick={() => isFolder
                  ? toggleDirectory(path)
                  : entry.kind === "markdown" && root
                    ? void openDocument({ rootId: root.id, segments: path }, { name: entry.name, path: path.join("/") })
                    : entry.kind === "image" && root
                      ? void openImage({ rootId: root.id, segments: path }, { name: entry.name, path: path.join("/") })
                    : setNotice(t(locale, "unsupported"))}
              >
                <span className="tree-icon" aria-hidden="true">{isFolder ? expanded ? "⌄" : "›" : entry.kind === "markdown" ? "◇" : entry.kind === "image" ? "▧" : "·"}</span>
                <span className="tree-name">{entry.name}</span>
              </button>
              {reloadFeedback(reloadTarget) && <div className="tree-feedback" role="status">{reloadFeedback(reloadTarget)}</div>}
              {isFolder && reloadProgress(reloadTarget)}
              {isFolder && expanded ? tree(path) : null}
            </div>
          );
        })}
        {state.loading && (
          <div className="tree-progress" role="status">
            <span>{t(locale, "loading")}</span>
            <button type="button" onClick={() => void cancelDirectory(segments)}>{t(locale, "cancel")}</button>
          </div>
        )}
        {state.error && <div className="tree-feedback" role="alert">
          {errorText(locale, state.error)}
          <button type="button" onClick={() => root && void loadDirectory(root.id, segments)}>{t(locale, "retry")}</button>
        </div>}
        {state.nextOffset !== null && !state.loading && (
          <button className="load-more" type="button" onClick={() => root && void loadDirectory(root.id, segments, true)}>
            {t(locale, "loadMore")}
          </button>
        )}
      </div>
    );
  }

  const contextTab = reloadMenu && tabs.find(tab => {
    const target = refreshTarget(tab);
    return target && reloadResultKey(target) === reloadResultKey(reloadMenu.target);
  });
  const contextPath = reloadMenu?.target.kind === "explicit-file" ? contextTab?.displayPath
    : reloadMenu && root?.id === reloadMenu.target.rootId
      ? [root.displayPath, ...reloadMenu.target.segments].join("/") : undefined;

  return (
    <div className="app-shell">
      <header ref={toolbarRef} className="toolbar">
        <button ref={sidebarTriggerRef} className="icon-button" type="button" onClick={toggleSidebar}
          title={t(locale, "toggleSidebar")} aria-label={t(locale, "toggleSidebar")}>☰</button>
        <span className="workspace-title">{root?.name ?? t(locale, "workspace")}</span>
        <span className="toolbar-spacer" />
        <span className="local-badge">{t(locale, "localOnly")}</span>
        {!active && <div className="toolbar-group">
          <button type="button" disabled>{t(locale, "outline")}</button>
          <button ref={settingsTriggerRef} type="button" aria-expanded={readingSettingsOpen} aria-controls="reading-settings-panel"
            onClick={() => setReadingSettingsOpen(open => !open)}>{t(locale, "readingSettings")}</button>
        </div>}
        <div className="toolbar-group">
        <label className="appearance-control">
          <span>{t(locale, "appearance")}</span>
          <select aria-label={t(locale, "appearance")} value={appearance.preference}
            onChange={(event) => appearance.applyPreference(event.target.value as AppearanceMode)}>
            <option value="system">{t(locale, "appearanceSystem")}</option>
            <option value="light">{t(locale, "appearanceLight")}</option>
            <option value="dark">{t(locale, "appearanceDark")}</option>
          </select>
        </label>
        <label className="language-control">
          <span>{t(locale, "language")}</span>
          <select aria-label={t(locale, "language")} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        </div>
        {!root && <div className="toolbar-group">
        <button type="button" onClick={() => void chooseFile()} disabled={busy}>{t(locale, "openFile")}</button>
        <button className={root ? undefined : "primary-button"} type="button" onClick={() => void chooseFolder()} disabled={busy}>
          {t(locale, "openFolder")}
        </button>
        </div>}
      </header>

      {settingsOverlay.shown && <section id="reading-settings-panel" className="reading-settings-panel"
        data-closing={settingsOverlay.closing} inert={settingsOverlay.closing}
        aria-hidden={settingsOverlay.closing} aria-label={t(locale, "readingSettings")}
        onKeyDown={(event) => {
          if (event.key === "Escape" && readingSettingsOpen) {
            event.stopPropagation();
            setReadingSettingsOpen(false);
            focusActionTrigger(settingsTriggerRef.current);
          }
        }}>
        <div className="reading-settings-heading"><strong>{t(locale, "readingSettings")}</strong>
          <button type="button" aria-label={t(locale, "closeReadingSettings")}
            onClick={() => { setReadingSettingsOpen(false); focusActionTrigger(settingsTriggerRef.current); }}>×</button></div>
        <label>{t(locale, "readingFont")}
          <select value={readingSettings.readingFont} onChange={(event) => applyReadingSettings({
            ...readingSettings, readingFont: event.target.value as SessionPanel["readingFont"] })}>
            <option value="roboto">Roboto</option><option value="serif">{t(locale, "systemSerif")}</option>
            <option value="sans">{t(locale, "systemSans")}</option>
            <option value="mono">{t(locale, "systemMono")}</option>
          </select></label>
        <label>{t(locale, "readingSize")}: {readingSettings.readingSize} px
          <input type="range" min="12" max="24" step="1" value={readingSettings.readingSize}
            onChange={(event) => applyReadingSettings({ ...readingSettings,
              readingSize: Number(event.target.value) })} /></label>
        <label>{t(locale, "readingLineHeight")}: {readingSettings.readingLineHeight.toFixed(1)}
          <input type="range" min="1.3" max="2.2" step="0.1" value={readingSettings.readingLineHeight}
            onChange={(event) => applyReadingSettings({ ...readingSettings,
              readingLineHeight: Number(event.target.value) })} /></label>
        <label>{t(locale, "readingWidth")}: {readingSettings.readingWidth} px
          <input type="range" min="480" max="1200" step="20" value={readingSettings.readingWidth}
            onChange={(event) => applyReadingSettings({ ...readingSettings,
              readingWidth: Number(event.target.value) })} /></label>
        <div className="reading-width-presets" aria-label={t(locale, "readingWidth")}>
          <button type="button" aria-pressed={readingSettings.readingWidth === 760}
            onClick={() => applyReadingSettings({ ...readingSettings, readingWidth: 760 })}>{t(locale, "comfortableWidth")}</button>
          <button type="button" aria-pressed={readingSettings.readingWidth === 1200}
            onClick={() => applyReadingSettings({ ...readingSettings, readingWidth: 1200 })}>{t(locale, "wideWidth")}</button>
          {![760, 1200].includes(readingSettings.readingWidth) && <span>{t(locale, "customWidth")}</span>}
        </div>
        <button type="button" onClick={() => applyReadingSettings({ readingFont: "roboto",
          readingSize: 16, readingLineHeight: 1.6, readingWidth: 760 })}>{t(locale, "resetReading")}</button>
      </section>}

      {nativeEntries.length > 0 && <section className="native-entries notice" aria-label={t(locale, "incomingItems")}>
        <strong>{t(locale, "incomingItems")}</strong>
        <ul>{nativeEntries.map((entry) => <li key={entry.id}>
          <span title={entry.displayPath}>{entry.name} · {entry.source === "finder" ? t(locale, "fromFinder") : t(locale, "fromDrop")}
            {entry.errorCode && ` · ${errorText(locale, entry.errorCode)}`}</span>
          {!entry.errorCode && <button type="button" disabled={busy} onClick={() => void acceptNativeEntry(entry.id)}
            aria-label={`${t(locale, "openIncoming")}: ${entry.name}`}>{t(locale, "openIncoming")}</button>}
          <button type="button" onClick={() => void dismissNativeEntry(entry.id)}
            aria-label={`${t(locale, "dismiss")}: ${entry.name}`}>{t(locale, "dismiss")}</button>
        </li>)}</ul>
      </section>}

      {(appearance.persistenceWarning || appearance.nativeWarning) && <div className="notice" role="status">
        <span>{appearance.persistenceWarning ? t(locale, "appearanceSaveFailed") : t(locale, "appearanceNativeFailed")}</span>
      </div>}

      <div className="workspace-layout">
        <aside ref={sidebarElementRef} className="sidebar" aria-label={t(locale, "explorer")}
          data-open={sidebarVisible} data-compact={compactSidebar} data-animate={sidebarAnimating}
          aria-hidden={!sidebarVisible} inert={!sidebarVisible}
          style={{ width: sidebarVisible ? sidebarWidth : 0 }} onPointerUp={(event) => {
            if (!sidebarVisible || compactSidebar) return;
            const width = event.currentTarget.getBoundingClientRect().width;
            if (Math.abs(width - sidebarWidth) > 1) setSidebarWidth(width);
          }}>
            <div className="sidebar-heading sidebar-modes">
              <button ref={searchTrigger} type="button" className="projects-trigger" aria-haspopup="menu"
                aria-expanded={Boolean(projectsMenu)} disabled={busy} onClick={(event) => {
                  if (projectsMenu) { setProjectsMenu(null); return; }
                  setReloadMenu(null); setGoMenu(null);
                  const bounds = event.currentTarget.getBoundingClientRect();
                  setProjectsMenu({ anchor: event.currentTarget, x: bounds.left, y: bounds.bottom + 4 });
                }}><span>{t(locale, "projects")}</span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M1 3 L6 8 L11 3" fill="none" stroke="currentColor" strokeWidth="1.75" /></svg></button>
            </div>
            {root ? (
              <>
                <div hidden={sidebarPanel !== "search"} inert={sidebarPanel !== "search"} className="folder-search-host">
                  <FolderSearchPanel key={root.id} root={root} locale={locale} active={sidebarPanel === "search"}
                    query={folderQuery} onQueryChange={setFolderQuery}
                    onClose={() => { setSidebarPanel("explorer"); searchTrigger.current?.focus(); }}
                    onOpen={(result, hit, query) => openFolderSearchResult(result, hit, query, root.id)} />
                </div>
                <div hidden={sidebarPanel !== "explorer"} inert={sidebarPanel !== "explorer"} className="explorer-host">
                <div className="root-label" tabIndex={0} title={root.displayPath}
                  onContextMenu={(event) => showReloadMenu(event, { kind: "folder", rootId: root.id, segments: [] }, root.name)}
                  onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) showReloadMenu(event, { kind: "folder", rootId: root.id, segments: [] }, root.name); }}>{root.name}</div>
                {rootProblem && <div className="tree-feedback" role="status">
                  <span>{errorText(locale, rootProblem)}</span>
                  <button type="button" disabled={busy} onClick={() => void reselectFolder()}>{t(locale, "selectFolderAgain")}</button>
                </div>}
                <label className="filter-control">
                  <input type="checkbox" checked={markdownOnly} onChange={(event) => setMarkdownOnly(event.target.checked)} />
                  {t(locale, "filterMarkdown")}
                </label>
                <div className="tree-scroll" ref={treeRef} onScroll={() => scheduleSessionCheckpoint()}
                  onContextMenu={(event) => { if (!(event.target as HTMLElement).closest(".tree-row")) showReloadMenu(event, { kind: "folder", rootId: root.id, segments: [] }, root.name); }}>
                  {tree([])}
                  {directories[pathKey([])]?.loaded
                    && !directories[pathKey([])]?.entries.some((entry) =>
                      entry.kind === "directory" || !markdownOnly || entry.kind === "markdown" || entry.kind === "image") && (
                    <div className="sidebar-empty">
                      <p>{t(locale, "emptyFolder")}</p>
                      <button type="button" onClick={() => void chooseFolder()}>{t(locale, "chooseAnother")}</button>
                    </div>
                  )}
                </div>
                </div>
              </>
            ) : (
              <div className="sidebar-empty">
                <p>{t(locale, "noDocument")}</p>
                <button type="button" onClick={() => void chooseFolder()}>{t(locale, "openFolder")}</button>
              </div>
            )}
            <div className="sidebar-footnote">
              <strong>{t(locale, "storageManagement")}</strong>
              <div>{t(locale, "activeDrafts")}: {new Set([...Object.keys(edits), ...Object.keys(pendingRecoveries)]).size}</div>
              {safetyCopies && safetyCopies.unresolvedCount > 0 && <p role="status">
                {t(locale, "unresolvedCopies")}: {safetyCopies.unresolvedCount}</p>}
              <button type="button" onClick={() => { setStorageOpen(true); void refreshSafetyCopies(); }}>{t(locale, "manageStorage")}</button>
            </div>
          </aside>

        {compactSidebar && compactSidebarOpen && <button type="button" className="sidebar-scrim" aria-label={t(locale, "closeSidebar")}
          onClick={() => { setCompactSidebarOpen(false); sidebarTriggerRef.current?.focus(); }} />}
        <main className="main-panel">
          <div className="document-tabs">
          <div className="history-controls" role="group" aria-label={t(locale, "visitHistory")}>
            {([-1, 1] as const).map((direction) => {
              const cursor = direction === -1 && !active ? history.cursor : history.cursor + direction;
              const destination = history.entries[cursor];
              const label = t(locale, direction === -1 ? "historyBack" : "historyForward");
              const reason = t(locale, direction === -1 ? "historyNoPrevious" : "historyNoNext");
              return <button key={direction} type="button" className="history-arrow" aria-label={label}
                disabled={historyBusy || !destination || (direction === 1 && !active)}
                aria-description={historyBusy ? t(locale, "loading") : destination
                  ? `${destination.target.name} · ${destination.target.displayPath}` : reason}
                title={destination ? `${label}: ${destination.target.name}\n${destination.target.displayPath}` : reason}
                onContextMenu={(event) => { event.preventDefault(); setHistoryDirection(direction); setHistoryOpen(true); }}
                onClick={() => void traverseHistory(cursor)}>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                  <path d={direction === -1 ? "M9 0 L3 6 L9 12" : "M3 0 L9 6 L3 12"}
                    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>;
            })}
          </div><div className="tab-strip" role="tablist" aria-label={t(locale, "documents")}>
            {tabs.map((tab) => {
              const parent = distinguishingParent(tab, tabs);
              return (
                <div className={`tab ${tab.id === activeId ? "active" : ""}`} key={tab.id}
                  draggable onDragStart={() => { draggedTab.current = tab.id; }}
                  onDragEnd={() => { draggedTab.current = null; }}
                  onDragOver={(event) => { if (draggedTab.current) event.preventDefault(); }}
                  onDrop={(event) => {
                    if (!draggedTab.current) return;
                    event.preventDefault();
                    moveTab(draggedTab.current, tabs.findIndex((item) => item.id === tab.id));
                    draggedTab.current = null;
                  }}>
                  <button type="button" role="tab" aria-selected={tab.id === activeId}
                    disabled={historyBusy}
                    aria-label={[tab.name, parent, documentStatus(tab)].filter(Boolean).join(" · ")}
                    aria-description={tab.displayPath}
                    aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
                    tabIndex={tab.id === activeId ? 0 : -1}
                    title={tab.displayPath} onClick={() => { openSequence.current += 1; activeIdRef.current = tab.id; setActiveId(tab.id); }}
                    onContextMenu={tab.explicitFile ? (event) => showReloadMenu(event,
                      { kind: "explicit-file", fileId: tab.id }, tab.name) : undefined}
                    onKeyDown={(event) => {
                      if (tab.explicitFile && (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey))) {
                        showReloadMenu(event, { kind: "explicit-file", fileId: tab.id }, tab.name);
                        return;
                      }
                      if (event.altKey && event.shiftKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
                        event.preventDefault();
                        moveTab(tab.id, tabs.findIndex((item) => item.id === tab.id)
                          + (event.key === "ArrowRight" ? 1 : -1));
                        setNotice(t(locale, "tabMoved"));
                        return;
                      }
                      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                      event.preventDefault();
                      const index = tabs.findIndex((item) => item.id === tab.id);
                      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
                        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                      openSequence.current += 1;
                      activeIdRef.current = tabs[next].id;
                      setActiveId(tabs[next].id);
                      const buttons = event.currentTarget.closest(".tab-strip")?.querySelectorAll<HTMLButtonElement>("[role=tab]");
                      buttons?.[next]?.focus();
                    }}>
                    <span>{tabFilename(tab, tabs)}</span>
                    {parent && <small>{parent}</small>}
                    {tab.dirty && <small>{t(locale, "unsaved")}</small>}
                    {tab.freshness === "checking" && <small className="tab-refresh-status">{t(locale, "checking")}</small>}
                    {tab.freshness === "changed" && <small className="tab-refresh-status">{t(locale, "updatedFromDisk")}</small>}
                    {tab.freshness === "uncertain" && <small className="tab-refresh-status">{t(locale, "unableConfirm")}</small>}
                    {tab.freshness === "unavailable" && <small className="tab-refresh-status">{tab.freshnessReason ? errorText(locale, tab.freshnessReason) : t(locale, "fileUnavailable")}</small>}
                    {tab.freshness === "conflict" && <small className="tab-refresh-status">{t(locale, "conflictNotice")}</small>}
                  </button>
                  <button className="tab-close" type="button" title={t(locale, "closeTab")}
                    disabled={historyBusy || savingTabId === tab.id}
                    aria-label={`${t(locale, "closeTab")}: ${tab.name}`} onClick={() => void closeTab(tab.id)}>×</button>
                </div>
              );
            })}
          </div>
          <button type="button" className="history-menu-trigger" aria-label={t(locale, "goMenuLabel")} aria-haspopup="menu" aria-expanded={Boolean(goMenu)}
            onClick={(event) => {
              if (goMenu) { setGoMenu(null); return; }
              setProjectsMenu(null); setReloadMenu(null);
              const bounds = event.currentTarget.getBoundingClientRect();
              setGoMenu({ anchor: event.currentTarget, x: bounds.left, y: bounds.bottom + 4 });
            }}>{t(locale, "goMenu")}</button>
          <button className="document-list-trigger" type="button" aria-expanded={documentsOpen}
            disabled={!tabs.length} onClick={() => setDocumentsOpen(true)}>{t(locale, "openDocuments")} ({tabs.length})</button>
          </div>
          {historyAnnouncement && <span className="sr-only" role="status" aria-label={t(locale, "visitHistory")}>{historyAnnouncement}</span>}
          {historyOpen && <WorkspaceDialog title={t(locale, "visitHistory")} closeLabel={t(locale, "closeSurface")}
            closeDisabled={historyBusy} onClose={() => { if (!historyBusy) setHistoryOpen(false); }}>
            <p>{t(locale, "historySessionLimit")}</p>
            <ol className="open-document-list">{history.entries.map((entry, index) => (historyDirection === -1
              && (index > history.cursor || (Boolean(active) && index === history.cursor)))
              || (historyDirection === 1 && index <= history.cursor) ? null : <li key={index}>
              <button type="button" disabled={historyBusy || (index === history.cursor && Boolean(active))}
                aria-current={index === history.cursor ? "step" : undefined} onClick={() => void traverseHistory(index)}>
                <strong>{entry.target.name}</strong><span>{entry.target.displayPath}</span>
                {entry.anchor && <span>{entry.anchor}</span>}
                <span>{entry.target.kind === "image" ? t(locale, "imageType") : "Markdown"}
                  {tabs.find(tab => tab.id === entry.key)?.dirty && ` · ${t(locale, "unsaved")}`}
                  {!tabs.some(tab => tab.id === entry.key) && ` · ${t(locale, "historyClosed")}`}</span>
                {index === history.cursor && <span>{t(locale, "currentDocument")}</span>}
              </button></li>)}</ol>
            <button type="button" disabled={historyBusy || !history.entries.length} onClick={clearVisitHistory}>{t(locale, "clearVisitHistory")}</button>
          </WorkspaceDialog>}
          {documentsOpen && <WorkspaceDialog title={t(locale, "openDocuments")} closeLabel={t(locale, "closeSurface")}
            onClose={() => setDocumentsOpen(false)}>
            <ol className="open-document-list">{tabs.map((tab) => <li key={tab.id}>
              <button type="button" aria-current={tab.id === activeId ? "page" : undefined} onClick={() => {
                openSequence.current += 1; setActiveId(tab.id); activeIdRef.current = tab.id; setDocumentsOpen(false);
                requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus());
              }}><strong>{tab.name}</strong><span>{tab.displayPath}</span>
                {tab.id === activeId && <span>{t(locale, "currentDocument")}</span>}
                {documentStatus(tab) && <span>{documentStatus(tab)}</span>}
              </button>
            </li>)}</ol>
          </WorkspaceDialog>}
          {storageOpen && <StorageManagement locale={locale} inventory={safetyCopies} loading={storageLoading}
            busy={busy || cleanupBusy} suspended={clearSessionConfirm || clearRecentsConfirm || clearDraftsConfirm || clearCopiesConfirm}
            exclusions={Boolean(root)} recentsEmpty={recents?.items.length === 0}
            onClose={() => { if (!cleanupBusy) setStorageOpen(false); }} onRetry={() => void refreshSafetyCopies()}
            onSession={() => setClearSessionConfirm(true)} onRecents={() => setClearRecentsConfirm(true)}
            onDrafts={() => setClearDraftsConfirm(true)} onCopies={() => setClearCopiesConfirm(true)} />}
          {discardSectionId && <WorkspaceDialog title={t(locale, "discardSectionQuestion")} closeLabel={t(locale, "cancel")}
            closeDisabled={busy}
            onClose={() => { if (!busy) setDiscardSectionId(null); }}>
            <p>{tabs.find((tab) => tab.id === discardSectionId)?.name} · {edits[discardSectionId]?.section.label}</p>
            <p>{t(locale, "discardSectionDetail")}</p>
            <button type="button" disabled={busy} onClick={async () => {
              setBusy(true);
              try { if (await discardEdit(discardSectionId)) setDiscardSectionId(null); }
              finally { setBusy(false); }
            }}>{t(locale, "discard")}</button>
          </WorkspaceDialog>}
          {active && <DocumentLocation key={active.id} name={active.name} path={active.displayPath} locale={locale}
            folders={documentSegments(active)?.slice(0, -1).join(" / ") ?? null}
            onReveal={documentSegments(active) ? () => void revealDocument(active) : undefined} revealing={revealing}
            onMenuOpen={() => { setProjectsMenu(null); setReloadMenu(null); setGoMenu(null); }}
            menuActions={<>
              {compactSidebar && <>
                <button ref={outlineTriggerRef} type="button" aria-pressed={outlineOpen} disabled={!active.content}
                  aria-description={active.kind === "image" ? t(locale, "outlineMarkdownOnly") : undefined}
                  onClick={toggleOutline}>{t(locale, "outline")}</button>
                <button ref={settingsTriggerRef} type="button" aria-expanded={readingSettingsOpen} aria-controls="reading-settings-panel"
                  onClick={() => setReadingSettingsOpen(open => !open)}>{t(locale, "readingSettings")}</button>
              </>}
              <button type="button" disabled={!navigator.clipboard?.writeText} aria-description={!navigator.clipboard?.writeText ? t(locale, "pathCopyUnavailable") : undefined}
                onClick={() => void copyPath(active.displayPath)}>{t(locale, "copyPath")}</button>
              <button type="button" disabled={busy || (!active.largeInspection && !refreshTarget(active))} onClick={() => {
                if (active.largeInspection) { void reloadLargeTab(active.id); return; }
                const target = refreshTarget(active);
                if (target) void startReload({ target, label: active.name, x: 0, y: 0, anchor: readerRef.current ?? document.body });
              }}>{t(locale, "reload")}</button>
            </>}
            actions={<>
              {!compactSidebar && <>
                <button ref={outlineTriggerRef} type="button" aria-pressed={outlineOpen} disabled={!active.content}
                  aria-description={active.kind === "image" ? t(locale, "outlineMarkdownOnly") : undefined}
                  onClick={toggleOutline}>{t(locale, "outline")}</button>
                <button ref={settingsTriggerRef} type="button" aria-expanded={readingSettingsOpen} aria-controls="reading-settings-panel"
                  onClick={() => setReadingSettingsOpen(open => !open)}>{t(locale, "readingSettings")}</button>
              </>}
              {active.kind !== "image" && !active.largeInspection && !active.errorCode && <>
              {activeEdit && !activeEdit.paused ? <div className="header-edit-actions">
                <button type="button" className="primary-button" disabled={busy || Boolean(activeEdit.conflict)
                  || active.freshness === "conflict" || activeEdit.draft === activeEdit.source}
                  onClick={() => void saveEdit(active.id)}>{t(locale, "saveFile")}</button>
                <button type="button" disabled={busy} onClick={() => activeEdit.draft === activeEdit.source
                  ? void discardEdit(active.id) : setCloseIntent({ kind: "read", tabId: active.id })}>{t(locale, "returnReading")}</button>
                <small>{t(locale, "saveReturnsReading")}</small>
              </div> : <button type="button" disabled={busy || !sectionsByTab[active.id]?.length}
                onClick={() => {
                  const reader = readerRef.current;
                  const top = reader?.getBoundingClientRect().top ?? 0;
                  const region = Array.from(reader?.querySelectorAll<HTMLElement>("[data-section-id]") ?? [])
                    .find((element) => zoomRect(element, documentZoom).bottom > top + 24);
                  const section = sectionsByTab[active.id]?.find((item) => item.id === region?.dataset.sectionId)
                    ?? sectionsByTab[active.id]?.[0];
                  if (section) void beginEdit(section);
                }}>{t(locale, "editSection")}</button>}
            </>} </>} />}
          {findOpen && <div className="find-band" role="search" aria-label={t(locale, "findInDocument")}>
            <input ref={findInputRef} type="search" value={findQuery} autoComplete="off"
              maxLength={4096}
              aria-label={t(locale, "findInDocument")} placeholder={t(locale, "findPlaceholder")}
              onChange={(event) => { setFindQuery(event.target.value); setFindOrdinal(0); }}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); moveFind(event.shiftKey ? -1 : 1); }
                if (event.key === "Escape") { event.preventDefault(); closeFind(); }
              }} />
            <span className="find-count" role="status" aria-live="polite">
              {!findAvailable || findIndexError ? t(locale, "findUnavailable")
                : !findQuery.trim() ? t(locale, "findEntry")
                  : !findResults ? t(locale, "checking")
                    : findResults.count === 0 ? t(locale, "findZero")
                      : t(locale, "findPosition").replace("{current}", String(activeFindOrdinal + 1))
                        .replace("{total}", String(findResults.count))}
            </span>
            <button type="button" aria-label={t(locale, "findPrevious")}
              disabled={!findResults?.count} onClick={() => moveFind(-1)}>↑</button>
            <button type="button" aria-label={t(locale, "findNext")}
              disabled={!findResults?.count} onClick={() => moveFind(1)}>↓</button>
            <button type="button" aria-label={t(locale, "closeFind")} onClick={closeFind}>×</button>
          </div>}
          {tabs.filter((tab) => tab.explicitFile).map((tab) => {
            const target: RefreshTarget = { kind: "explicit-file", fileId: tab.id };
            return <div className="tab-reload-feedback" key={tab.id}>
              {reloadFeedback(target) && <span role="status">{tab.name}: {reloadFeedback(target)}</span>}
              {reloadProgress(target)}
            </div>;
          })}
          {historyBusy && <div className="notice" role="status"><span>{t(locale, "loading")}</span>
            <button type="button" onClick={cancelHistoryTraversal}>{t(locale, "cancel")}</button></div>}
          {goMenu && <ActionMenu {...goMenu} onClose={() => setGoMenu(null)} actions={[
            { label: t(locale, "historyBack"), disabled: historyBusy || !(active ? history.entries[history.cursor - 1] : history.entries[history.cursor]),
              reason: !(active ? history.entries[history.cursor - 1] : history.entries[history.cursor]) ? t(locale, "historyNoPrevious") : undefined,
              run: () => void traverseHistory(active ? history.cursor - 1 : history.cursor) },
            { label: t(locale, "historyForward"), disabled: historyBusy || !active || !history.entries[history.cursor + 1],
              reason: !active || !history.entries[history.cursor + 1] ? t(locale, "historyNoNext") : undefined, run: () => void traverseHistory(history.cursor + 1) },
            { label: t(locale, "visitHistory"), run: () => { setHistoryDirection(null); setHistoryOpen(true); } },
            { label: t(locale, "clearVisitHistory"), disabled: historyBusy || !history.entries.length, run: clearVisitHistory }
          ]} />}
          {projectsMenu && <ActionMenu {...projectsMenu} onClose={() => setProjectsMenu(null)} actions={[
            { label: t(locale, "openFile"), hint: "⌘O", disabled: busy, run: () => void chooseFile() },
            { label: t(locale, "openFolder"), hint: "⇧⌘O", disabled: busy, run: () => void chooseFolder() },
            { label: t(locale, "folderSearch"), hint: "⇧⌘F", disabled: !root,
              run: () => { setSidebarOpen(true); setSidebarPanel("search"); } }
          ]} />}
          {reloadMenu && <ActionMenu anchor={reloadMenu.anchor} x={reloadMenu.x} y={reloadMenu.y}
            onClose={() => setReloadMenu(null)} actions={[
              ...(reloadMenu.target.kind === "folder" && reloadMenu.target.segments.length === 0 ? [
                { label: t(locale, "openFile"), hint: "⌘O", run: () => void chooseFile() },
                { label: t(locale, "openFolder"), hint: "⇧⌘O", run: () => void chooseFolder() },
                { label: t(locale, "folderSearch"), hint: "⇧⌘F", run: () => { setSidebarOpen(true); setSidebarPanel("search"); } }
              ] : []),
              ...(reloadMenu.target.kind === "folder" && reloadMenu.target.segments.length > 0 ? [{ label: t(locale, "folderSearch"), disabled: true,
                reason: t(locale, "searchFolderUnavailable"), run: () => {} }] : []),
              ...(reloadMenu.target.kind === "root-file" ? [{ label: `${t(locale, "openRecent")} ${reloadMenu.label}`,
                disabled: !/\.(md|markdown)$/i.test(reloadMenu.label) && !imageName(reloadMenu.label),
                reason: !/\.(md|markdown)$/i.test(reloadMenu.label) && !imageName(reloadMenu.label) ? t(locale, "unsupported") : undefined,
                run: () => { if (reloadMenu.target.kind !== "root-file") return;
                  void (imageName(reloadMenu.label) ? openImage : openDocument)({ rootId: reloadMenu.target.rootId, segments: reloadMenu.target.segments },
                    { name: reloadMenu.label, path: contextPath ?? reloadMenu.label }); } }] : []),
              ...(contextPath ? [{ label: t(locale, "copyPath"), disabled: !navigator.clipboard?.writeText,
                reason: !navigator.clipboard?.writeText ? t(locale, "pathCopyUnavailable") : undefined, run: () => void copyPath(contextPath) }] : []),
              ...(contextTab ? [{ label: `${t(locale, "closeTab")}: ${contextTab.name}`, hint: contextTab.id === activeId ? "⌘W" : undefined,
                disabled: busy, run: () => void closeTab(contextTab.id) }] : []),
              { label: `${t(locale, "reload")} ${reloadMenu.label}${reloadMenu.target.kind === "folder" ? ` ${t(locale, "folder")}` : ""}`,
                disabled: busy, run: () => void startReload(reloadMenu) }
            ]} />}
          {notice && <div className="notice" role="status">
            <span>{notice}</span>
            <button type="button" aria-label={t(locale, "dismiss")} onClick={() => setNotice(null)}>×</button>
          </div>}
          {pendingSaveAs && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true" aria-label={t(locale, "replaceFile")}>
              <strong>{t(locale, "replaceFile")}</strong>
              <p>{pendingSaveAs.name}</p>
              <div className="section-modal-actions">
                <button type="button" onClick={() => setPendingSaveAs(null)}>{t(locale, "cancel")}</button>
                <button type="button" className="primary-button" disabled={busy}
                  onClick={() => void commitSaveAs(pendingSaveAs.tabId, pendingSaveAs.token, true, pendingSaveAs.name)}>
                  {t(locale, "replace")}
                </button>
              </div>
            </div>
          </div>}
          {pendingSection && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true"
              aria-label={t(locale, "pendingSectionQuestion")}>
              <strong>{t(locale, "pendingSectionQuestion")}</strong>
              <p>{edits[pendingSection.tabId]?.section.label || t(locale, "beforeFirstHeading")}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={busy} onClick={() => void resolvePendingSection("cancel")}>{t(locale, "cancel")}</button>
                <button type="button" disabled={busy} onClick={() => void resolvePendingSection("resume")}>{t(locale, "resume")}</button>
                <button type="button" disabled={busy} onClick={() => void resolvePendingSection("discard")}>{t(locale, "discard")}</button>
                <button type="button" className="primary-button" disabled={busy}
                  onClick={() => void resolvePendingSection("save")}>{t(locale, "save")}</button>
              </div>
            </div>
          </div>}
          {discardConflictConfirm && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true"
              aria-label={t(locale, "discardDraftConfirmation")}>
              <strong>{t(locale, "discardDraftConfirmation")}</strong>
              <div className="section-modal-actions">
                <button type="button" disabled={busy} onClick={() => {
                  discardConflictRef.current = null;
                  setDiscardConflictConfirm(null);
                }}>{t(locale, "cancel")}</button>
                <button type="button" className="primary-button" disabled={busy}
                  onClick={() => void useDiskVersion(discardConflictConfirm)}>{t(locale, "useDiskVersion")}</button>
              </div>
            </div>
          </div>}
          {closeIntent && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true" aria-label={t(locale, "closeEditQuestion")}>
              <strong>{t(locale, "closeEditQuestion")}</strong>
              <p>{t(locale, "closeEditDetail")}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={busy} onClick={() => void resolveClose("cancel")}>{t(locale, "cancel")}</button>
                <button type="button" disabled={busy} onClick={() => void resolveClose("discard")}>{t(locale, "discard")}</button>
                <button type="button" disabled={busy} onClick={() => void resolveClose("save")}>{t(locale, "save")}</button>
                <button type="button" className="primary-button" disabled={busy} onClick={() => void resolveClose("keep")}>{t(locale, "keepDraft")}</button>
              </div>
            </div>
          </div>}
          {restoreOffer && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true"
              aria-label={t(locale, "restoreSessionQuestion")}>
              <strong>{t(locale, "restoreSessionQuestion")}</strong>
              <p>{t(locale, "restoreSessionDetail")}</p>
              <p>{new Date(restoreOffer.completedAtMs).toLocaleString(locale)}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={cleanupBusy} onClick={() => void runCleanup(clearSession)}>{t(locale, "startFresh")}</button>
                <button type="button" className="primary-button" onClick={() => {
                  const saved = restoreOffer;
                  setRestoreOffer(null);
                  applyRestoredSession(saved);
                }}>{t(locale, "restoreSession")}</button>
              </div>
            </div>
          </div>}
          {clearSessionConfirm && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true"
              aria-label={t(locale, "clearSessionQuestion")}>
              <strong>{t(locale, "clearSessionQuestion")}</strong>
              <p>{root?.name ?? t(locale, "workspace")} · {tabs.length} {t(locale, "documents")}</p>
              <p>{t(locale, "sessionScopeDetail")}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={cleanupBusy} onClick={() => setClearSessionConfirm(false)}>{t(locale, "cancel")}</button>
                <button type="button" className="primary-button" disabled={cleanupBusy} onClick={() => void runCleanup(clearSession)}>{t(locale, "clearSession")}</button>
              </div>
            </div>
          </div>}
          {clearRecentsConfirm && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true"
              aria-label={t(locale, "clearRecentsQuestion")}>
              <strong>{t(locale, "clearRecentsQuestion")}</strong>
              <p>{t(locale, "clearRecentsDetail")}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={cleanupBusy} onClick={() => setClearRecentsConfirm(false)}>{t(locale, "cancel")}</button>
                <button type="button" disabled={cleanupBusy} onClick={() => void runCleanup(clearRecents)}>{t(locale, "clearRecents")}</button>
              </div>
            </div>
          </div>}
          {clearDraftsConfirm && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true"
              aria-label={t(locale, "clearDraftsQuestion")}>
              <strong>{t(locale, "clearDraftsQuestion")}</strong>
              <p>{t(locale, "clearDraftsDetail")}</p>
              <p>{t(locale, "safetyCopyStorage")}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={cleanupBusy} onClick={() => setClearDraftsConfirm(false)}>{t(locale, "cancel")}</button>
                <button type="button" disabled={cleanupBusy} onClick={() => void runCleanup(clearSavedDrafts)}>{t(locale, "clearDrafts")}</button>
              </div>
            </div>
          </div>}
          {clearCopiesConfirm && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true"
              aria-label={t(locale, "clearSafetyCopiesQuestion")}>
              <strong>{t(locale, "clearSafetyCopiesQuestion")}</strong>
              <p>{t(locale, "clearSafetyCopiesDetail")}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={cleanupBusy} onClick={() => setClearCopiesConfirm(false)}>{t(locale, "cancel")}</button>
                <button type="button" disabled={cleanupBusy} onClick={() => void runCleanup(clearResolvedCopies)}>{t(locale, "clearSafetyCopies")}</button>
              </div>
            </div>
          </div>}
          {activeId && pendingRecoveries[activeId] && <div className="notice recovery-notice" role="status">
            <span>{t(locale, "recoverEdit")}{pendingRecoveries[activeId].conflict
              ? " · " + t(locale, "draftConflict") : ""}
              {" · " + t(locale, "lastCheckpoint") + ": "
                + (pendingRecoveries[activeId].savedAtMs
                  ? new Date(pendingRecoveries[activeId].savedAtMs!).toLocaleString(locale)
                  : t(locale, "timeUnknown"))}</span>
            <button type="button" onClick={() => recoverEdit(activeId)}>{t(locale, "recoverEdit")}</button>
            <button type="button" onClick={() => setDiscardSectionId(activeId)}>{t(locale, "discardChanges")}</button>
          </div>}
          <div className={`reading-area reading-font-${readingSettings.readingFont}`}
            style={{ "--reading-width": `${readingSettings.readingWidth}px`,
              "--reading-size": `${readingSettings.readingSize}px`,
              "--reading-line-height": String(readingSettings.readingLineHeight) } as CSSProperties}>
          <div className="reader-scroll" ref={readerRef}
            onScroll={(event) => {
              if (!activeId) return;
              captureReadingPosition(activeId, event.currentTarget);
              scheduleSessionCheckpoint();
              if (findOpen) setFindScrollVersion((version) => version + 1);
              const edit = editsRef.current[activeId];
              if (!edit || edit.paused || !edit.initialEditorJson) return;
              setEdits((old) => editReducer(old, { type: "draft", tabId: activeId,
                sessionId: edit.sessionId, draft: edit.draft }));
              if (readerCheckpointTimer.current) clearTimeout(readerCheckpointTimer.current);
              readerCheckpointTimer.current = setTimeout(() => {
                const latest = editsRef.current[activeId];
                if (latest?.initialEditorJson) checkpointEdit(activeId, latest, latest.draft,
                  latest.initialEditorJson, latest.editorScrollTop ?? 0, latest.editorScrollLeft ?? 0);
              }, 120);
            }}>
            {!active ? (
              <div className="welcome">
                <div className="welcome-mark" aria-hidden="true">M</div>
                <h1>{t(locale, "welcomeTitle")}</h1>
                <p>{root ? t(locale, "noDocument") : t(locale, "welcomeBody")}</p>
                {priorRoot && <div className="notice" role="status">
                  <span>{errorText(locale, rootProblem ?? "root_reselection_required")}</span>
                  <button type="button" disabled={busy} onClick={() => void recoverMissingRoot()}>
                    {t(locale, "selectFolderAgain")}
                  </button>
                </div>}
                <div className="welcome-actions">
                  <button className="primary-button" type="button" onClick={() => void chooseFolder()}>{t(locale, "openFolder")}</button>
                  <button type="button" onClick={() => void chooseFile()}>{t(locale, "openFile")}</button>
                </div>
                {!root && !priorRoot && tabs.length === 0 && recents && <section className="recents" aria-label={t(locale, "recents")}>
                  <h2>{t(locale, "recents")}</h2>
                  {(recentIssue || recents.recoveredCorrupt) && <p role="status">{t(locale, "recentsRecovered")}</p>}
                  {recents.items.length === 0 ? <p>{t(locale, "recentsEmpty")}</p> : <>
                    {(["folder", "document"] as const).map((kind) => {
                      const entries = recents.items.filter((entry) => entry.kind === kind);
                      return entries.length > 0 && <div className="recent-group" key={kind}>
                        <h3>{t(locale, kind === "folder" ? "recentFolders" : "recentDocuments")}</h3>
                        <ul>{entries.map((entry) => <li key={entry.id} className="recent-row">
                          <div><strong>{entry.name}</strong><small title={entry.displayPath}>{entry.parent}</small>
                            {entry.status !== "available" && <span className="recent-status">{t(locale,
                              entry.status === "missing" ? "recentMissing" : entry.status === "replaced"
                                ? "recentReplaced" : entry.status === "denied" ? "recentDenied" : "recentUnavailable")}</span>}</div>
                          <button type="button" disabled={busy} onClick={() => void useRecent(entry)}
                            aria-label={`${t(locale, entry.status === "available" ? "openRecent" : "reselectRecent")}: ${entry.name}`}>
                            {t(locale, entry.status === "available" ? "openRecent" : "reselectRecent")}
                          </button>
                          <button type="button" disabled={busy} onClick={() => void removeRecent(entry.id)}
                            aria-label={`${t(locale, "removeRecent")}: ${entry.name}`}>{t(locale, "removeRecent")}</button>
                        </li>)}</ul>
                      </div>;
                    })}
                    <button type="button" className="draft-clear-button" onClick={() => setClearRecentsConfirm(true)}>{t(locale, "clearRecents")}</button>
                  </>}
                </section>}
              </div>
            ) : active.largeInspection ? (
              <div className="large-source-page" role="tabpanel" aria-label={active.name}>
                {active.largeOpened ? <LargeSourceView key={active.id} opened={active.largeOpened} locale={locale}
                  zoom={documentZoom} onZoom={value => { documentZooms.current.set(active.id, value); setZoomRevision(revision => revision + 1); }}
                  onReload={() => void reloadLargeTab(active.id)} /> : <div className="error-state">
                  <h1>{active.errorCode ? errorText(locale, active.errorCode)
                    : active.largeInspection.overLimit ? t(locale, "largeSourceLimit")
                      : t(locale, "largeSourceChoice")}</h1>
                  <p>{copySize(active.largeInspection.sizeBytes, locale)}</p>
                  {busy && <p role="status">{t(locale, "largeSourceLoading")}{largeProgress?.fileId === active.id
                    && largeProgress.totalBytes > 0
                    ? ` ${Math.round(100 * largeProgress.completedBytes / largeProgress.totalBytes)}%` : ""}</p>}
                  {!active.largeInspection.overLimit && <button type="button" className="primary-button"
                    disabled={busy} onClick={() => void openLargeTab(active.id)}>{t(locale,
                      active.errorCode ? "largeSourceReload" : "largeSourceOpen")}</button>}
                  <button type="button" onClick={() => void closeTab(active.id)}>{t(locale, "cancel")}</button>
                </div>}
              </div>
            ) : active.errorCode ? (
              <div className="error-state" role="alert">
                <div className="error-symbol" aria-hidden="true">!</div>
                <h1>{errorText(locale, active.errorCode)}</h1>
                <p>{t(locale, "retryHint")}</p>
                {active.errorCode === "reselection_required" && active.explicitFile
                  ? <button type="button" disabled={busy} onClick={() => void (active.request.fileId
                    ? reselectFile(active.id) : recoverMissingFile(active))}>{t(locale, "selectFileAgain")}</button>
                  : active.errorCode === "root_reselection_required"
                    ? <button type="button" disabled={busy} onClick={() => void (root
                      ? reselectFolder() : recoverMissingRoot())}>{t(locale, "selectFolderAgain")}</button>
                    : <button type="button" onClick={() => void (active.kind === "image" ? openImage : openDocument)(active.request, { name: active.name, path: active.displayPath })}>
                      {t(locale, "retry")}
                    </button>}
              </div>
            ) : active.kind === "image" ? (
              active.image ? <ImageView key={active.id} image={active.image} locale={locale} hideIdentity
                initialView={imageViews.current.get(active.id)} onViewChange={(view) => {
                  imageViews.current.set(active.id, view);
                  const visit = historyRef.current.entries[historyRef.current.cursor];
                  if (visit?.key === active.id) visit.target.imageView = { ...view };
                }} />
                : active.imageLoading || (active.freshness !== "unavailable" && active.freshness !== "uncertain")
                  ? <div className="error-state" role="status">{t(locale, "imageLoading")}</div>
                  : <div className="error-state" role="alert">
                    <h1>{active.freshnessReason ? errorText(locale, active.freshnessReason)
                      : t(locale, "imageUnavailable")}</h1>
                    <button type="button" onClick={() => void refreshRetainedTab(active.id)}>{t(locale, "retry")}</button>
                  </div>
            ) : (
              <div className="document-page" role="tabpanel" aria-label={active.name}
                style={{ zoom: documentZoom } as CSSProperties} data-document-zoom={documentZoom}>
                {(active.freshness === "unavailable" || active.freshness === "uncertain") && <div className="notice" role="status">
                  <span>{active.freshnessReason ? errorText(locale, active.freshnessReason) : t(locale, "unableConfirm")}</span>
                  {active.freshnessReason === "reselection_required" && active.explicitFile
                    ? <button type="button" disabled={busy} onClick={() => void reselectFile(active.id)}>{t(locale, "selectFileAgain")}</button>
                    : active.freshnessReason === "root_reselection_required"
                      ? <button type="button" disabled={busy} onClick={() => void reselectFolder()}>{t(locale, "selectFolderAgain")}</button>
                      : <button type="button" disabled={busy} onClick={() => void refreshRetainedTab(active.id)}>{t(locale, "retry")}</button>}
                </div>}
                {activeEdit && active.freshness === "conflict" && <div className="edit-conflict" role="alert">
                  <strong>{t(locale, "conflictNotice")}</strong>
                  <p>{t(locale, "saveRaceDisclosure")}</p>
                  <div className="section-modal-actions">
                    <button type="button" onClick={() => void inspectConflict(active.id)}>{t(locale, "inspectVersions")}</button>
                    <button type="button" onClick={() => {
                      inspectionSequence.current += 1;
                      inspectedDiskRef.current = null;
                      setInspectedDisk(null);
                      document.querySelector<HTMLElement>(".cm-content")?.focus();
                    }}>{t(locale, "keepMyEdit")}</button>
                    <button type="button" onClick={() => void saveEditAs(active.id)}>{t(locale, "saveACopy")}</button>
                    <button type="button" onClick={() => void requestDiskVersion(active.id)}>{t(locale, "useDiskVersion")}</button>
                  </div>
                  {inspectedDisk?.tabId === active.id && <div className="conflict-versions">
                    <div><strong>{t(locale, "yourUnsavedEdit")}</strong>
                      <pre>{activeEdit.draft}</pre></div>
                    <div><strong>{t(locale, "currentDiskVersion")}</strong>
                      <pre>{inspectedDisk.document.content}</pre></div>
                  </div>}
                </div>}
                {activeEdit && !activeEdit.paused && <SectionEditor
                  key={activeEdit.sessionId}
                  conflict={Boolean(activeEdit.conflict) || active.freshness === "conflict"}
                  sessionId={activeEdit.sessionId}
                  fileId={active.id}
                  label={activeEdit.section.label || t(locale,
                    activeEdit.section.kind === "whole" ? "wholeDocument" : "beforeFirstHeading")}
                  initialSource={activeEdit.source}
                  initialDraft={activeEdit.draft}
                  initialEditorJson={activeEdit.initialEditorJson}
                  initialScrollTop={activeEdit.editorScrollTop}
                  initialScrollLeft={activeEdit.editorScrollLeft}
                  lineSeparator={activeEdit.lineSeparator}
                  locale={locale}
                  busy={busy}
                  saving={savingTabId === active.id}
                  headerActions
                  checkpointStatus={activeEdit.checkpointStatus}
                  findIndex={findOpen && findInDraft ? findIndex : null}
                  findResults={findOpen && findInDraft ? findResults : null}
                  findOrdinal={activeFindOrdinal}
                  onFindReady={(adapter) => { editorFindRef.current = adapter; }}
                  onChange={(draft) => {
                    setEdits((old) => editReducer(old, { type: "draft", tabId: active.id,
                      sessionId: activeEdit.sessionId, draft }));
                    setTabs((old) => old.map((tab) => tab.id === active.id
                      ? { ...tab, dirty: draft !== activeEdit.source } : tab));
                  }}
                  onCheckpoint={(draft, editorJson, scrollTop, scrollLeft) =>
                    checkpointEdit(active.id, activeEdit, draft, editorJson, scrollTop, scrollLeft)}
                  onSave={() => void saveEdit(active.id)}
                  onSaveAs={() => void saveEditAs(active.id)}
                  onDiscard={() => setDiscardSectionId(active.id)}
                  onReturn={() => activeEdit.draft === activeEdit.source
                    ? void discardEdit(active.id)
                    : setCloseIntent({ kind: "read", tabId: active.id })}
                />}
                <MarkdownView content={active.content ?? ""} fileId={active.id} locale={locale}
                  findRootRef={findRootRef}
                  onRendered={(id, content) => setRenderedMarkdown({ id, content })}
                  onHeadings={(entries) => updateHeadings(active.id, entries)}
                  sections={sectionsByTab[active.id]}
                  activeSectionId={!activeEdit?.paused ? activeEdit?.section.id : undefined}
                  onEditSection={(section) => void beginEdit(section)}
                  onNavigate={(target) => void navigate(target)} />
              </div>
            )}
          </div>
          {active?.content && <aside ref={outlineElementRef} className="outline-panel"
            data-open={outlineOpen} aria-hidden={!outlineOpen} inert={!outlineOpen}
            aria-label={t(locale, "outline")}>
            <div className="outline-heading">
              <strong>{t(locale, "outline")}</strong>
              <button type="button" aria-label={t(locale, "closeOutline")}
                onClick={() => { if (activeId && readerRef.current) captureReadingPosition(activeId, readerRef.current);
                  setOutlineOpen(false); focusActionTrigger(outlineTriggerRef.current); }}>×</button>
            </div>
            {(headingsByTab[active.id] ?? []).length === 0
              ? <p role="status">{t(locale, "outlineEmpty")}</p>
              : <nav aria-label={t(locale, "outline")}><ol>
                {headingsByTab[active.id].map((entry) => <li key={`${entry.id}:${entry.offset}`}>
                  <button type="button" className={`outline-item outline-level-${entry.level}`}
                    aria-current={activeOutlineId === entry.id ? "location" : undefined}
                    title={entry.label || entry.id}
                    onClick={() => { noteLocationVisit(entry.id); scrollToAnchor(entry.id); }}>{entry.label || entry.id}</button>
                </li>)}
              </ol></nav>}
          </aside>}
          </div>
          {findOpen && findOverlays.map((overlay, index) => <span key={index}
            className={`find-overlay ${overlay.active ? "active" : ""}`} aria-hidden="true"
            style={{ left: overlay.left, top: overlay.top,
              width: overlay.width, height: overlay.height }} />)}
        </main>
      </div>
    </div>
  );
}
