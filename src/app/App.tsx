import MiddleFilename from "./MiddleFilename";
import WorkspaceIcon from "./WorkspaceIcon";
import PreviewLoading from "../reader/PreviewLoading";
import theoniraLight from "../assets/theonira/theonira-mark-light.png";
import theoniraDark from "../assets/theonira/theonira-mark-dark.png";
import { workspaceLayout as resolveWorkspaceLayout, type WorkspaceLayout } from "./workspaceLayout";
import { commandPressed, shortcutHint, editingAvailable, isWindows, fileRevealAvailable, localAbsolutePath } from "./platform";
import { isTauri } from "@tauri-apps/api/core";
import { getAppearance } from "./appearance";
import { settingsApi, type SettingsGroup } from "./settings-contract";
import { useSettingsOwner } from "./useSettingsOwner";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { listen } from "@tauri-apps/api/event";
import { api, readerError, type DirectoryEntry, type DocumentResponse, type CreateMarkdownOutcome, type FolderSearchHit, type GrantInfo, type ImageResponse, type LargeInspection, type LargeOpened, type NativePreview, type OpenFolderSearchHit, type RecentItem, type RecentList, type RefreshDirectoryChanged, type RefreshFileChanged, type RefreshItemStatus, type RefreshJobProgress, type RefreshTarget, type RevealTarget, type SectionDescriptor, type RecoveryResponse, type SaveEditResponse, type SafetyCopyInventory, type SessionCheckpointInput, type SessionPanel, type SessionRestore } from "./api";
import { errorText, sessionErrorText, t, type Locale } from "./i18n";
import { useAppearance, type AppearanceMode } from "./appearance";
import { useRetainedOverlay } from "./useRetainedOverlay";
import MarkdownView, { exceedsRenderBudget, headingSlug } from "../reader/MarkdownView";
import { ownsTextInput, watchSelectionOwner, type DocumentSelectionAdapter } from "../reader/document-selection";
import ImageView, { type ImageViewState } from "../reader/ImageView";
import { boundZoom, usePinchZoom, zoomRect, normalizeZoomRect } from "../reader/usePinchZoom";
import { emptyHistory, recordVisit, updateVisit, type VisitHistory } from "../workspace/visitHistory";
import SectionEditor, { type DraftFindAdapter, type EditorCommandState, type RichCommand } from "../reader/SectionEditor";
import LargeSourceView from "../reader/LargeSourceView";
import FolderSearchPanel from "./FolderSearchPanel";
import WorkspaceDialog from "./WorkspaceDialog";
import NewMarkdownDialog from "./NewMarkdownDialog";
import StorageManagement from "./StorageManagement";
import DocumentLocation from "./DocumentLocation";
import ActionMenu from "./ActionMenu";
import ReloadFeedback from "./ReloadFeedback";
import ReadingSettings from "./ReadingSettings";
import { tabFilename, distinguishingParent, workspaceSegments } from "./documentIdentity";
import { editReducer, type SectionEdit } from "../workspace/editState";
import { confirmCleanDocument, confirmDirectoryPage, noteDirectoryChange, noteFileChange, type Freshness } from "../workspace/refreshState";
import { defaultSessionPanel, makeSessionCheckpoint, sessionAnchor } from "./session";
import { FindIndex, findLiteral } from "../reader/find-index";
import type { HeadingEntry } from "../reader/heading-model";
import HtmlView, { type HtmlHandle } from "../reader/HtmlView";
import { htmlNative, type LocalView, type LocalTarget, type HtmlState, type HtmlLocation, type HtmlLink } from "./htmlNative";
import { validHtmlView, validLocalView } from "./htmlController";
import { isHtmlDocument, isHtmlLink, requireMarkdownResponse } from "./htmlBoundary";

import PrototypeView from "../reader/PrototypeView";
import {isPrototypeDocument,isNativeDocument,validPrototypeView} from "./documentBoundary";
import {PrototypeController} from "./prototypeController";
import {prototypeNative} from "./prototypeNative";
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
  kind?: "markdown" | "image" | "html" | "prototype" | "details";
  localView?: LocalView;
  htmlState?: HtmlState;
  prototypeReloadFailed?: boolean;
  image?: ImageResponse;
  imageLoading?: boolean;
  documentLoading?: boolean;
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
type VisitTarget = Pick<Tab, "id" | "request" | "name" | "displayPath" | "kind" | "explicitFile"> & { imageView?: ImageViewState; zoom?: number; htmlLocation?: HtmlLocation };

type ReloadMenu = { revealTarget?: RevealTarget; target: RefreshTarget; label: string; x: number; y: number; anchor: HTMLElement };
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
  const [localePersistenceWarning, setLocalePersistenceWarning] = useState(false);
  const remoteLocale = useRef<Locale | null>(null);
  const [sessionRetrying, setSessionRetrying] = useState(false);
  const [newMarkdownOpen, setNewMarkdownOpen] = useState(false);
  const newMarkdownOwner = useRef(false);
  const [createdEdit, setCreatedEdit] = useState<{ id: string; watchFailed: boolean } | null>(null);
  const createdNavigation = useRef(false);
  const newMarkdownInvoker = useRef<HTMLElement | null>(null);
  const [root, setRoot] = useState<GrantInfo | null>(null);
  const [rootProblem, setRootProblem] = useState<string | null>(null);
  const [directories, setDirectories] = useState<Record<string, DirectoryState>>({});
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [sectionsByTab, setSectionsByTab] = useState<Record<string, SectionDescriptor[]>>({});
  const [sectionLayoutVersions, setSectionLayoutVersions] = useState<Record<string, string>>({});
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
  const [closeIntent, setCloseIntent] = useState<{ kind: "app" | "window" | "folder" | "tab" | "read"; tabId?: string; tabIds?: string[] } | null>(null);
  const [pendingFolder, setPendingFolder] = useState<string | null>(null);
  const [pendingNativeEntry, setPendingNativeEntry] = useState<string | null>(null);
  const [nativeEntries, setNativeEntries] = useState<NativePreview[]>([]);
  const nativeListSequence = useRef(0);
  const nativeOpening = useRef(false);
  const nativeAttempts = useRef(new Set<string>());
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
  const [recentsLoading, setRecentsLoading] = useState(false);
  const recentSequence = useRef(0);
  const [openingRecent, setOpeningRecent] = useState<string | null>(null);
  const [selectionPending, setSelectionPending] = useState<"folder" | "file" | null>(null);
  const [documentPending, setDocumentPending] = useState<{ token: symbol; name: string; sequence: number; generation: number } | null>(null);
  const [copySaving, setCopySaving] = useState<string | null>(null);
  const copySavingRef = useRef(false);
  const [enteringSection, setEnteringSection] = useState<{ tabId: string; sectionId: string } | null>(null);
  const enteringSectionRef = useRef<symbol | null>(null);
  useEffect(() => () => { enteringSectionRef.current = null; recentSequence.current += 1; }, []);
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
  const [restoreLoadRevision, setRestoreLoadRevision] = useState(0);
  const imageLoads = useRef(new Map<string, symbol>());
  const documentLoads = useRef(new Map<string, symbol>());
  const prototypeControllers = useRef(new Map<string,PrototypeController>());
  const retainedPrototypes = useRef(new Set<string>());
  async function disposeLocalView(view:LocalView) {
    if(!view.viewToken)return;
    if(view.kind==='prototype') {
      // Duplicate/stale replies may refer to an already accepted owner.
      if(!retainedPrototypes.current.has(view.viewToken)) await prototypeNative.dispose({viewToken:view.viewToken,generation:view.generation},true);
    } else await htmlNative.dispose({viewToken:view.viewToken,generation:view.generation});
  }
  async function reloadPrototype(tabId:string) {
    const tab=tabsRef.current.find(t=>t.id===tabId);
    if(!tab?.localView || !validPrototypeView(tab.localView))return;
    const token=tab.localView.viewToken;
    let controller=prototypeControllers.current.get(token);
    if(!controller){controller=new PrototypeController(tab.localView);prototypeControllers.current.set(token,controller);}
    try {
      const result=await controller.reload();
      setTabs(old=>old.map(t=>t.localView?.viewToken===token ? {...t,localView:result.view,diskVersion:result.view.diskVersion,
        prototypeReloadFailed:Boolean(result.reloadError),freshness:result.changed?'changed':'current',errorCode:undefined} : t));
      if(result.reloadError)setNotice(l=>errorText(l,result.reloadError!.code));
    } catch(error) {
      const detail=readerError(error);
      if(['missing','denied','invalid_grant','reselection_required','root_reselection_required','stale_view'].includes(detail.code)) {
        setTabs(old=>old.map(t=>t.localView?.viewToken===token ? {...t,localView:undefined,errorCode:detail.code} : t));
      } else {
        setTabs(old=>old.map(t=>t.localView?.viewToken===token ? {...t,prototypeReloadFailed:true,freshness:'changed'} : t));
      }
      setNotice(l=>errorText(l,detail.code));
    }
  }
  useEffect(()=>()=>{for(const c of prototypeControllers.current.values())void c.dispose().catch(()=>{});},[]);
  useEffect(()=>{
    const live=new Set(tabs.filter(t=>t.kind==='prototype').map(t=>t.localView?.viewToken));
    for(const [token,c] of prototypeControllers.current)if(!live.has(token)) {
      retainedPrototypes.current.delete(token);prototypeControllers.current.delete(token);void c.dispose().catch(()=>{});
    }
  },[tabs]);
  const htmlHandles = useRef(new Map<string, HtmlHandle>());
  const htmlLocations = useRef(new Map<string, HtmlLocation>());
  const htmlFallbackHeadings = useRef(new Map<string, string[]>());
  const htmlOpens = useRef(new Map<string, string>());
  const htmlReadyWaiters = useRef(new Map<string, {resolve:()=>void;reject:(error:unknown)=>void}>());
  async function waitForHtmlReady(id: string) {
    const tab=tabsRef.current.find(t=>t.id===id);
    if(tab?.htmlState && ['ready','empty'].includes(tab.htmlState.state)) return;
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>{htmlReadyWaiters.current.delete(id);reject({code:'html_render_failed',message:'Readiness timed out'});},7000);
      htmlReadyWaiters.current.set(id,{resolve:()=>{clearTimeout(timer);htmlReadyWaiters.current.delete(id);resolve();},reject:error=>{clearTimeout(timer);htmlReadyWaiters.current.delete(id);reject(error);}});
    });
  }
  const [htmlFind, setHtmlFind] = useState<{count:number;current:number} | null>(null);
  const [htmlShellOverlay, setHtmlShellOverlay] = useState(false);
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
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [compactOutlineOpen, setCompactOutlineOpen] = useState(false);
  const [layout, setLayout] = useState<WorkspaceLayout>("margin");
  const layoutRef = useRef<WorkspaceLayout>("margin");
  const layoutContractAvailable = useRef(false);
  function applyWorkspaceLayout(value: unknown) {
    const next = resolveWorkspaceLayout(value);
    if (next === layoutRef.current) return;
    if (activeIdRef.current && readerRef.current) captureReadingPosition(activeIdRef.current, readerRef.current);
    layoutRef.current = next;
    setLayout(next);
    setCompactSidebarOpen(sidebarPanel === "search");
    setCompactOutlineOpen(false);
    setOutlineOpen(true);
  }
  const [readingSettingsOpen, setReadingSettingsOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarInvoker = useRef<HTMLElement | null>(null);
  const railProjectsRef = useRef<HTMLButtonElement>(null);
  const narrowSidebarWasVisible = useRef(false);
  const [imageControlsHost, setImageControlsHost] = useState<HTMLDivElement | null>(null);
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
  const paintedMarkdown = useRef<{ id: string; content: string } | null>(null);
  const initialReadingIntent = useRef<{ id: string; content: string; sequence: number; generation: number; top: number } | null>(null);
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const [folderSearchScope, setFolderSearchScope] = useState<string[]>([]);
  const [sidebarPanel, setSidebarPanel] = useState<"explorer" | "search">("explorer");
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [compactSidebarOpen, setCompactSidebarOpen] = useState(false);
  const narrowWorkspace = viewportWidth < sidebarWidth + 480;
  const compactSidebar = layout === "folio" || narrowWorkspace;
  const outlineVisible = narrowWorkspace ? compactOutlineOpen : outlineOpen;
  const sidebarVisible = compactSidebar ? compactSidebarOpen : sidebarOpen;
  const sidebarWidthRef = useRef(264);
  const pendingTreeScroll = useRef<number | null>(null);
  const [markdownOnly, setMarkdownOnly] = useState(true);
  const markdownOnlyRef = useRef(true);
  const settingsInvoker = useRef<HTMLElement | null>(null);
  async function hideHtml() {
    await Promise.all([...htmlHandles.current.values()].map(handle=>handle.hide().catch(()=>{})));
  }
  function showHtmlOverlay(action:()=>void) {
    if(!htmlHandles.current.size) {action();return;}
    void hideHtml().then(action);
  }
  async function openSettings(group: SettingsGroup) {
    if(htmlHandles.current.size) await hideHtml();
    if (!isTauri()) { setReadingSettingsOpen(open => !open); return; }
    settingsInvoker.current = document.activeElement instanceof HTMLElement ? document.activeElement : settingsTriggerRef.current;
    void settingsApi.show(group).catch(error => setNotice(locale => errorText(locale, readerError(error).code)));
  }
  // Evaluate notice recipes in the current locale, including asynchronous errors.
  const [noticeRecipe, setNoticeRecipe] = useState<((locale: Locale) => string) | null>(null);
  function setNotice(recipe: ((locale: Locale) => string) | null) {
    setNoticeRecipe(() => recipe);
  }
  const notice = noticeRecipe?.(locale);
  const [sessionNotice, setSessionNotice] = useState<{
    operation: "load" | "checkpoint" | "close"; code: string; diagnostic?: string
  } | null>(null);
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
  const [editorMenu, setEditorMenu] = useState<EditorCommandState>({ owner: false, undo: false, redo: false, selection: false });
  const editorFindRef = useRef<DraftFindAdapter | null>(null);
  const documentSelectionRef = useRef<DocumentSelectionAdapter | null>(null);
  const [, wakeDocumentSelection] = useState(0);
  const selectionAcquisition = useRef<{ token: symbol; sequence: number; generation: number; fileId?: string } | null>(null);
  const pendingDocumentSelection = useRef<{
    sequence: number; generation: number; loadToken?: symbol; fileId?: string; content?: string; dispatched?: boolean
  } | null>(null);
  const selectionReady = useCallback((adapter: DocumentSelectionAdapter | null) => {
    documentSelectionRef.current = adapter;
    // Ref publication may be the last event after acquisition/activation. Wake
    // a queued intent even when no section or paint state will render again.
    if (adapter) wakeDocumentSelection(revision => revision + 1);
  }, []);
  const findFocusBefore = useRef<HTMLElement | null>(null);
  const pendingSearchReveal = useRef(false);
  const menuActionRef = useRef<(id: string) => void>(() => {});
  const findRootRef = useCallback((node: HTMLElement | null) => setFindRoot(node), []);
  const [reloadMenu, setReloadMenu] = useState<ReloadMenu | null>(null);
  const [reloadJobs, setReloadJobs] = useState<Record<string, ReloadJobView>>({});
  const [reloadResults, setReloadResults] = useState<Record<string, { state: RefreshItemStatus["state"]; reasonCode?: string }>>({});
  const [manualReload, setManualReload] = useState<{ target: RefreshTarget; label: string; result: { state: RefreshItemStatus["state"]; reasonCode?: string } } | null>(null);
  const pendingManualReloads = useRef(new Set<string>());
  const manualJobTargets = useRef(new Map<string, string>());
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
  function persistLocale(next: Locale) {
    try { localStorage.setItem("md-reader-locale", next); setLocalePersistenceWarning(false); }
    catch { setLocalePersistenceWarning(true); }
  }
  useEffect(() => {
    if (remoteLocale.current === locale) remoteLocale.current = null;
    else persistLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  async function refreshRecents() {
    if (typeof api.listRecentItems !== "function") return;
    const sequence = ++recentSequence.current;
    setRecentsLoading(true);
    try { const result = await api.listRecentItems();
      if (sequence === recentSequence.current) { setRecents(result); setRecentIssue(false); }
    } catch { if (sequence === recentSequence.current) setRecentIssue(true); }
    finally { if (sequence === recentSequence.current) setRecentsLoading(false); }
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
    const sequence = ++nativeListSequence.current;
    try {
      const entries = await api.listNativeEntries();
      if (sequence === nativeListSequence.current) {
        const pendingIds = new Set(entries.map(entry => entry.id));
        nativeAttempts.current.forEach(id => { if (!pendingIds.has(id)) nativeAttempts.current.delete(id); });
        setNativeEntries(entries);
      }
    } catch (error) {
      if (sequence === nativeListSequence.current)
        setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
    }
  }
  useEffect(() => {
    void refreshNativeEntries();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    try {
      void listen("native:entry_pending", () => { void refreshNativeEntries(); })
        .then((stop) => {
          if (disposed) stop();
          else { unlisten = stop; void refreshNativeEntries(); }
        }).catch(() => {});
    } catch { /* Browser-only preview has no Tauri event host. */ }
    return () => { disposed = true; nativeListSequence.current += 1; unlisten?.(); };
  }, []);

  useEffect(() => {
    const restoredActive = tabs.find(tab => tab.id === activeId && tab.restoredKey);
    const restoringActive = restoredActive && restoredActive.content === undefined
      && !restoredActive.image && !restoredActive.localView && !restoredActive.largeInspection
      && !restoredActive.errorCode;
    // Restore first; incoming files must not replace the saved workspace or
    // interrupt a save, section edit startup, selection, or destructive dialog.
    if (newMarkdownOpen || !sessionReady || restoreOffer || restoringActive || restoreLoads.current.size
      || busy || nativeOpening.current || closeInProgress.current
      || selectionPending || documentPending || enteringSection || copySaving || savingTabId
      || cleanupBusy || historyBusy || openingRecent || closeIntent || pendingSaveAs
      || pendingSection || discardConflictConfirm || discardSectionId || clearDraftsConfirm
      || clearCopiesConfirm || clearSessionConfirm || clearRecentsConfirm) return;
    const entry = nativeEntries.find(item => item.kind === "document" && !item.errorCode
      && !nativeAttempts.current.has(item.id));
    if (!entry) return;
    // Native acceptance consumes the ID. A stale snapshot or a failure must
    // never repeat the grant/read or loop through the same request.
    nativeAttempts.current.add(entry.id);
    void acceptNativeEntry(entry.id);
  }, [newMarkdownOpen, nativeEntries, sessionReady, restoreOffer, tabs, activeId, restoreLoadRevision, busy, selectionPending, documentPending,
    enteringSection, copySaving, savingTabId, cleanupBusy, historyBusy, openingRecent,
    closeIntent, pendingSaveAs, pendingSection, discardConflictConfirm, discardSectionId,
    clearDraftsConfirm, clearCopiesConfirm, clearSessionConfirm, clearRecentsConfirm]);

  async function dismissNativeEntry(id: string) {
    try { await api.dismissNativeEntry(id); await refreshNativeEntries(); }
    catch (error) { setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code)); }
  }

  async function acceptNativeEntry(id: string) {
    const entry = nativeEntries.find((item) => item.id === id);
    if (!entry || busy || nativeOpening.current) return;
    if (entry.errorCode || entry.kind === "unsupported") {
      setNotice(noticeLocale => errorText(noticeLocale, entry.errorCode ?? "unsupported_type"));
      await dismissNativeEntry(id);
      return;
    }
    if (entry.kind === "folder" && (Object.keys(editsRef.current).length
      || Object.keys(pendingRecoveriesRef.current).length)) {
      setPendingNativeEntry(id);
      setCloseIntent({ kind: "folder" });
      return;
    }
    nativeOpening.current = true;
    setBusy(true);
    try {
      const accepted = await api.acceptNativeEntry(id, entry.kind === "document");
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
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
      await refreshNativeEntries();
    } finally { nativeOpening.current = false; setBusy(false); }
  }

  async function useRecent(entry: RecentItem) {
    if (busy) return;
    setBusy(true); setOpeningRecent(entry.id);
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
      setNotice(noticeLocale => code === "reselect_required" ? t(noticeLocale, "recentUnavailable") : errorText(noticeLocale, code));
      await refreshRecents();
    } finally { setBusy(false); setOpeningRecent(null); }
  }

  async function removeRecent(id: string) {
    try { await api.removeRecentItem(id); await refreshRecents(); }
    catch (error) { setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code)); }
  }

  async function clearRecents() {
    try { await api.clearRecentItems(true); setClearRecentsConfirm(false); await refreshRecents(); }
    catch (error) { setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code)); }
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
        anchor: { ...sessionAnchor(tab.kind === "prototype" ? undefined : readingAnchors.current.get(tab.id),
          { width: reader?.clientWidth ?? 0, height: reader?.clientHeight ?? 0 }, tab.diskVersion ?? null),
          ...(tab.kind === "html" && htmlLocations.current.get(tab.id) ? {
            htmlZoom: htmlLocations.current.get(tab.id)!.zoom, htmlScrollLeft: htmlLocations.current.get(tab.id)!.scrollLeft
          } : {}) },
        savedDiskVersion: tab.diskVersion ?? null,
        editingActive: Boolean(editsRef.current[tab.id] && !editsRef.current[tab.id].paused)
      })),
      // Opening may reserve an active ID before React commits its tab. Snapshot
      // only committed tabs; keep the pending ID for reply ownership checks.
      activeKey: currentTabs.find((tab) => tab.id === currentActive)?.restoredKey
        ?? currentTabs.find((tab) => tab.id === currentActive)?.id ?? null,
      tree: {
        expanded: Object.entries(currentDirectories).filter(([, value]) => value.expanded)
          .map(([key]) => JSON.parse(key) as string[]).filter((path) => path.length > 0),
        selected: currentTabs.find((tab) => tab.id === currentActive)?.request.segments ?? null,
        scrollTop: treeRef.current?.scrollTop ?? 0
      },
      panel: { ...defaultSessionPanel, ...readingSettingsRef.current,
        ...(layoutContractAvailable.current ? { workspaceLayout: layoutRef.current } : {}), documentsAndImagesOnly: markdownOnlyRef.current, sidebarOpen: sidebarOpenRef.current,
        outlineOpen,
        sidebarWidth: Math.min(800, Math.max(160,
          (layoutRef.current === "atlas" || window.innerWidth < sidebarWidthRef.current + 480 ? sidebarWidthRef.current
            : document.querySelector<HTMLElement>(".sidebar")?.getBoundingClientRect().width)
            || sidebarWidthRef.current)) }
    }, ++sessionSequence.current);
  }

  function checkpointSession(final = false): Promise<void> {
    if (!sessionReadyRef.current || typeof api.checkpointWorkspaceSession !== "function")
      return Promise.resolve();
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = null;
    let input: SessionCheckpointInput;
    try { input = sessionSnapshot(); }
    catch (error) {
      setSessionNotice({ operation: final ? "close" : "checkpoint", code: readerError(error).code });
      return Promise.reject(error);
    }
    const write = sessionWrite.current.catch(() => {}).then(async () => {
      if(htmlHandles.current.size) {
      await Promise.all([...htmlHandles.current].map(async ([id, handle]) => {
        try { retainHtmlLocation(id, await handle.capture()); } catch { /* Preserve last acknowledged location. */ }
      }));
      input = sessionSnapshot();
      }
      if (final && typeof api.finishWorkspaceSession === "function") await api.finishWorkspaceSession(input);
      else await api.checkpointWorkspaceSession(input);
      setSessionNotice(old => old?.operation === (final ? "close" : "checkpoint") ? null : old);
    });
    sessionWrite.current = write;
    return write.catch((error) => {
      setSessionNotice({ operation: final ? "close" : "checkpoint", code: readerError(error).code });
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
      editingActive: !isNativeDocument(tab.name) && tab.editingActive, kind: tab.kind
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
      if (isHtmlDocument(tab.name)) htmlLocations.current.set(id, {headingId:tab.anchor.headingId,offset:tab.anchor.offset,
        scrollTop:tab.anchor.scrollTop,scrollLeft:tab.anchor.htmlScrollLeft ?? 0,zoom:tab.anchor.htmlZoom ?? 1});
    });
    const selected = saved.tabs.findIndex((tab) => tab.key === saved.activeKey);
    const selectedId = restoredTabs[selected]?.id ?? restoredTabs[0]?.id ?? null;
    activeIdRef.current = selectedId;
    setActiveId(selectedId);
    sidebarOpenRef.current = saved.panel.sidebarOpen;
    setSidebarOpen(saved.panel.sidebarOpen);
    setSidebarWidth(saved.panel.sidebarWidth);
    sidebarWidthRef.current = saved.panel.sidebarWidth;
    setOutlineOpen(saved.panel.workspaceLayout === undefined ? true : saved.panel.outlineOpen);
    layoutContractAvailable.current = saved.panel.workspaceLayout !== undefined;
    layoutRef.current = resolveWorkspaceLayout(saved.panel.workspaceLayout);
    setLayout(layoutRef.current);
    const restoredReading = {
      readingFont: saved.panel.readingFont ?? defaultSessionPanel.readingFont,
      readingSize: saved.panel.readingSize ?? defaultSessionPanel.readingSize,
      readingLineHeight: saved.panel.readingLineHeight ?? defaultSessionPanel.readingLineHeight,
      readingWidth: saved.panel.readingWidth ?? defaultSessionPanel.readingWidth
    };
    readingSettingsRef.current = restoredReading;
    setReadingSettings(restoredReading);
    markdownOnlyRef.current = saved.panel.documentsAndImagesOnly ?? true;
    setMarkdownOnly(markdownOnlyRef.current);
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
      setSessionNotice({ operation: "load", code: readerError(error).code });
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
      && readingSettings.readingWidth === defaultSessionPanel.readingWidth && markdownOnly) return;
    scheduleSessionCheckpoint();
  }, [sessionReady, root, priorRoot, tabs, activeId, directories, sidebarOpen, sidebarWidth, outlineOpen, readingSettings, markdownOnly]);

  useSettingsOwner({ language: locale, appearance: appearance.preference, ...readingSettings,
    documentsAndImagesOnly: markdownOnly, workspaceLayout: layout }, sessionReady, {
    general: values => {
      if (values.language !== localeRef.current) {
        remoteLocale.current = values.language; localeRef.current = values.language; setLocale(values.language);
      }
      if (getAppearance().getSnapshot().preference !== values.appearance) getAppearance().applyPreference(values.appearance, false);
    },
    workspace: patch => {
      if (patch.workspaceLayout !== undefined) {
        layoutContractAvailable.current = true;
        applyWorkspaceLayout(patch.workspaceLayout);
      }
      if (patch.readingFont !== undefined || patch.readingSize !== undefined || patch.readingLineHeight !== undefined || patch.readingWidth !== undefined) {
        const { readingFont, readingSize, readingLineHeight, readingWidth } = { ...readingSettingsRef.current, ...patch };
        applyReadingSettings({ readingFont, readingSize, readingLineHeight, readingWidth });
      }
      if (patch.documentsAndImagesOnly !== undefined) {
        markdownOnlyRef.current = patch.documentsAndImagesOnly; setMarkdownOnly(patch.documentsAndImagesOnly);
      }
    },
    checkpoint: () => checkpointSession(),
    focus: () => { if (settingsInvoker.current?.isConnected) settingsInvoker.current.focus(); else settingsTriggerRef.current?.focus(); },
    opening: () => { if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) settingsInvoker.current = document.activeElement; }
  });

  useLayoutEffect(() => {
    if (pendingTreeScroll.current === null || !treeRef.current) return;
    treeRef.current.scrollTop = pendingTreeScroll.current;
    if (treeRef.current.scrollTop >= pendingTreeScroll.current - 1)
      pendingTreeScroll.current = null;
  }, [directories, sidebarOpen]);

  useEffect(() => {
    const tab = tabs.find((item) => item.id === activeId);
    if (!tab?.request.fileId || (tab.kind !== "image" && !tab.restoredKey)
      || tab.content !== undefined || tab.image || tab.imageLoading || tab.documentLoading || tab.largeInspection || tab.errorCode
      || tab.localView || restoreLoads.current.has(tab.id)) return;
    if (isNativeDocument(tab.name)) { void openDocument(tab.request, {name:tab.name,path:tab.displayPath}); return; }
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
        setRestoreLoadRevision(revision => revision + 1);
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
        }).catch((error) => { if (current()) setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code)); });
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
      setRestoreLoadRevision(revision => revision + 1);
    });
  }, [activeId, tabs]);

  useEffect(() => {
    let disposed = false;
    let unlisten: Array<() => void> = [];
    const onFileChanged = (event: RefreshFileChanged) => {
      if (event.generation !== generationRef.current) return;
      const tab = tabsRef.current.find((item) => item.id === event.fileId);
      if (!tab || tab.diskVersion === event.diskVersion) return;
      if(tab.kind==='prototype' || isPrototypeDocument(tab.name)) {
        setTabs(old=>old.map(t=>t.id===event.fileId ? {...t,freshness:'changed',pendingDiskVersion:event.diskVersion} : t));return;
      }
      setTabs((old) => noteFileChange(old, event, generationRef.current));
      if (tab.dirty || tab.editingActive) {
        setEdits((old) => editReducer(old, { type: "conflict", tabId: event.fileId }));
        if (discardConflictRef.current?.tabId === event.fileId) {
          discardConflictRef.current = null;
          setDiscardConflictConfirm(null);
        }
        if (inspectedDiskRef.current?.tabId === event.fileId
          && inspectedDiskRef.current.document.diskVersion !== event.diskVersion) {
          void inspectConflict(event.fileId).then(() => setNotice(noticeLocale => t(noticeLocale, "diskChangedAgain")));
        }
        return;
      }
      if (tab.largeInspection) {
        void reloadLargeTab(tab.id);
        return;
      }
      if (tab.kind === "image" || tab.kind === "html") {
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
      if (pendingManualReloads.current.has(targetKey)) {
        setManualReload((old) => old && reloadResultKey(old.target) === targetKey
          ? { ...old, result: { state: event.state, reasonCode: event.reasonCode } } : old);
        if (event.state !== "checking") pendingManualReloads.current.delete(targetKey);
      }
      if (typeof event.targetRef === "string") {
        const prototype=tabsRef.current.find(tab=>tab.id===event.targetRef && tab.kind==='prototype');
        if(prototype?.localView && ['missing','denied','invalid_grant','reselection_required','root_reselection_required','unsupported_type'].includes(event.reasonCode ?? '')) {
          const view=prototype.localView;
          retainedPrototypes.current.delete(view.viewToken!);
          void prototypeControllers.current.get(view.viewToken!)?.dispose(true).catch(()=>{});
          prototypeControllers.current.delete(view.viewToken!);
          setTabs(old=>old.map(tab=>tab.id===prototype.id ? {...tab,localView:undefined,errorCode:event.reasonCode} : tab));
        }
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
        const code = event.reasonCode;
        setNotice(noticeLocale => errorText(noticeLocale, code));
      }
    };
    const onJobProgress = (event: RefreshJobProgress) => {
      if (event.generation !== generationRef.current) return;
      progressRef.current.set(event.jobId, event);
      if (event.state === "cancelled") {
        const key = manualJobTargets.current.get(event.jobId);
        if (key) {
          pendingManualReloads.current.delete(key);
          setReloadResults((old) => ({ ...old, [key]: { state: "uncertain" } }));
          setManualReload((old) => old && reloadResultKey(old.target) === key
            ? { ...old, result: { state: "uncertain" } } : old);
        }
      }
      setReloadJobs((old) => old[event.jobId]
        ? { ...old, [event.jobId]: { ...old[event.jobId], progress: event } } : old);
    };
    void (async () => {
      try {
        await Promise.all([
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
        ].map(subscription => subscription.then(remove => {
          // Retain each successful registration even if a sibling rejects.
          if (disposed) remove(); else unlisten.push(remove);
        })));
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
        if (cleanupRef.current || savingTabRef.current || copySavingRef.current) return;
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

  function showReloadMenu(event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, target: RefreshTarget, label: string, snapshotId?: string) {
    event.preventDefault();
    setProjectsMenu(null); setGoMenu(null);
    const anchor = event.currentTarget;
    const bounds = anchor.getBoundingClientRect();
    // Freeze the clicked item's authority at menu entry. Directory refreshes
    // must not silently substitute a newer listing while this menu is open.
    const tab = tabs.find(tab => {
      const current = refreshTarget(tab);
      return current && reloadResultKey(current) === reloadResultKey(target);
    });
    const revealTarget: RevealTarget | undefined = target.kind === "explicit-file" ? target
      : target.kind === "root-file" ? tab ? { kind: "explicit-file", fileId: tab.id }
        : snapshotId ? { ...target, segments: [...target.segments], snapshotId } : undefined
      : undefined;
    showHtmlOverlay(()=>setReloadMenu({ target, revealTarget, label,
      x: "clientX" in event && event.clientX ? event.clientX : bounds.left,
      y: "clientY" in event && event.clientY ? event.clientY : bounds.bottom,
      anchor }));
  }

  useLayoutEffect(() => { setReloadMenu(null); setProjectsMenu(null); setGoMenu(null); }, [activeId, root?.id]);
  useEffect(() => { setManualReload(null); pendingManualReloads.current.clear(); manualJobTargets.current.clear(); }, [root?.id, root?.generation]);
  useEffect(() => {
    if (reloadMenu || projectsMenu || goMenu) {
      const disclosure = document.querySelector<HTMLDetailsElement>(".document-actions-disclosure");
      if (disclosure) disclosure.open = false;
    }
  }, [reloadMenu, projectsMenu, goMenu]);

  function reloadResultKey(target: RefreshTarget): string {
    return target.kind === "explicit-file" ? `file:${target.fileId}`
      : `path:${target.rootId}:${pathKey(target.segments)}`;
  }

  function reloadFeedback(target: RefreshTarget): string | null {
    return reloadStatusText(reloadResults[reloadResultKey(target)]);
  }

  function reloadStatusText(result?: { state: RefreshItemStatus["state"]; reasonCode?: string }): string | null {
    if (!result) return null;
    if (result.reasonCode) return errorText(locale, result.reasonCode);
    if (result.state === "checking") return t(locale, "checking");
    if (result.state === "changed") return t(locale, "updatedFromDisk");
    if (result.state === "current") return t(locale, "alreadyCurrent");
    if (result.state === "uncertain") return t(locale, "unableConfirm");
    if (result.state === "unavailable") return t(locale, "fileUnavailable");
    if (result.state === "conflict") return t(locale, "conflictNotice");
    return null;
  }

  function reloadProgress(target: RefreshTarget): React.ReactNode {
    const job = Object.values(reloadJobs).reverse().find((item) => reloadResultKey(item.target) === reloadResultKey(target));
    if (!job) return null;
    const { progress } = job;
    if (progress.state === "completed" || progress.state === "failed") return null;
    return <div className="reload-progress" role="status" aria-live="polite">
      {(progress.state === "running" || progress.state === "queued") && <PreviewLoading progress={{}} label={t(locale, "checking")} announce={false} />}
      <span>{progress.state === "cancelled" ? `${t(locale, "notFullyChecked")}${progress.currentSegments ? `: ${progress.currentSegments.join("/")}` : ""}`
        : `${t(locale, "examinedItems")}: ${progress.examinedCount}`}</span>
      {(progress.state === "running" || progress.state === "queued") &&
        <button type="button" onClick={() => void cancelReloadJob(progress.jobId, progress.generation)}>{t(locale, "cancel")}</button>}
    </div>;
  }

  async function startReload(menu: ReloadMenu) {
    const prototype=tabsRef.current.find(tab=>tab.kind==='prototype' && (menu.target.kind==='explicit-file'
      ? tab.id===menu.target.fileId : menu.target.kind==='root-file' && tab.request.rootId===menu.target.rootId && pathKey(tab.request.segments ?? [])===pathKey(menu.target.segments)));
    if(prototype){setReloadMenu(null);await reloadPrototype(prototype.id);return;}

    setReloadMenu(null);
    if (menu.anchor.isConnected) menu.anchor.focus();
    setManualReload({ target: menu.target, label: menu.label, result: { state: "checking" } });
    pendingManualReloads.current.add(reloadResultKey(menu.target));
    setReloadResults((old) => ({ ...old, [reloadResultKey(menu.target)]: { state: "checking" } }));
    try {
      const response = await api.reloadItem(menu.target, crypto.randomUUID());
      if (response.generation !== generationRef.current) return;
      manualJobTargets.current.set(response.jobId, reloadResultKey(menu.target));
      const progress = progressRef.current.get(response.jobId) ?? {
        generation: response.generation, jobId: response.jobId,
        examinedCount: 0, confirmedCount: 0, state: "queued" as const
      };
      setReloadJobs((old) => ({ ...old, [response.jobId]: { target: menu.target, progress } }));
      if (progress.state === "cancelled") {
        pendingManualReloads.current.delete(reloadResultKey(menu.target));
        setReloadResults((old) => ({ ...old, [reloadResultKey(menu.target)]: { state: "uncertain" } }));
        setManualReload((old) => old && reloadResultKey(old.target) === reloadResultKey(menu.target)
          ? { ...old, result: { state: "uncertain" } } : old);
      }
      const imageTab = tabsRef.current.find((tab) => tab.kind === "image" && (
        menu.target.kind === "explicit-file" ? tab.id === menu.target.fileId
          : menu.target.kind === "root-file" && refreshTarget(tab)?.kind === "root-file"
            && pathKey(documentSegments(tab) ?? []) === pathKey(menu.target.segments)
            && rootRef.current?.id === menu.target.rootId));
      if (imageTab) void refreshRetainedTab(imageTab.id);
    } catch (error) {
      const reasonCode = readerError(error).code;
      pendingManualReloads.current.delete(reloadResultKey(menu.target));
      setReloadResults((old) => ({ ...old, [reloadResultKey(menu.target)]: { state: "uncertain", reasonCode } }));
      setManualReload((old) => old && reloadResultKey(old.target) === reloadResultKey(menu.target)
        ? { ...old, result: { state: "uncertain", reasonCode } } : old);
    }
  }

  async function cancelReloadJob(jobId: string, generation: number) {
    try { await api.cancelReload(jobId, generation); }
    catch (error) { setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code)); }
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

  useEffect(() => {
    if(!tabs.some(tab=>tab.kind === "html")) return;
    const measure=()=>setHtmlShellOverlay(Boolean(document.querySelector('[aria-modal="true"],.document-actions-disclosure[open],.action-menu,.path-disclosure[open]')));
    const observer=new MutationObserver(measure);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open'],childList:true});measure();return()=>observer.disconnect();
  },[tabs.some(tab=>tab.kind === 'html')]);
  const active = tabs.find((tab) => tab.id === activeId) ?? null;
  useEffect(()=>{
    const view=active?.localView;
    if(view?.kind!=='prototype' || !view.viewToken)return;
    let disposed=false;
    void prototypeNative.status({viewToken:view.viewToken,generation:view.generation}).then(result=>{
      if(disposed || !result || !validPrototypeView(result.view) || result.view.viewToken!==view.viewToken)return;
      if(result.changed)setTabs(old=>old.map(tab=>tab.localView?.viewToken===view.viewToken ? {...tab,freshness:'changed'} : tab));
    }).catch(error=>{
      if(disposed)return;
      const detail=readerError(error);
      if(['missing','denied','invalid_grant','reselection_required','root_reselection_required','unsupported_type','stale_view'].includes(detail.code)) {
        retainedPrototypes.current.delete(view.viewToken!);
        void prototypeControllers.current.get(view.viewToken!)?.dispose(true).catch(()=>{});prototypeControllers.current.delete(view.viewToken!);
        setTabs(old=>old.map(tab=>tab.localView?.viewToken===view.viewToken ? {...tab,localView:undefined,errorCode:detail.code} : tab));
      }
    });
    return ()=>{disposed=true;};
  },[activeId,active?.localView?.viewToken]);
  const documentOpening = Boolean(documentPending && documentPending.sequence === openSequence.current
    && documentPending.generation === generationRef.current);
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
      || (active.kind === "image" ? !active.image : active.content === undefined && !active.largeInspection && active.kind !== "details" && active.kind !== "prototype" && !(active.kind === "html" && ["ready","empty"].includes(active.htmlState?.state ?? "")))) return;
    if (historyRef.current.entries[historyRef.current.cursor]?.key === active.id) return;
    changeHistory(recordVisit(historyRef.current, { key: active.id,
      target: { id: active.id, request: active.request, kind: active.kind, name: active.name, displayPath: active.displayPath, explicitFile: active.explicitFile,
        imageView: imageViews.current.get(active.id), zoom: documentZooms.current.get(active.id), htmlLocation: htmlLocations.current.get(active.id) },
      scrollTop: scrollPositions.current.get(active.id) ?? 0, scrollLeft: 0 }));
  }, [activeId, active?.content, active?.image, active?.imageLoading, active?.errorCode, active?.largeInspection, active?.htmlState?.state, active?.kind]);
  useEffect(() => {
    if (typeof api.setNativeMenuState !== "function") return;
    const update = () => { void api.setNativeMenuState({
      newMarkdownReady: newMarkdownReady(),
      closeTab: Boolean(active),
      editingOwner: !newMarkdownOpen && editorMenu.owner, editingUndo: editorMenu.undo, editingRedo: editorMenu.redo, editingSelection: editorMenu.selection,
      save: Boolean(active && edits[active.id] && !edits[active.id].paused
        && edits[active.id].draft !== edits[active.id].source),
      find: Boolean((active?.content || active?.kind === "html") && !active?.errorCode),
      reload: Boolean(active), locale,
      defaultMarkdownReady: !newMarkdownOpen && sessionReady && !restoreOffer && !nativeEntries.length && !busy && !documentOpening
        && !closeIntent && !pendingSaveAs && !pendingSection && !discardConflictConfirm && !discardSectionId
        && !clearDraftsConfirm && !clearCopiesConfirm && !clearSessionConfirm && !clearRecentsConfirm
        && !storageOpen && !Object.keys(pendingRecoveries).length && !Object.keys(edits).length,
      back: !historyBusy && Boolean(active ? history.entries[history.cursor - 1] : history.entries[history.cursor]),
      forward: !historyBusy && Boolean(active && history.entries[history.cursor + 1]),
      visited: !historyBusy && Boolean(history.entries.length),
      clearHistory: !historyBusy && Boolean(history.entries.length)
    }).catch(() => {}); };
    update();
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, [newMarkdownOpen, active, edits, locale, history, historyBusy, editorMenu, sessionReady, restoreOffer, nativeEntries, busy, documentOpening,
    closeIntent, pendingSaveAs, pendingSection, discardConflictConfirm, discardSectionId, clearDraftsConfirm, clearCopiesConfirm,
    clearSessionConfirm, clearRecentsConfirm, storageOpen, pendingRecoveries, selectionPending, documentPending,
    enteringSection, savingTabId, copySaving, cleanupBusy, openingRecent, restoreLoadRevision, historyOpen, documentsOpen]);
  const activeEdit = activeId ? edits[activeId] : undefined;
  const findInDraft = Boolean(activeEdit && !activeEdit.paused);
  const findOverBudget = useMemo(() => active?.content
    ? exceedsRenderBudget(active.content) : false, [active?.content]);
  const findAvailable = Boolean(active && !active.errorCode
    && !findOverBudget && (findInDraft || active.content !== undefined || active.kind === "html"));
  const markdownFindResults = useMemo(() => findIndex && findQuery.trim()
    ? findLiteral(findIndex, findQuery) : null, [findIndex, findQuery]);
  const findResults = active?.kind === "html" ? htmlFind : markdownFindResults;
  const activeFindOrdinal = active?.kind === "html" ? (htmlFind?.count ? htmlFind.current - 1 : -1)
    : findResults?.count ? Math.min(findOrdinal, findResults.count - 1) : -1;

  useLayoutEffect(() => {
    if (!findOpen || !findAvailable || active?.kind === "html") { setFindIndex(null); setFindIndexError(false); return; }
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
    if (findOpen && !findInputRef.current?.closest("[inert]")) findInputRef.current?.focus();
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
    const starts = markdownFindResults!.starts;
    let lower = 0;
    if (visible) {
      let high = starts.length;
      while (lower < high) {
        const mid = (lower + high) >>> 1;
        if (starts[mid] < visible.start - markdownFindResults!.queryLength) lower = mid + 1;
        else high = mid;
      }
    }
    const ordinary: Range[] = [];
    let activeRange: Range | null = null;
    const overlays: Array<{ left: number; top: number; width: number; height: number; active: boolean }> = [];
    let painted = 0;
    for (let ordinal = lower; ordinal < findResults.count && painted < 300; ordinal++) {
      if (visible && starts[ordinal] > visible.end) break;
      const span = findIndex.span(starts[ordinal], markdownFindResults!.queryLength);
      const range = span && findIndex.range(span);
      if (!range) continue;
      if (ordinal === activeFindOrdinal) activeRange = range;
      else ordinary.push(range);
      painted++;
    }
    if (!activeRange && activeFindOrdinal >= 0) {
      const span = findIndex.span(starts[activeFindOrdinal], markdownFindResults!.queryLength);
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
    // New Find inputs focus after commit; an already-open input can focus now.
    if (!findInputRef.current?.closest("[inert]")) findInputRef.current?.focus();
  }

  useEffect(() => {
    if (active?.kind !== "html" || !findOpen) return;
    let cancelled=false; setHtmlFind(null);
    const timer=setTimeout(() => {void htmlHandles.current.get(active.id)?.find(findQuery).then(result=>{if(!cancelled){setHtmlFind(result);setFindOrdinal(Math.max(0,result.current-1));}}).catch(e=>{if(!cancelled)setNotice(l=>errorText(l,readerError(e).code));});},150);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[findQuery,findOpen,activeId]);
  function closeFind() {
    if(active?.kind === "html") {
      const handle=htmlHandles.current.get(active.id);
      void handle?.find("").then(()=>handle.focus()).catch(()=>{});
    }
    setFindOpen(false);
    setFindQuery("");
    const target = findInDraft
      ? document.querySelector<HTMLElement>("[data-rich-leaf]")
      : findRoot ?? findFocusBefore.current;
    requestAnimationFrame(() => {
      if (findInDraft && editorFindRef.current) editorFindRef.current.focus();
      else target?.focus();
    });
  }

  function revealFind(ordinal: number) {
    if (!findIndex || !markdownFindResults?.count) return;
    const span = findIndex.span(markdownFindResults.starts[ordinal], markdownFindResults.queryLength);
    if (findInDraft && span) { editorFindRef.current?.reveal(span, { focus: false }); return; }
    const range = span && findIndex.range(span);
    range?.startContainer.parentElement?.scrollIntoView?.({ block: "center", behavior: "instant" });
  }

  function moveFind(direction: number) {
    if (active?.kind === "html") { void htmlHandles.current.get(active.id)?.find(findQuery,direction < 0).then(setHtmlFind).catch(e => setNotice(l=>errorText(l,readerError(e).code))); return; }
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
    if (!active?.diskVersion || active.kind === "image" || active.kind === "html" || active.kind === "details" || active.kind === "prototype" || isNativeDocument(active.name) || active.errorCode || activeEdit) return;
    if (!editingAvailable || typeof api.listEditSections !== "function") return;
    let cancelled = false;
    void api.listEditSections(active.id).then((result) => {
      if (!cancelled) {
        setSectionsByTab((old) => ({ ...old, [active.id]: result.diskVersion === active.diskVersion ? result.sections : [] }));
        setSectionLayoutVersions((old) => ({ ...old, [active.id]: active.diskVersion! }));
      }
    }).catch(() => {
      if (!cancelled) {
        setSectionsByTab((old) => ({ ...old, [active.id]: [] }));
        setSectionLayoutVersions((old) => ({ ...old, [active.id]: active.diskVersion! }));
      }
    });
    return () => { cancelled = true; };
  }, [activeId, active?.diskVersion, active?.errorCode, Boolean(activeEdit)]);

  async function startEdit(tabId: string, section: SectionDescriptor, diskVersion: string) {
    if (!editingAvailable || enteringSectionRef.current || (tabsRef.current.find(t=>t.id===tabId)?.kind === "html" || tabsRef.current.find(t=>t.id===tabId)?.kind === "prototype")) return;
    const token = Symbol("section entry"), generation = generationRef.current, navigation = openSequence.current;
    const previousVersion = tabsRef.current.find(tab => tab.id === tabId)?.diskVersion;
    enteringSectionRef.current = token;
    setEnteringSection({ tabId, sectionId: section.id });
    const valid = () => enteringSectionRef.current === token && generation === generationRef.current && navigation === openSequence.current
      && activeIdRef.current === tabId && tabsRef.current.some(tab => tab.id === tabId && (tab.diskVersion === diskVersion || tab.diskVersion === previousVersion));
    try {
      const started = await api.beginSectionEdit(tabId, section.id, diskVersion);
      if (!valid()) { await api.discardSectionEdit(started.sessionId); return; }
      setEdits((old) => editReducer(old, { type: "begin", tabId, edit: {
        sessionId: started.sessionId, diskVersion: started.diskVersion,
        section: started.section, source: started.source,
        draft: started.source, lineSeparator: started.lineSeparator,
        checkpointStatus: "pending", sequence: 0
      } }));
      setTabs((old) => old.map((tab) => tab.id === tabId
        ? { ...tab, editingActive: true, dirty: false } : tab));
      setNotice(null);
      return true;
    } catch (error) {
      if (valid()) setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
    } finally { if (enteringSectionRef.current === token) { enteringSectionRef.current = null; setEnteringSection(null); } }
  }

  async function beginEdit(section: SectionDescriptor) {
    if (!active?.diskVersion) return;
    const current = edits[active.id];
    if (current) {
      if (current.section.id === section.id && current.paused) {
        setEdits((old) => editReducer(old, { type: "pause", tabId: active.id, paused: false }));
      } else if (current.section.id !== section.id) {
        setPendingSection({ tabId: active.id, section });
      } else setNotice(noticeLocale => t(noticeLocale, "pendingDraft"));
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
        setNotice(noticeLocale => t(noticeLocale, "reselectSection"));
        return;
      }
      setSectionsByTab((old) => ({ ...old, [pending.tabId]: current.sections }));
      await startEdit(pending.tabId, section, version);
    } catch (error) {
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
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
      setNotice(noticeLocale => t(noticeLocale, "saveConflict"));
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
      const savedPath = tabsRef.current.find((tab) => tab.id === tabId)?.displayPath ?? "";
      setNotice(noticeLocale => saved.recoveryCleanupFailed ? t(noticeLocale, "recoveryCleanupFailed") : `${t(noticeLocale, "sourceSaved")}: ${savedPath}`);
      if (saved.safetyCopyStatusFailed) setNotice(noticeLocale => t(noticeLocale, "safetyCopyStatusFailed"));
      void refreshSafetyCopies();
      const nextSection = saved.sections.find((candidate) => candidate.kind === edit.section.kind
        && candidate.ordinal === edit.section.ordinal && candidate.label === edit.section.label)
        ?? saved.sections.find((candidate) => candidate.kind === edit.section.kind
          && candidate.ordinal === edit.section.ordinal);
      if (nextSection && !pendingSection) focusSectionBoundary(tabId, nextSection);
      // Save publishes a new native file identity. Persist it before a close or
      // quit can complete; failed/uncertain Saves never reach this boundary.
      if (typeof api.rememberRecentDocument === "function") {
        if (tabsRef.current.some((tab) => tab.id === tabId)) {
          try {
            await api.rememberRecentDocument(tabId);
            await refreshRecents();
          } catch (error) {
            // The source Save is already confirmed. A metadata failure must not
            // turn it into a failed Save or resurrect a consumed edit session.
            setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
          }
        }
      }
      return saved;
    } catch (error) {
      const code = readerError(error).code;
      if (code === "version_changed" || code === "save_race"
        || code === "save_race_uncaptured" || code === "reselection_required") {
        setTabs((old) => old.map((tab) => tab.id === tabId
          ? { ...tab, freshness: "conflict" } : tab));
        setEdits((old) => editReducer(old, { type: "conflict", tabId }));
      }
      setNotice(noticeLocale => code === "version_changed" ? t(noticeLocale, "saveConflict") : errorText(noticeLocale, code));
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
    setBusy(true); copySavingRef.current = true; setCopySaving(tabId);
    try {
      await api.commitSectionSaveAs(edit.sessionId, token, edit.draft, replaceExisting);
      setPendingSaveAs(null);
      setNotice(noticeLocale => t(noticeLocale, "copySavedOriginalDirty").replace("{name}", copyName ?? pendingSaveAs?.name ?? ""));
      void refreshSafetyCopies();
    } catch (error) {
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
    } finally {
      setBusy(false); copySavingRef.current = false; setCopySaving(null);
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
      else await commitSaveAs(tabId, choice.token, false, choice.name);
    } catch (error) {
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
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
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
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
        setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
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
        setNotice(noticeLocale => t(noticeLocale, "diskChangedAgain"));
      } else setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
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
    setFolderSearchScope([]);
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
    if(htmlHandles.current.size) await hideHtml();
    setBusy(true); setSelectionPending("folder");
    setNotice(null);
    try {
      if (typeof api.prepareRootSelection === "function") {
        const token = await api.prepareRootSelection();
        if (!token) return;
        setSelectionPending("folder");
        if (Object.keys(editsRef.current).length || Object.keys(pendingRecoveriesRef.current).length) {
          setPendingFolder(token);
          setCloseIntent({ kind: "folder" });
          return;
        }
        activateFolder(await api.commitRootSelection(token));
      } else {
        if (Object.keys(editsRef.current).length || Object.keys(pendingRecoveriesRef.current).length) {
          setNotice(noticeLocale => t(noticeLocale, "pendingDraft"));
          return;
        }
        const selected = await api.selectRoot();
        if (selected) activateFolder(selected);
      }
    } catch (error) {
      const detail = readerError(error);
      setNotice(noticeLocale => errorText(noticeLocale, detail.code));
    } finally {
      setBusy(false); setSelectionPending(null);
    }
  }

  function retainHtmlLocation(id: string, location: HtmlLocation) {
    htmlLocations.current.set(id, location);
    readingAnchors.current.set(id, location);
    const visit=historyRef.current.entries[historyRef.current.cursor]?.key===id ? historyRef.current.entries[historyRef.current.cursor] : [...historyRef.current.entries].reverse().find(v=>v.key===id);
    if(visit?.key===id) {visit.target.htmlLocation={...location};visit.scrollTop=location.scrollTop;visit.scrollLeft=location.scrollLeft;}
  }
  function localTarget(request: OpenRequest): LocalTarget {
    return request.fileId ? {fileId:request.fileId} : {rootId:request.rootId!,segments:request.segments!};
  }
  async function acceptLocalView(view: LocalView, request: OpenRequest, pendingId?: string, activate = true, onFailure?: (code:string)=>void): Promise<string | undefined> {
    if(!validLocalView(view)) throw {code:isPrototypeDocument(view?.name ?? "") ? "prototype_invalid" : "html_view_unavailable",message:"Invalid local view response"};
    if(view.kind === "markdown") return openDocument({...request,fileId:view.fileId},{name:view.name,path:view.displayPath},onFailure);
    if(view.kind === "image") return openImage({...request,fileId:view.fileId},{name:view.name,path:view.displayPath},false,true,onFailure);
    if(view.kind !== "details" && !validHtmlView(view) && !validPrototypeView(view)) throw {code:"html_view_unavailable",message:"Invalid isolated HTML response"};
    const existing=tabsRef.current.find(tab=>tab.identityKey===view.identityKey && tab.localView);
    if(existing) {
      // Reopening an explicit file from a deliberately selected folder must
      // consume that returned grant, while retaining tab/session identity.
      if((view.kind==='html' || view.kind==='prototype') && request.rootId && request.rootId!==existing.request.rootId) {
        setTabs(old=>old.filter(tab=>tab.id!==pendingId || tab.id===existing.id).map(tab=>tab.id===existing.id
          ? {...tab,localView:view,htmlState:undefined,diskVersion:view.diskVersion,explicitFile:false,request:{...request,fileId:view.fileId}} : tab));
        if(activate){activeIdRef.current=existing.id;setActiveId(existing.id);setCompactSidebarOpen(false);}return existing.id;
      }
      if(view.viewToken && view.viewToken!==existing.localView?.viewToken) await disposeLocalView(view);
      setTabs(old=>old.filter(tab=>tab.id!==pendingId || tab.id===existing.id));
      if(activate){activeIdRef.current=existing.id;setActiveId(existing.id);}return existing.id;
    }
    if(validPrototypeView(view)) {
      retainedPrototypes.current.add(view.viewToken);
      prototypeControllers.current.set(view.viewToken,new PrototypeController(view));
      if(typeof api.rememberRecentDocument==='function')void api.rememberRecentDocument(view.fileId).then(refreshRecents).catch(()=>{});
    }
    const tab:Tab={id:view.fileId,identityKey:view.identityKey,name:view.name,displayPath:view.displayPath,kind:view.kind,
      localView:view,diskVersion:view.diskVersion,request:{...request,fileId:view.fileId},explicitFile:request.explicitFile,
      restoredKey:tabsRef.current.find(t=>t.id===pendingId)?.restoredKey};
    setTabs(old=>[...old.filter(t=>t.id!==pendingId && t.id!==tab.id),tab]);
    if(activate){activeIdRef.current=tab.id;setActiveId(tab.id);setCompactSidebarOpen(false);}return tab.id;
  }
  async function followHtmlLink(link: HtmlLink, selected?: LocalView, explicitFile?: boolean) {
    if(link.kind === "anchor") {
      if(active) {const location=htmlLocations.current.get(active.id);changeHistory(recordVisit(historyRef.current,{key:active.id,anchor:link.anchor ?? "",
        target:{...active,htmlLocation:location},scrollTop:location?.scrollTop ?? 0,scrollLeft:location?.scrollLeft ?? 0}));} return;
    }
    if(!link.fileId || !["html","prototype","document","image","details"].includes(link.kind)) {
      setNotice(l=>errorText(l,link.reason ?? (link.kind==="missing"?"missing":"unsupported_type")));return;
    }
    const sequence=++openSequence.current, source=activeIdRef.current;
    try {
      const view=selected ?? await htmlNative.open({fileId:link.fileId},crypto.randomUUID());
      if(sequence!==openSequence.current || source!==activeIdRef.current){if(view.viewToken)await disposeLocalView(view);return;}
      let failureCode:string|undefined;
      const id=await acceptLocalView(view,{fileId:view.fileId,...(explicitFile ? {explicitFile:true} : {})},undefined,view.kind!=='html',code=>{failureCode=code;});
      if(id && view.kind==='html') {
        await waitForHtmlReady(id);
        if(sequence!==openSequence.current || source!==activeIdRef.current) return;
        if(link.anchor!==null) {const handle=htmlHandles.current.get(id);if(handle)await handle.locate({offset:0,scrollTop:0,scrollLeft:0,zoom:1,...htmlLocations.current.get(id),headingId:link.anchor || null});}
        if(sequence!==openSequence.current || source!==activeIdRef.current)return;
        if(source)await htmlHandles.current.get(source)?.hide();
        setNotice(null);activeIdRef.current=id;setActiveId(id);
        requestAnimationFrame(()=>void htmlHandles.current.get(id)?.focus().catch(()=>{}));
      }
      if(!id && source) {
        if(activeIdRef.current===source || activeIdRef.current===view.fileId) {if(failureCode)setNotice(l=>errorText(l,failureCode!));activeIdRef.current=source;setActiveId(source);requestAnimationFrame(()=>void htmlHandles.current.get(source)?.focus().catch(()=>{}));}
        return;
      }
      if(id && link.anchor!==null && view.kind!=='html') {
        if(view.kind==='markdown') setPendingAnchor({fileId:id,anchor:link.anchor});
        else setNotice(l=>t(l,"htmlFragmentUnsupported"));
      }
    } catch(e) {setNotice(l=>errorText(l,readerError(e).code));}
  }
  async function openDocument(request: OpenRequest, fallback?: { name: string; path: string }, onFailure?: (code:string)=>void): Promise<string | undefined> {
    const sequence = ++openSequence.current;
    if(activeIdRef.current && htmlHandles.current.has(activeIdRef.current)) {
      const handle=htmlHandles.current.get(activeIdRef.current)!;
      await handle.capture().catch(()=>{});await handle.hide().catch(()=>{});
      if(sequence!==openSequence.current)return;
    }
    setNotice(null);
    const requestKey = request.fileId ?? `${request.rootId}:${pathKey(request.segments ?? [])}`;
    const token = Symbol("document load");
    documentLoads.current.set(requestKey, token);
    const generation = generationRef.current;
    const current = () => generation === generationRef.current && documentLoads.current.get(requestKey) === token;
    const activate = (id: string) => {
      if (sequence !== openSequence.current) return;
      const acquisition = selectionAcquisition.current;
      if (acquisition?.token === token) acquisition.fileId = id;
      const selection = pendingDocumentSelection.current;
      if (selection?.loadToken === token && selection.sequence === sequence && selection.generation === generation) {
        selection.fileId = id;
        selection.loadToken = undefined;
      }
      activeIdRef.current = id;
      setActiveId(id); setCompactSidebarOpen(false);
    };
    // Acquisition reserves identity; rendering success is acknowledged separately by the native surface.
    const pendingId = request.fileId ?? `error:${request.rootId}:${pathKey(request.segments ?? [])}`;
    const pendingName = fallback?.name ?? request.segments?.at(-1) ?? "";
    if (!isNativeDocument(pendingName)) {
      selectionAcquisition.current = { token, sequence, generation };
      setDocumentPending({ token, name: pendingName, sequence, generation });
    }
    if (isNativeDocument(pendingName)) {
      // Closing a pending tab invalidates the same token as closing a settled
      // tab, including root-relative requests whose request key differs.
      documentLoads.current.set(pendingId, token);
      const pending: Tab = { id: pendingId, name: pendingName,
        displayPath: fallback?.path ?? pendingName, request, explicitFile: request.explicitFile,
        documentLoading: true };
      setTabs(old => old.some(tab => tab.id === pendingId)
        ? old.map(tab => tab.id === pendingId ? { ...tab, documentLoading: true, errorCode: undefined } : tab) : [...old, pending]);
      activate(pendingId);
    }
    try {
      if (isNativeDocument(pendingName)) {
        const opening=crypto.randomUUID();htmlOpens.current.set(pendingId,opening);
        let view:LocalView;
        try {view=await htmlNative.open(localTarget(request),opening);} catch(e) {
          if(!(e && typeof e==='object' && 'code' in e) || String(e).includes('not found')) throw {code:'html_view_unavailable',message:'Isolated HTML provider unavailable'}; throw e;
        } finally {if(htmlOpens.current.get(pendingId)===opening)htmlOpens.current.delete(pendingId);}
        if(!current() || documentLoads.current.get(pendingId)!==token) {if(view.viewToken)await disposeLocalView(view);return;}
        return await acceptLocalView(view,request,pendingId,sequence===openSequence.current);
      }
      const document = requireMarkdownResponse(await api.readDocument(request));
      setDocumentPending(old => old?.token === token ? null : old);
      if (!current() || (isNativeDocument(pendingName) && documentLoads.current.get(pendingId) !== token)) return;
      if (typeof api.rememberRecentDocument === "function") {
        void api.rememberRecentDocument(document.fileId).then(refreshRecents).catch(() => {});
      }
      const failedId = request.fileId ?? `error:${request.rootId}:${pathKey(request.segments ?? [])}`;
      const existing = tabsRef.current.find((tab) => tab.identityKey === document.identityKey || tab.id === document.fileId);
      if (existing) {
        if (requestKey !== document.fileId) documentLoads.current.delete(document.fileId);
        // A successful tree read supplies a root-bound grant. Reuse the clean
        // document tab with that grant, rather than retaining its picker-only
        // grant. Never rebind
        // an edit or recovery session underneath its owning native grant.
        if (existing.explicitFile && request.rootId && request.segments?.length && !request.explicitFile
          && !existing.dirty && !existing.editingActive && !editsRef.current[existing.id]
          && !pendingRecoveriesRef.current[existing.id]) {
          const rebound: Tab = { ...existing, id: document.fileId,
            restoredKey: existing.restoredKey ?? existing.id, identityKey: document.identityKey,
            name: document.name, displayPath: document.displayPath, content: document.content,
            diskVersion: document.diskVersion, errorCode: undefined, freshness: "current", freshnessReason: undefined,
            explicitFile: false, request: { fileId: document.fileId, rootId: request.rootId, segments: request.segments } };
          const retain = <T,>(map: Map<string, T>) => {
            const value = map.get(existing.id);
            if (value !== undefined) map.set(rebound.id, value);
            map.delete(existing.id);
          };
          if (rebound.id !== existing.id) {
            retain(scrollPositions.current); retain(readingAnchors.current); retain(documentZooms.current);
            documentLoads.current.delete(existing.id);
          }
          changeHistory({ ...historyRef.current, entries: historyRef.current.entries.map((visit) =>
            visit.key === existing.id ? { ...visit, key: rebound.id,
              target: { ...visit.target, id: rebound.id, request: rebound.request, explicitFile: false } } : visit) });
          setTabs((old) => old.filter((tab) => tab.id !== failedId || tab.id === existing.id)
            .map((tab) => tab.id === existing.id ? rebound : tab));
          activate(rebound.id);
          return rebound.id;
        }
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
          if (current() && activeIdRef.current === tab.id) setNotice(noticeLocale => errorText(noticeLocale, readerError(recoveryError).code));
        }
      }
      return tab.id;
    } catch (error) {
      if (!current() || (isNativeDocument(pendingName) && documentLoads.current.get(pendingId) !== token)) return;
      const detail = readerError(error);
      onFailure?.(detail.code);
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
          setNotice(noticeLocale => errorText(noticeLocale, readerError(inspectionError).code));
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
        errorCode: detail.code === "unsupported_type" && isHtmlDocument(name)
          ? "html_view_unavailable" : detail.code
      };
      setTabs((old) => old.some((item) => item.id === id)
        ? old.map((item) => item.id === id ? tab : item)
        : [...old, tab]);
      activate(id);
    } finally {
      // Keep the successful acquisition through the active handler's commit.
      // A key in this interval must belong to the acquired document, not the
      // previous render's active tab. Failed/stale acquisitions have no lease.
      if (selectionAcquisition.current?.token === token && !selectionAcquisition.current.fileId)
        selectionAcquisition.current = null;
      setDocumentPending(old => old?.token === token ? null : old);
      if (documentLoads.current.get(requestKey) === token) documentLoads.current.delete(requestKey);
      if (isNativeDocument(pendingName) && documentLoads.current.get(pendingId) === token) documentLoads.current.delete(pendingId);
    }
  }

  async function openImage(request: OpenRequest, fallback?: { name: string; path: string },
    force = false, activate = true, onFailure?: (code:string)=>void): Promise<string | undefined> {
    if(activate && activeIdRef.current && htmlHandles.current.has(activeIdRef.current)) {
      const handle=htmlHandles.current.get(activeIdRef.current)!;await handle.capture().catch(()=>{});await handle.hide().catch(()=>{});
    }
    if (activate) openSequence.current += 1;
    setNotice(null);
    setFindOpen(false);
    const pendingId = request.fileId ?? `image:${request.rootId}:${pathKey(request.segments ?? [])}`;
    const alreadyOpen = tabsRef.current.find((tab) => tab.id === pendingId && tab.kind === "image" && tab.image);
    if (alreadyOpen && !force) {
      if (activate) { activeIdRef.current = pendingId; setActiveId(pendingId); setCompactSidebarOpen(false); }
      return pendingId;
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
        ? { ...tab, imageLoading: true, errorCode: undefined,
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
        return duplicate.id;
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
      return image.fileId;
    } catch (error) {
      if (generation !== generationRef.current || imageLoads.current.get(pendingId) !== token) return;
      imageLoads.current.delete(pendingId);
      const code = readerError(error).code;
      onFailure?.(code);
      setTabs((old) => old.map((tab) => tab.id === pendingId
        ? { ...tab, kind: "image", imageLoading: false, image: undefined, errorCode: code } : tab));
    }
  }

  async function openFolderSearchResult(result: OpenFolderSearchHit,
    hit: FolderSearchHit, query: string, selectedRootId: string) {
    if (rootRef.current?.id !== selectedRootId) return;
    const opening = openDocument({ rootId: selectedRootId, segments: hit.segments },
      { name: hit.segments.at(-1) ?? hit.path, path: hit.path });
    const owner = openSequence.current, generation = generationRef.current;
    const current = () => rootRef.current?.id === selectedRootId
      && owner === openSequence.current && generation === generationRef.current;
    await opening;
    if (!current()) return;
    if (result.matchMoved) setNotice(noticeLocale => t(noticeLocale, "folderSearchMoved"));
    else if (result.changed) setNotice(noticeLocale => t(noticeLocale, "folderSearchChanged"));
    if (hit.kind === "content" && result.ordinal !== null) {
      pendingSearchReveal.current = true;
      requestAnimationFrame(() => {
        if (!current()) return;
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
    if(tabsRef.current.find(t=>t.id===tabId)?.kind === "prototype") {await reloadPrototype(tabId);return;}
    if(tabsRef.current.find(t=>t.id===tabId)?.kind === "html") {await htmlHandles.current.get(tabId)?.reload();return;}
    if (tabsRef.current.find((item) => item.id === tabId)?.kind === "image") {
      const tab = tabsRef.current.find((item) => item.id === tabId)!;
      await openImage({ ...tab.request, fileId: tabId, explicitFile: tab.explicitFile }, { name: tab.name, path: tab.displayPath }, true, false);
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
    setBusy(true); setSelectionPending("folder");
    try {
      const selected = await api.selectRoot(previous.id);
      if (!selected) return;
      generationRef.current = selected.generation;
      rootRef.current = selected;
      setFolderSearchScope([]);
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
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
    } finally { setBusy(false); setSelectionPending(null); }
  }

  async function recoverMissingRoot() {
    if (busy || typeof api.reselectSessionRoot !== "function") return;
    setBusy(true); setSelectionPending("folder");
    try {
      const restored = await api.reselectSessionRoot();
      if (restored) applyRestoredSession(restored);
    } catch (error) {
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
    } finally { setBusy(false); setSelectionPending(null); }
  }

  async function recoverMissingFile(tab: Tab) {
    if (busy || !tab.restoredKey || typeof api.reselectSessionFile !== "function") return;
    setBusy(true); setSelectionPending("file");
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
      setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
    } finally { setBusy(false); setSelectionPending(null); }
  }

  async function reselectFile(tabId: string) {
    if (busy) return;
    setBusy(true); setSelectionPending("file");
    try {
      const selected = await api.selectFile(tabId);
      if (selected) {
        inspectedDiskRef.current = null; setInspectedDisk(null);
        discardConflictRef.current = null; setDiscardConflictConfirm(null);
        inspectionSequence.current += 1;
        await refreshRetainedTab(tabId);
      }
    } catch (error) { setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code)); }
    finally { setBusy(false); setSelectionPending(null); }
  }

  async function chooseFile() {
    if(htmlHandles.current.size) await hideHtml();
    setBusy(true); setSelectionPending("file");
    setNotice(null);
    try {
      const selected = await api.selectFile();
      if (selected) {
        sessionClearedRef.current = false;
        sessionReadyRef.current = true;
        setSessionReady(true);
        if (typeof selected.generation === "number") generationRef.current = selected.generation;
        setSelectionPending(null);
        await (imageName(selected.name) ? openImage : openDocument)(
          { fileId: selected.id, explicitFile: true }, { name: selected.name, path: selected.displayPath });
      }
    } catch (error) {
      const detail = readerError(error);
      setNotice(noticeLocale => errorText(noticeLocale, detail.code));
    } finally {
      setBusy(false); setSelectionPending(null);
    }
  }

  async function closeTab(id: string, handled = false) {
    await closeTabs([id], handled);
  }

  async function closeTabs(ids: string[], handled = false) {
    const targets = tabsRef.current.filter((tab) => ids.includes(tab.id));
    if (!targets.length || targets.some((tab) => savingTabRef.current === tab.id)) return;
    if (!handled && targets.some((tab) => tab.dirty || pendingRecoveriesRef.current[tab.id]
      || (editsRef.current[tab.id] && editsRef.current[tab.id].draft !== editsRef.current[tab.id].source))) {
      setCloseIntent({ kind: "tab", tabId: targets[0].id, tabIds: targets.map((tab) => tab.id) });
      return;
    }
    if (enteringSection && ids.includes(enteringSection.tabId)) {
      enteringSectionRef.current = null; setEnteringSection(null);
    }
    if (!handled) {
      for (const tab of targets) {
        if (editsRef.current[tab.id] && !(await discardEdit(tab.id))) return;
      }
    }
    for (const tab of targets) {
      const opening=htmlOpens.current.get(tab.id);if(opening) {void htmlNative.cancelOpen(opening).catch(()=>{});htmlOpens.current.delete(tab.id);}
      imageLoads.current.delete(tab.id);
      if (tab.documentLoading) documentLoads.current.delete(tab.id);
      if (openingLarge.current === tab.id) void api.cancelLargeOpen().catch(() => {});
      if (tab.largeOpened) void api.closeLargeSource(tab.largeOpened.snapshotId).catch(() => {});
    }
    if(targets.some(tab=>tab.id===activeIdRef.current)) await hideHtml();
    const closing = new Set(targets.map((tab) => tab.id));
    const next = tabsRef.current.filter((tab) => !closing.has(tab.id));
    tabsRef.current = next;
    setTabs(next);
    // Checkpoints refer to the remaining tabs; release native prototype grants after pending writes settle.
    for(const tab of targets)if(tab.localView?.kind==='prototype') {
      const token=tab.localView.viewToken!;retainedPrototypes.current.delete(token);
      const controller=prototypeControllers.current.get(token);prototypeControllers.current.delete(token);
      await sessionWrite.current.catch(()=>{});
      if(controller)await controller.dispose(true).catch(()=>{});
      else await prototypeNative.dispose({viewToken:token,generation:tab.localView.generation},true).catch(()=>{});
    }
    for(const tab of targets)if(isPrototypeDocument(tab.name) && !tab.localView && tab.request.fileId)
      await prototypeNative.releaseGrant(tab.request.fileId).catch(()=>{});
    // Session visit history retains view locations after the tabs close.
    if (activeIdRef.current && closing.has(activeIdRef.current)) {
      activeIdRef.current = next.at(-1)?.id ?? null;
      setActiveId(activeIdRef.current);
    }
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
      : intent.tabIds ?? (intent.tabId ? [intent.tabId] : []);
    if (choice === "keep") {
      if (targets.some((id) => edits[id] && edits[id].checkpointStatus !== "saved")) {
        setNotice(noticeLocale => t(noticeLocale, "checkpointRequired"));
        return;
      }
      if (intent.kind === "folder") {
        try {
          for (const sessionId of new Set(targets.map((id) =>
            edits[id]?.sessionId ?? pendingRecoveries[id]?.sessionId).filter((id): id is string => Boolean(id))))
            await api.suspendSectionEdit(sessionId);
        } catch (error) {
          setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
          return;
        }
      }
    } else if (choice === "save") {
      if (targets.some((id) => pendingRecoveries[id])) {
        setNotice(noticeLocale => t(noticeLocale, "recoverEdit"));
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
    if (intent.kind === "app" || intent.kind === "window") {
      // Commit saved tabs/removed edits and their layout-owned snapshot refs
      // before the final durable checkpoint. Closing must work even when an
      // occluded WebView stops receiving animation frames.
      flushSync(() => setCloseIntent(null));
    } else setCloseIntent(null);
    if (intent.kind === "app" || intent.kind === "window") {
      await finishClose(intent.kind === "app");
    } else if (intent.kind === "folder" && pendingFolder) {
      try {
        const selected = await api.commitRootSelection(pendingFolder);
        setPendingFolder(null);
        setEdits({}); setPendingRecoveries({});
        editsRef.current = {}; pendingRecoveriesRef.current = {};
        activateFolder(selected);
      } catch (error) {
        setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
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
        setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
      }
    } else if (intent.kind === "tab" && intent.tabId) {
      await closeTabs(intent.tabIds ?? [intent.tabId], true);
    } else if (intent.kind === "read" && intent.tabId) {
      setEdits((old) => editReducer(old, { type: "pause", tabId: intent.tabId!, paused: true }));
      if (edits[intent.tabId]) focusSectionBoundary(intent.tabId, edits[intent.tabId].section);
    }
  }

  async function finishClose(quit: boolean) {
    if (closeInProgress.current) return;
    closeInProgress.current = true;
    let closeOperation = "finish_workspace_session";
    try {
      if (!sessionReadyRef.current && !sessionClearedRef.current) return;
      if (!sessionClearedRef.current && typeof api.finishWorkspaceSession === "function"
        && typeof api.checkpointWorkspaceSession === "function") await checkpointSession(true);
      closeOperation = "finish_editing_close";
      await api.finishEditingClose(quit);
    } catch (error) {
      const failure = readerError(error);
      // Explicit diagnostic builds expose the returned error without changing
      // checkpoint policy, command permissions, or the native exit mechanism.
      setSessionNotice({ operation: "close", code: failure.code,
        diagnostic: import.meta.env.VITE_CLOSE_DIAGNOSTICS === "1"
          ? `${closeOperation}: ${failure.code}: ${failure.message}` : undefined });
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
      setNotice(noticeLocale => t(noticeLocale, "sessionCleared"));
      sessionClearedRef.current = true;
    } catch (error) {
      setNotice(noticeLocale => `${t(noticeLocale, "cleanupFailed")} ${errorText(noticeLocale, readerError(error).code)}`);
      if (!restoreOffer) {
        sessionReadyRef.current = true;
        setSessionReady(true);
      }
    } finally { setBusy(false); }
  }

  async function clearSavedDrafts() {
    try {
      for (const tabId of new Set([...Object.keys(edits), ...Object.keys(pendingRecoveries)])) {
        if (!(await discardEdit(tabId))) { setNotice(noticeLocale => t(noticeLocale, "cleanupFailed")); return; }
      }
      await api.clearAllRecovery();
      setClearDraftsConfirm(false);
      setNotice(noticeLocale => t(noticeLocale, "draftsCleared"));
    } catch (error) {
      setClearDraftsConfirm(false);
      setNotice(noticeLocale => `${t(noticeLocale, "cleanupFailed")} ${errorText(noticeLocale, readerError(error).code)}`);
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
      setNotice(noticeLocale => t(noticeLocale, "safetyCopiesCleared"));
    } catch (error) {
      setClearCopiesConfirm(false);
      setSafetyCopies(null);
      await refreshSafetyCopies();
      setNotice(noticeLocale => `${t(noticeLocale, "cleanupFailed")} ${errorText(noticeLocale, readerError(error).code)}`);
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
    if (recovery.conflict) setNotice(noticeLocale => t(noticeLocale, "draftConflict"));
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

  async function revealLocalFile(target: RevealTarget) {
    try { await api.revealFile(target); }
    catch (error) { setNotice(noticeLocale => `${t(noticeLocale, "fileRevealFailed")} ${errorText(noticeLocale, readerError(error).code)}`); }
  }

  async function copyPath(path: string) {
    try {
      if (!navigator.clipboard?.writeText) { setNotice(noticeLocale => t(noticeLocale, "pathCopyUnavailable")); return; }
      await navigator.clipboard.writeText(path); setNotice(noticeLocale => t(noticeLocale, "pathCopied"));
    } catch { setNotice(noticeLocale => t(noticeLocale, "pathCopyFailed")); }
  }

  function documentStatus(tab: Tab): string {
    const status = tab.freshnessReason ? errorText(locale, tab.freshnessReason)
      : tab.errorCode ? errorText(locale, tab.errorCode)
      : tab.freshness === "unavailable" ? t(locale, "fileUnavailable")
      : tab.freshness === "checking" ? t(locale, "checking")
      : tab.freshness === "uncertain" ? t(locale, "unableConfirm")
      : tab.freshness === "conflict" ? t(locale, "conflictNotice")
      : tab.freshness === "changed" ? t(locale, tab.kind === "prototype" ? "prototypeChanged" : "updatedFromDisk") : "";
    return [tab.dirty ? t(locale, "unsaved") : "", status].filter(Boolean).join(" · ");
  }

  useEffect(() => {
    document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
  }, [activeId]);

  async function revealDocument(tab: Tab) {
    const selectedRoot = rootRef.current;
    const segments = documentSegments(tab);
    if (!selectedRoot || !segments) { setNotice(noticeLocale => t(noticeLocale, "revealUnavailable")); return; }
    const sequence = ++revealSequence.current;
    const current = () => sequence === revealSequence.current && rootRef.current?.id === selectedRoot.id
      && activeIdRef.current === tab.id;
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    setRevealing(true); setSidebarOpen(true); if (compactSidebar) setCompactSidebarOpen(true); setSidebarPanel("explorer");
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
    } catch { if (current()) setNotice(noticeLocale => t(noticeLocale, "revealUnavailable")); }
    finally { if (sequence === revealSequence.current) setRevealing(false); }
  }

  async function runCleanup(action: () => Promise<void>) {
    if (cleanupRef.current || savingTabRef.current || copySavingRef.current) return;
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
    if (!element) setNotice(noticeLocale => t(noticeLocale, "missing"));
    else setActiveOutlineId(element.id);
  }

  async function navigate(target: string) {
    if (!active?.identityKey) return;
    const sourceId = active.id, generation = generationRef.current, sequence = ++openSequence.current;
    const current = () => sourceId === activeIdRef.current && generation === generationRef.current && sequence === openSequence.current;
    try {
      const result = await api.resolveLink(sourceId, target);
      if (!current()) return;
      if (result.kind === "anchor") {
        if (result.anchor) {
          noteLocationVisit(result.anchor);
          scrollToAnchor(result.anchor);
        }
      } else if (result.kind === "document" && result.fileId) {
        const loading = openDocument({ fileId: result.fileId, ...(active.explicitFile ? { explicitFile: true } : {}) });
        const openIntent = openSequence.current;
        const loadedId = await loading;
        if (loadedId && loadedId === activeIdRef.current && generation === generationRef.current
          && openIntent === openSequence.current && result.anchor) setPendingAnchor({ fileId: loadedId, anchor: result.anchor });
      } else if ((result.kind === "html" || result.kind === "prototype" || result.kind === "details") && result.fileId) {
        await followHtmlLink({...result,requestedPath:null,accessId:null,reason:null}, undefined, active.explicitFile);
      } else if (result.kind === "image" && result.fileId) {
        await openImage({ fileId: result.fileId, ...(active.explicitFile ? { explicitFile: true } : {}) });
      } else {
        setNotice(noticeLocale => result.kind === "missing" ? t(noticeLocale, "missing")
          : result.kind === "unsupported" ? t(noticeLocale, isHtmlLink(target) ? "htmlUnavailable" : "unsupported")
            : t(noticeLocale, "linkBlocked"));
      }
    } catch (error) {
      if (current()) setNotice(noticeLocale => errorText(noticeLocale, readerError(error).code));
    }
  }

  function hasPendingSectionLayout(tab: Tab) {
    return tab.kind !== "html" && tab.kind !== "details" && !isHtmlDocument(tab.name) && editingAvailable && typeof api.listEditSections === "function"
      && Boolean(tab.diskVersion) && !editsRef.current[tab.id]
      && sectionLayoutVersions[tab.id] !== tab.diskVersion;
  }

  function captureReadingPosition(id: string, reader: HTMLDivElement) {
    // Loading and partially painted replacements can clamp the native scroll
    // position. Their geometry must not overwrite the last complete passage.
    const tab = tabsRef.current.find(item => item.id === id);
    // A fully painted initial document can be read before section descriptors
    // arrive. Remember that reading intent without trusting pending geometry.
    if (tab?.content !== undefined && paintedMarkdown.current?.id === id
      && paintedMarkdown.current.content === tab.content && hasPendingSectionLayout(tab)
      && !readingAnchors.current.has(id) && !scrollPositions.current.has(id)) {
      initialReadingIntent.current = { id, content: tab.content, sequence: openSequence.current,
        generation: generationRef.current, top: reader.scrollTop };
      return;
    }
    if (tab && tab.kind !== "image" && !tab.largeInspection
      && (hasPendingSectionLayout(tab) || tab.content === undefined || renderedMarkdown?.id !== id
        || renderedMarkdown.content !== tab.content
        || !reader.querySelector(".document-page .markdown-body"))) return;
    const scrollTop = reader.scrollTop;
    scrollPositions.current.set(id, scrollTop);
    const headings = Array.from(reader.querySelectorAll<HTMLElement>(
      ".document-page h1[id], .document-page h2[id], .document-page h3[id], .document-page h4[id], .document-page h5[id], .document-page h6[id]"));
    const readerTop = reader.getBoundingClientRect().top;
    let closest: { headingId: string | null; offset: number; scrollTop: number } = { headingId: null, offset: 0, scrollTop };
    for (const heading of headings) {
      const top = zoomRect(heading, documentZooms.current.get(id) ?? 1).top - readerTop + scrollTop;
      // Outline navigation leaves a 24px scroll margin. Native scrollTop can
      // round down while heading geometry retains its fractional CSS pixel.
      if (top <= scrollTop + 25) closest = { headingId: heading.id, offset: scrollTop - top, scrollTop };
    }
    readingAnchors.current.set(id, closest);
    historyRef.current = updateVisit(historyRef.current, id, { scrollTop, scrollLeft: reader.scrollLeft });
    const currentVisit = historyRef.current.entries[historyRef.current.cursor];
    if (currentVisit?.key === id) currentVisit.target.zoom = documentZooms.current.get(id);
    setActiveOutlineId((prior) => prior === closest.headingId ? prior : closest.headingId);
  }

  async function traverseHistory(cursor: number) {
    if (traversal.current || busy) return;
    if(activeIdRef.current && htmlHandles.current.has(activeIdRef.current)) await htmlHandles.current.get(activeIdRef.current)!.capture().catch(()=>{});
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
      if(target.kind === "html" || target.kind === "prototype" || target.kind === "details") {
        const view=existing?.localView ?? await htmlNative.open(localTarget(target.request),crypto.randomUUID());
        if(view.kind!==target.kind || (view.kind==='html' && !validHtmlView(view))) throw {code:'html_view_unavailable',message:'Isolated HTML provider unavailable'};
        loaded={...existing,...target,id:view.fileId,localView:view,identityKey:view.identityKey,errorCode:undefined};
        if(validPrototypeView(view)) {retainedPrototypes.current.add(view.viewToken);if(!prototypeControllers.current.has(view.viewToken))prototypeControllers.current.set(view.viewToken,new PrototypeController(view));}
        if(target.htmlLocation) htmlLocations.current.set(loaded.id,target.htmlLocation);
        if(target.kind==='html') {
          if(!existing) setTabs(old=>[...old,loaded]);
          if(existing) {const state=await htmlNative.state({viewToken:view.viewToken!,generation:view.generation});if(state.state==='failed')throw {code:state.reasonCode ?? 'html_render_failed',message:'HTML unavailable'};}
          await waitForHtmlReady(loaded.id);
          if(target.htmlLocation) await htmlHandles.current.get(loaded.id)?.locate(target.htmlLocation);
        }
      } else if (target.kind === "image") {
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
      if (!valid()) {if(!existing && loaded.localView?.viewToken)void disposeLocalView(loaded.localView);return;}
      if(htmlHandles.current.size) await hideHtml();
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
      if(target.kind==='html' && target.htmlLocation) void htmlHandles.current.get(loaded.id)?.locate(target.htmlLocation).catch(e=>setNotice(l=>errorText(l,readerError(e).code)));
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
      if (valid()) setNotice(noticeLocale => `${entry.target.name}: ${errorText(noticeLocale, readerError(error).code)}`);
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
      && (hasPendingSectionLayout(active) || active.content === undefined || renderedMarkdown?.id !== active.id
        || renderedMarkdown.content !== active.content))) return;
    const intent = initialReadingIntent.current;
    if (intent?.id === activeId && intent.content === active?.content
      && intent.sequence === openSequence.current && intent.generation === generationRef.current) {
      scrollPositions.current.set(intent.id, intent.top);
      initialReadingIntent.current = null;
    }
    const saved = readingAnchors.current.get(activeId ?? "");
    setActiveOutlineId((prior) => prior === (saved?.headingId ?? null)
      ? prior : saved?.headingId ?? null);
    if (saved?.headingId) {
      const heading = document.getElementById(saved.headingId);
      if (heading && reader.contains(heading)) {
        const headingBox = zoomRect(heading, documentZooms.current.get(activeId ?? "") ?? 1);
        const readerBox = reader.getBoundingClientRect();
        const top = headingBox.top - readerBox.top + reader.scrollTop;
        if (headingBox.height === 0 && readerBox.height === 0) reader.scrollTop = saved.scrollTop;
        else {
          const position = Math.max(0, top + saved.offset);
          reader.scrollTop = position;
          // Some native WebKit views floor fractional scroll coordinates.
          // Avoid accumulating that error beyond the heading's scroll margin.
          if (reader.scrollTop < position && position - reader.scrollTop < 1)
            reader.scrollTop = Math.ceil(position);
        }
        return;
      }
      setNotice(noticeLocale => t(noticeLocale, "readingPositionShifted"));
    }
    reader.scrollTop = saved?.scrollTop ?? scrollPositions.current.get(activeId ?? "") ?? 0;
  }, [activeId, active?.content, readingSettings, sidebarOpen, outlineOpen, compactOutlineOpen, layout, viewportWidth, renderedMarkdown, sectionLayoutVersions, sectionsByTab]);

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

  function dismissProjects() {
    if (activeId && readerRef.current) captureReadingPosition(activeId, readerRef.current);
    setProjectsMenu(null);
    setReloadMenu(null);
    if (compactSidebar) setCompactSidebarOpen(false);
    else setSidebarOpen(false);
    // Always return to a visible Projects control, even when Search opened the panel.
    (layout === "folio" && !narrowWorkspace ? railProjectsRef.current : sidebarTriggerRef.current)?.focus();
  }

  function rememberSidebarInvoker() {
    if (!sidebarVisible && document.activeElement instanceof HTMLElement) sidebarInvoker.current = document.activeElement;
  }

  function toggleExplorer(event?: React.MouseEvent<HTMLButtonElement>) {
    if (!sidebarVisible) sidebarInvoker.current = event?.currentTarget ?? sidebarTriggerRef.current;
    // A view control selects its own panel; only the already-visible view toggles closed.
    setSidebarPanel("explorer");
    if (sidebarVisible && sidebarPanel !== "explorer") return;
    if (compactSidebar) {
      if (compactSidebarOpen) dismissProjects();
      else setCompactSidebarOpen(true);
      return;
    }
    if (activeId && readerRef.current) captureReadingPosition(activeId, readerRef.current);
    if (sidebarElementRef.current?.contains(document.activeElement)) sidebarTriggerRef.current?.focus();
    if (sidebarAnimationTimer.current) clearTimeout(sidebarAnimationTimer.current);
    setSidebarAnimating(true);
    sidebarAnimationTimer.current = setTimeout(() => setSidebarAnimating(false), 180);
    setSidebarOpen((open) => !open);
  }

  useLayoutEffect(() => {
    if (narrowWorkspace && sidebarVisible) {
      sidebarElementRef.current?.querySelector<HTMLElement>(sidebarPanel === "search" ? 'input[type="search"]' : ".projects-trigger")?.focus();
    }
    else if (narrowSidebarWasVisible.current && !sidebarVisible && sidebarElementRef.current?.contains(document.activeElement))
      (sidebarInvoker.current?.isConnected ? sidebarInvoker.current : sidebarTriggerRef.current)?.focus();
    narrowSidebarWasVisible.current = narrowWorkspace && sidebarVisible;
  }, [narrowWorkspace, sidebarVisible, sidebarPanel]);

  function toggleOutline() {
    if (activeId && readerRef.current) captureReadingPosition(activeId, readerRef.current);
    if (outlineElementRef.current?.contains(document.activeElement)) focusActionTrigger(outlineTriggerRef.current);
    if (narrowWorkspace) setCompactOutlineOpen(open => !open);
    else setOutlineOpen(open => !open);
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
      if (event.key === "Escape" && compactSidebar && compactSidebarOpen && !projectsMenu && !reloadMenu && !goMenu && !document.querySelector('[aria-modal="true"]')) {
        event.preventDefault(); dismissProjects(); return;
      }
      if (event.key === "Escape" && historyBusy) { event.preventDefault(); cancelHistoryTraversal(); return; }
      if (event.key === "Escape" && findOpen) {
        event.preventDefault();
        closeFind();
        return;
      }
      if (!commandPressed(event) || document.querySelector('[aria-modal="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === "s" && !editingAvailable) { event.preventDefault(); return; }
      if (key === "f") {
        event.preventDefault();
        if (event.shiftKey && root) { rememberSidebarInvoker(); setSidebarOpen(true); if (compactSidebar) setCompactSidebarOpen(true); setSidebarPanel("search"); }
        else openFind();
      } else if (key === "o") {
        event.preventDefault();
        if (event.shiftKey) void chooseFolder();
        else void chooseFile();
      } else if (key === "w" && activeId) {
        event.preventDefault();
        void closeTab(activeId);
      } else if (key === "s" && editingAvailable && activeId && edits[activeId] && !edits[activeId].paused) {
        event.preventDefault();
        void saveEdit(activeId);
      } else if (key === "r" && active) {
        event.preventDefault();
        if(active.kind === "prototype") {void reloadPrototype(active.id);return;}
        if(active.kind === "html") {void htmlHandles.current.get(active.id)?.reload();return;}
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

  // Capture before RichSection's section-only select-all. The workspace owns
  // the full document; native text fields and dialogs keep their own shortcut.
  useEffect(() => watchSelectionOwner(() => findRoot, () => { pendingDocumentSelection.current = null; }), [findRoot]);
  useEffect(() => {
    const request = pendingDocumentSelection.current;
    if (!request) return;
    if (request.sequence !== openSequence.current || request.generation !== generationRef.current
      || document.querySelector('[aria-modal="true"]') || ownsTextInput(document.activeElement, findRoot)
      || (!request.loadToken && (!active || request.fileId !== active.id || active.errorCode || active.largeInspection
        || (active.kind && active.kind !== "markdown") || (request.content !== undefined && request.content !== active.content)))) {
      pendingDocumentSelection.current = null; return;
    }
    if (request.loadToken || request.dispatched || active?.documentLoading || active?.content === undefined
      || documentSelectionRef.current?.fileId !== request.fileId) return;
    request.content = active.content;
    // Adapter selection flushes incremental paint synchronously; invoke outside
    // React's commit, and retain the lease through parse/layout completion.
    // Native WebKit can deliver a command while animation frames are suspended
    // by window occlusion. The adapter owns its parse/paint/layout readiness.
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      const isCurrent = () => pendingDocumentSelection.current === request
        && request.sequence === openSequence.current && request.generation === generationRef.current
        && request.fileId === activeIdRef.current
        && tabsRef.current.find(tab => tab.id === request.fileId)?.content === request.content;
      const adapter = documentSelectionRef.current;
      if (!isCurrent() || !adapter || adapter.fileId !== request.fileId) return;
      request.dispatched = true;
      adapter.selectAll({ isCurrent, onComplete: () => {
        if (pendingDocumentSelection.current === request) pendingDocumentSelection.current = null;
      } });
    });
    return () => { live = false; };
  });
  useEffect(() => {
    const committedAcquisition = selectionAcquisition.current;
    if (committedAcquisition?.fileId !== undefined && committedAcquisition.fileId === active?.id && committedAcquisition.sequence === openSequence.current
      && committedAcquisition.generation === generationRef.current) selectionAcquisition.current = null;
    const selectAll = (event: KeyboardEvent) => {
      const acquisition = selectionAcquisition.current;
      const loading = acquisition?.sequence === openSequence.current && acquisition.generation === generationRef.current ? acquisition : null;
      if (!commandPressed(event) || event.key.toLowerCase() !== "a" || event.shiftKey
        || event.defaultPrevented || event.isComposing || document.querySelector('[aria-modal="true"]')
        || (!loading && (!active || (active.kind && active.kind !== "markdown") || active.documentLoading || active.errorCode || active.largeInspection))
        || ownsTextInput(event.target, findRoot) || ownsTextInput(document.activeElement, findRoot)) return;
      event.preventDefault(); event.stopPropagation();
      const request: NonNullable<typeof pendingDocumentSelection.current> = { sequence: openSequence.current, generation: generationRef.current,
        loadToken: loading && !loading.fileId ? loading.token : undefined, fileId: loading ? loading.fileId : active!.id,
        content: loading ? undefined : active!.content };
      pendingDocumentSelection.current = request;
      wakeDocumentSelection(revision => revision + 1);
      if (!loading && !active!.documentLoading && documentSelectionRef.current?.fileId === active!.id) {
        request.dispatched = true;
        documentSelectionRef.current.selectAll({ isCurrent: () => pendingDocumentSelection.current === request
          && request.sequence === openSequence.current && request.generation === generationRef.current
          && request.fileId === activeIdRef.current
          && tabsRef.current.find(tab => tab.id === request.fileId)?.content === request.content,
        onComplete: () => { if (pendingDocumentSelection.current === request) pendingDocumentSelection.current = null; } });
      }
    };
    window.addEventListener("keydown", selectAll, true);
    return () => window.removeEventListener("keydown", selectAll, true);
  });

  function newMarkdownReady() {
    // The ref acknowledges completed restoration synchronously. The state may
    // still belong to the preceding render when an enabled action is invoked.
    return Boolean(sessionReadyRef.current && !restoreOffer && !restoreLoads.current.size && !newMarkdownOwner.current
      && !busy && !selectionPending && !documentPending && !enteringSection && !savingTabId && !copySaving
      && !cleanupBusy && !cleanupRef.current && !savingTabRef.current && !copySavingRef.current
      && !enteringSectionRef.current && !traversal.current && !openingLarge.current
      && !historyBusy && !openingRecent && !closeInProgress.current && !nativeOpening.current
      && !document.querySelector('[aria-modal="true"]'));
  }
  function openNewMarkdown() {
    if (!newMarkdownReady()) return;
    newMarkdownOwner.current = true;
    newMarkdownInvoker.current = projectsMenu?.anchor ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setProjectsMenu(null); setReloadMenu(null); setGoMenu(null);
    showHtmlOverlay(() => setNewMarkdownOpen(true));
  }
  function closeNewMarkdown() {
    newMarkdownOwner.current = false; setNewMarkdownOpen(false);
    if (createdNavigation.current) { createdNavigation.current = false; return; }
    requestAnimationFrame(() => {
      const invoker = newMarkdownInvoker.current;
      (invoker?.isConnected ? invoker : sidebarTriggerRef.current)?.focus();
    });
  }
  async function openCreatedMarkdown(outcome: CreateMarkdownOutcome) {
    const opened = outcome.status === "opened";
    const fileId = opened ? outcome.document.fileId : outcome.fileId;
    if (!fileId) return;
    createdNavigation.current = true;
    const request: OpenRequest = opened && !outcome.explicitFile
      ? { fileId, rootId: outcome.rootId!, segments: outcome.segments }
      : { fileId, explicitFile: true };
    let readFailed = false;
    const id = await openDocument(request, opened
      ? { name: outcome.document.name, path: outcome.document.displayPath }
      : { name: outcome.name, path: outcome.displayPath }, () => { readFailed = true; });
    if (opened && outcome.rootId === rootRef.current?.id) {
      void loadDirectory(outcome.rootId!, outcome.segments.slice(0, -1));
    }
    if (id && !readFailed) setCreatedEdit({ id, watchFailed: opened && outcome.watchFailed });
    else setNotice(l => t(l, "newOpenFailed"));
  }
  // Wait for the confirmed tab/ref and dialog teardown before entering the existing editor.
  useEffect(() => {
    if (!createdEdit || newMarkdownOpen) return;
    const { id, watchFailed } = createdEdit;
    setCreatedEdit(null);
    const tab = tabsRef.current.find(item => item.id === id);
    if (activeIdRef.current !== id || !tab?.diskVersion || tab.errorCode
      || pendingRecoveriesRef.current[id] || editsRef.current[id]) {
      setNotice(l => t(l, "newOpenFailed")); return;
    }
    const version = tab.diskVersion;
    void api.listEditSections(id).then(async result => {
      const whole = result.sections.find(section => section.kind === "whole" && section.startByte === 0 && section.endByte === 0);
      if (activeIdRef.current !== id || tabsRef.current.find(item => item.id === id)?.diskVersion !== version
        || result.diskVersion !== version || !whole) { setNotice(l => t(l, "newOpenFailed")); return; }
      const entered = await startEdit(id, whole, version);
      if (watchFailed && entered) setNotice(l => t(l, "newWatchFailed"));
    }).catch(() => setNotice(l => t(l, "newOpenFailed")));
  }, [createdEdit, newMarkdownOpen]);
  // Native main-window only: leave browser/system new-tab shortcuts to their owner.
  // Capture before editor handlers. The synchronous owner prevents DOM/native double opens.
  useEffect(() => {
    if (!isTauri()) return;
    const shortcut = (event: KeyboardEvent) => {
      if (!commandPressed(event) || event.shiftKey || event.key.toLowerCase() !== "t") return;
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) openNewMarkdown();
    };
    window.addEventListener("keydown", shortcut, true);
    return () => window.removeEventListener("keydown", shortcut, true);
  });

  menuActionRef.current = (payload: string) => {
      if (payload === "workspace_new_markdown") { openNewMarkdown(); return; }
      if (newMarkdownOwner.current) return;
      if (["editing_undo", "editing_redo", "editing_bold", "editing_italic", "editing_code", "editing_link"].includes(payload)) {
        if (activeEdit && !activeEdit.paused && !savingTabRef.current) editorFindRef.current?.command?.(payload.slice(8) as RichCommand);
        return;
      }
      if (payload === "go_back" && !historyBusy) void traverseHistory(active ? history.cursor - 1 : history.cursor);
      else if (payload === "go_forward" && !historyBusy && active) void traverseHistory(history.cursor + 1);
      else if (payload === "go_visited" && !historyBusy && history.entries.length) { setHistoryDirection(null); showHtmlOverlay(()=>setHistoryOpen(true)); }
      else if (payload === "go_clear" && !historyBusy && history.entries.length) clearVisitHistory();
      else if (payload === "workspace_open_file") void chooseFile();
      else if (payload === "workspace_open_folder") void chooseFolder();
      else if (payload === "workspace_close_tab" && activeId) void closeTab(activeId);
      else if (payload === "workspace_save" && activeId && edits[activeId]) void saveEdit(activeId);
      else if (payload === "workspace_find") openFind();
      else if (payload === "workspace_reload" && active) {
        if(active.kind === "prototype") {void reloadPrototype(active.id);return;}
        if(active.kind === "html") {void htmlHandles.current.get(active.id)?.reload();return;}
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
    const entries = state.entries.filter((entry) => entry.kind === "directory" || !markdownOnly || entry.kind === "markdown" || entry.kind === "image" || isNativeDocument(entry.name));
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
                aria-label={entry.name}
                aria-current={!isFolder && active && pathKey(documentSegments(active) ?? []) === pathKey(path) ? "page" : undefined}
                aria-expanded={isFolder ? expanded : undefined}
                title={path.join("/")}
                onContextMenu={(event) => showReloadMenu(event, reloadTarget, entry.name, state.snapshotId)}
                onKeyDown={(event) => {
                  if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
                    showReloadMenu(event, reloadTarget, entry.name, state.snapshotId);
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
                  : (entry.kind === "markdown" || isNativeDocument(entry.name)) && root
                    ? void openDocument({ rootId: root.id, segments: path }, { name: entry.name,
                      path: isNativeDocument(entry.name) ? `${root.displayPath.replace(/[\\/]+$/, "")}/${path.join("/")}` : path.join("/") })
                    : entry.kind === "image" && root
                      ? void openImage({ rootId: root.id, segments: path }, { name: entry.name, path: path.join("/") })
                    : setNotice(noticeLocale => t(noticeLocale, "unsupported"))}
              >
                <span className="tree-icon" aria-hidden="true"><WorkspaceIcon name={isFolder ? expanded ? "folder-open" : "folder" : entry.kind === "image" ? "image" : "file-text"} /></span>
                <MiddleFilename className="tree-name" name={entry.name} />
              </button>

              {isFolder && expanded ? tree(path) : null}
            </div>
          );
        })}
        {state.loading && (
          <div className="tree-progress">
            <PreviewLoading inline label={t(locale, "loading")} />
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
  const contextRevealStatus = reloadMenu && reloadResults[reloadResultKey(reloadMenu.target)];
  const contextFileStatus = contextTab && reloadResults[`file:${contextTab.id}`];
  const contextUnavailableCode = [contextTab?.errorCode, contextTab?.freshnessReason]
    .find(code => code === "missing" || code === "reselection_required" || code === "root_reselection_required" || code === "denied");
  const contextRevealReason = contextUnavailableCode ? errorText(locale, contextUnavailableCode)
    : contextTab?.freshness === "unavailable"
    ? contextTab.freshnessReason ? errorText(locale, contextTab.freshnessReason) : t(locale, "fileUnavailable")
    : contextFileStatus?.state === "unavailable" ? reloadStatusText(contextFileStatus)
    : contextRevealStatus?.state === "unavailable" ? reloadStatusText(contextRevealStatus)
    : reloadMenu?.target.kind === "root-file" && rootProblem ? errorText(locale, rootProblem)
    : null;

  function historyDestinationLabel(direction: -1 | 1) {
    const destination = history.entries[direction === -1 && !active ? history.cursor : history.cursor + direction];
    const label = t(locale, direction === -1 ? "historyBack" : "historyForward");
    return destination && (direction === -1 || active)
      ? `${label}: ${destination.target.name} · ${destination.target.displayPath}` : label;
  }

  async function selectDocument(tab: Tab) {
    const sequence = ++openSequence.current;
    const previous = activeIdRef.current && htmlHandles.current.get(activeIdRef.current);
    if (previous) { await previous.capture().catch(() => {}); await previous.hide().catch(() => {}); }
    if (sequence === openSequence.current) { activeIdRef.current = tab.id; setActiveId(tab.id); }
  }

  function showFolderSearch() {
    rememberSidebarInvoker();
    setFolderSearchScope([]); setSidebarOpen(true);
    if (compactSidebar) setCompactSidebarOpen(true);
    setSidebarPanel("search");
  }

  const closingEditIds = !closeIntent ? []
    : closeIntent.kind === "app" || closeIntent.kind === "window" || closeIntent.kind === "folder"
      ? Object.keys(edits)
      : closeIntent.tabIds ?? (closeIntent.tabId ? [closeIntent.tabId] : []);
  const closingConflict = closingEditIds.some(id => edits[id]?.conflict
    || tabs.find(tab => tab.id === id)?.freshness === "conflict");

  return (
    <div className="app-shell" data-workspace-layout={layout} data-narrow={narrowWorkspace} data-sidebar-visible={sidebarVisible} data-editing={Boolean(activeEdit && !activeEdit.paused)}>
      <header ref={toolbarRef} className="app-header">
        <div className="global-header">
          <div className="theonira-wordmark"><img src={appearance.resolved === "dark" ? theoniraDark : theoniraLight} alt="" />
            <strong>Theonira</strong><span className="product-name">/ Intentgrove</span></div>
          <div className="global-utilities">
            <span className="local-badge"><WorkspaceIcon name="shield-check" />{t(locale, "localOnly")}</span>
            {isTauri() ? <>
              <button type="button" className="utility-button" aria-label={t(locale, "appearance")}
                title={t(locale, "appearance")} onClick={() => appearance.applyPreference(appearance.resolved === "dark" ? "light" : "dark")}>
                <WorkspaceIcon name={appearance.resolved === "dark" ? "moon" : "sun"} /></button>
              <label className="global-language"><span className="sr-only">{t(locale, "language")}</span>
                <select aria-label={t(locale, "language")} value={locale} onChange={event => setLocale(event.target.value as Locale)}>
                  <option value="en">EN</option><option value="es">ES</option>
                </select><WorkspaceIcon name="chevron-down" /></label>
              <button type="button" className="utility-button" aria-label={locale === "es" ? "Ajustes" : "Settings"}
                onClick={() => openSettings("General")}><WorkspaceIcon name="settings-2" /></button>
            </> : <div className="toolbar-group">
              <label className="appearance-control"><span>{t(locale, "appearance")}</span>
                <select aria-label={t(locale, "appearance")} value={appearance.preference}
                  onChange={event => appearance.applyPreference(event.target.value as AppearanceMode)}>
                  <option value="system">{t(locale, "appearanceSystem")}</option><option value="light">{t(locale, "appearanceLight")}</option><option value="dark">{t(locale, "appearanceDark")}</option>
                </select></label>
              <label className="language-control"><span>{t(locale, "language")}</span>
                <select aria-label={t(locale, "language")} value={locale} onChange={event => setLocale(event.target.value as Locale)}>
                  <option value="en">English</option><option value="es">Español</option>
                </select></label>
            </div>}
          </div>
        </div>

      </header>

      {settingsOverlay.shown && active?.kind !== "image" && <section id="reading-settings-panel" className="reading-settings-panel"
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
        <ReadingSettings locale={locale} value={readingSettings} onChange={applyReadingSettings} />
      </section>}

      {nativeEntries.length > 0 && <section className="native-entries notice" aria-label={t(locale, "incomingItems")}>
        <strong>{t(locale, "incomingItems")}</strong>
        <ul>{nativeEntries.map((entry) => <li key={entry.id}>
          <span title={entry.displayPath}>{entry.name} · {entry.source === "finder" ? t(locale, "fromFinder") : t(locale, "fromDrop")}
            {entry.errorCode && ` · ${errorText(locale, entry.errorCode)}`}</span>
          {entry.kind === "folder" && !entry.errorCode && <button type="button" disabled={busy} onClick={() => void acceptNativeEntry(entry.id)}
            aria-label={`${t(locale, "openIncoming")}: ${entry.name}`}>{t(locale, "openIncoming")}</button>}
          <button type="button" onClick={() => void dismissNativeEntry(entry.id)}
            aria-label={`${t(locale, "dismiss")}: ${entry.name}`}>{t(locale, "dismiss")}</button>
        </li>)}</ul>
      </section>}

      {(appearance.persistenceWarning || appearance.nativeWarning) && <div className="notice" role="status">
        <span>{appearance.persistenceWarning ? t(locale, "appearanceSaveFailed") : t(locale, "appearanceNativeFailed")}</span>
        <button type="button" onClick={() => appearance.applyPreference(appearance.preference)}>{t(locale, "retry")}</button>
      </div>}
      {localePersistenceWarning && <div className="notice" role="status">
        <span>{t(locale, "languageSaveFailed")}</span>
        <button type="button" onClick={() => persistLocale(locale)}>{t(locale, "retry")}</button>
      </div>}

      <div className="workspace-layout">
          <div className="document-tabs">
          <button ref={sidebarTriggerRef} type="button" className="projects-toggle" aria-label={t(locale, "projects")}
            aria-expanded={sidebarVisible} onClick={toggleExplorer}><WorkspaceIcon name="panel-left" />{t(locale, "projects")}</button>
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
                onContextMenu={(event) => { event.preventDefault(); setHistoryDirection(direction); showHtmlOverlay(()=>setHistoryOpen(true)); }}
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
                  onMouseDown={(event) => {
                    if (event.button === 1) event.preventDefault();
                  }}
                  onAuxClick={(event) => {
                    if (event.button !== 1) return;
                    event.preventDefault();
                    if (!historyBusy && savingTabId !== tab.id) void closeTab(tab.id);
                  }}
                  draggable onDragStart={() => { draggedTab.current = tab.id; }}
                  onDragEnd={() => { draggedTab.current = null; }}
                  onDragOver={(event) => { if (draggedTab.current) event.preventDefault(); }}
                  onDrop={(event) => {
                    if (!draggedTab.current) return;
                    event.preventDefault();
                    moveTab(draggedTab.current, tabs.findIndex((item) => item.id === tab.id));
                    draggedTab.current = null;
                  }}>
                  <button type="button" role="tab" data-tab-id={tab.id} aria-selected={tab.id === activeId}
                    disabled={historyBusy}
                    aria-label={[tab.name, parent, documentStatus(tab)].filter(Boolean).join(" · ")}
                    aria-description={tab.displayPath}
                    aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
                    tabIndex={tab.id === activeId ? 0 : -1}
                    title={tab.displayPath} onClick={() => void selectDocument(tab)}
                    onContextMenu={(event) => { const target = refreshTarget(tab);
                      if (target) showReloadMenu(event, target, tab.name); }}
                    onKeyDown={(event) => {
                      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
                        const target = refreshTarget(tab);
                        if (target) showReloadMenu(event, target, tab.name);
                        return;
                      }
                      if (event.altKey && event.shiftKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
                        event.preventDefault();
                        moveTab(tab.id, tabs.findIndex((item) => item.id === tab.id)
                          + (event.key === "ArrowRight" ? 1 : -1));
                        setNotice(noticeLocale => t(noticeLocale, "tabMoved"));
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
                    <WorkspaceIcon name={tab.kind === "image" ? "image" : "file-text"} /><span>{tabFilename(tab, tabs)}</span>
                    {parent && <small>{parent}</small>}
                    {tab.dirty && <span className="dirty-dot" aria-hidden="true" />}
                    {tab.freshness === "checking" && !(manualReload?.result.state === "checking" && refreshTarget(tab) && reloadResultKey(manualReload.target) === reloadResultKey(refreshTarget(tab)!)) && <small className="tab-refresh-status"><PreviewLoading inline staticMotion label={t(locale, "checking")} /></small>}
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
              const anchor=event.currentTarget;showHtmlOverlay(()=>setGoMenu({anchor,x:bounds.left,y:bounds.bottom+4}));
            }}>{t(locale, "goMenu")}</button>
          <button className="document-list-trigger" type="button" aria-expanded={documentsOpen}
            disabled={!tabs.length} onClick={() => showHtmlOverlay(()=>setDocumentsOpen(true))}>{t(locale, "openDocuments")} ({tabs.length})</button>
          </div>

        <nav className="folio-rail" hidden={layout !== "folio" || narrowWorkspace} aria-label={t(locale, "workspaceTools")}>
          <button ref={railProjectsRef} type="button" aria-label={t(locale, "projects")} title={t(locale, "projects")} aria-expanded={sidebarVisible} onClick={toggleExplorer}><WorkspaceIcon name="panel-left" /></button>
          <button type="button" aria-label={t(locale, "folderSearch")} title={t(locale, "folderSearch")} disabled={!root} onClick={showFolderSearch}><WorkspaceIcon name="search" /></button>
          <button type="button" aria-label={t(locale, "openFolder")} title={t(locale, "openFolder")} disabled={busy} onClick={() => void chooseFolder()}><WorkspaceIcon name="folder-open" /></button>
          <button type="button" aria-label={locale === "es" ? "Ajustes" : "Settings"} title={locale === "es" ? "Ajustes" : "Settings"} onClick={() => openSettings("General")}><WorkspaceIcon name="settings-2" /></button>
        </nav>
        <aside ref={sidebarElementRef} className="sidebar" aria-label={t(locale, "explorer")}
          data-open={sidebarVisible} data-compact={compactSidebar} data-animate={sidebarAnimating}
          aria-hidden={!sidebarVisible} inert={!sidebarVisible}
          style={{ width: sidebarVisible ? sidebarWidth : 0 }} onPointerUp={(event) => {
            if (!sidebarVisible || compactSidebar || layout === "atlas") return;
            const width = event.currentTarget.getBoundingClientRect().width;
            if (Math.abs(width - sidebarWidth) > 1) setSidebarWidth(width);
          }}>
            <div className="sidebar-heading sidebar-modes">
              <button ref={searchTrigger} type="button" className="projects-trigger" aria-haspopup="menu"
                aria-expanded={Boolean(projectsMenu)} disabled={busy} onClick={(event) => {
                  if (projectsMenu) { setProjectsMenu(null); return; }
                  setReloadMenu(null); setGoMenu(null);
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const anchor=event.currentTarget;showHtmlOverlay(()=>setProjectsMenu({anchor,x:bounds.left,y:bounds.bottom+4}));
                }}><span>{t(locale, "projects")}</span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M1 3 L6 8 L11 3" fill="none" stroke="currentColor" strokeWidth="1.75" /></svg></button>
              <button type="button" className="projects-close" aria-label={t(locale, "closeProjectsSidebar")}
                title={t(locale, "closeProjectsSidebar")} onClick={dismissProjects}>
                <span className="projects-close-surface"><WorkspaceIcon name="panel-left-close" /></span>
              </button>
            </div>
            <div className="project-open-actions">
              <button type="button" disabled={busy} onClick={() => void chooseFile()}>{t(locale, "openFile")}</button>
              <button type="button" disabled={busy} onClick={() => void chooseFolder()}>{t(locale, "openFolder")}</button>
              {selectionPending && !documentOpening && <PreviewLoading inline label={t(locale, "loading")} />}
            </div>
            <button className="explorer-search-launcher" type="button" disabled={!root} onClick={showFolderSearch}>
              <WorkspaceIcon name="search" />{t(locale, "folderSearch")}</button>
            {root ? (
              <>
                <div hidden={sidebarPanel !== "search"} inert={sidebarPanel !== "search"} className="folder-search-host">
                  <FolderSearchPanel key={root.id} root={root} locale={locale} active={sidebarPanel === "search"}
                    scopeSegments={folderSearchScope} query={folderQuery} onQueryChange={setFolderQuery}
                    captureOpenIntent={() => {
                      const owner = ++openSequence.current, generation = generationRef.current;
                      return () => owner === openSequence.current && generation === generationRef.current;
                    }}
                    onDismiss={narrowWorkspace ? dismissProjects : undefined}
                    onClose={() => { setSidebarPanel("explorer"); searchTrigger.current?.focus(); }}
                    onLocalOpen={async view=>{await acceptLocalView(view,{fileId:view.fileId});}}
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
                {!isTauri() && <label className="filter-control">
                  <input type="checkbox" checked={markdownOnly} onChange={(event) => { markdownOnlyRef.current = event.target.checked; setMarkdownOnly(event.target.checked); }} />
                  {t(locale, "filterMarkdown")}
                </label>}
                <div className="tree-scroll" ref={treeRef} onScroll={() => scheduleSessionCheckpoint()}
                  onContextMenu={(event) => { if (!(event.target as HTMLElement).closest(".tree-row")) showReloadMenu(event, { kind: "folder", rootId: root.id, segments: [] }, root.name); }}>
                  {tree([])}
                  {directories[pathKey([])]?.loaded
                    && !directories[pathKey([])]?.entries.some((entry) =>
                      entry.kind === "directory" || !markdownOnly || entry.kind === "markdown" || entry.kind === "image" || isNativeDocument(entry.name)) && (
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
              </div>
            )}
            <section className="shelf-documents" hidden={layout !== "atlas" || compactSidebar || sidebarPanel === "search"} aria-label={t(locale, "openDocuments")}>
              <div className="shelf-title">{t(locale, "openDocuments")} <span>{tabs.length}</span></div>
              <div className="shelf-document-list">{tabs.map(tab => <button key={tab.id} type="button" title={tab.displayPath}
                aria-current={tab.id === activeId ? "page" : undefined} disabled={historyBusy}
                onClick={() => void selectDocument(tab)}>
                <WorkspaceIcon name={tab.kind === "image" ? "image" : "file-text"} /><span>{tab.name}</span>{tab.dirty && <span className="dirty-dot" aria-label={t(locale, "unsaved")} />}
              </button>)}</div>
            </section>
            <section className="shelf-search" hidden={layout !== "atlas" || compactSidebar || sidebarPanel === "search"} aria-label={t(locale, "folderSearch")}>
              <div className="shelf-title">{t(locale, "folderSearch")}</div>
              <button type="button" disabled={!root} onClick={showFolderSearch}><WorkspaceIcon name="search" />{t(locale, "folderSearch")}</button>
              <p>{t(locale, "folderSearchBoth")} · {t(locale, "searchMarkdownCoverage")}</p>
            </section>
            <div className="sidebar-footnote">
              <strong>{t(locale, "storageManagement")}</strong>
              <div>{t(locale, "activeDrafts")}: {new Set([...Object.keys(edits), ...Object.keys(pendingRecoveries)]).size}</div>
              {safetyCopies && safetyCopies.unresolvedCount > 0 && <p role="status">
                {t(locale, "unresolvedCopies")}: {safetyCopies.unresolvedCount}</p>}
              <button type="button" onClick={() => { showHtmlOverlay(()=>setStorageOpen(true)); void refreshSafetyCopies(); }}>{t(locale, "manageStorage")}</button>
              {isTauri() && <button type="button" onClick={() => openSettings("General")}>{locale === "es" ? "Ajustes…" : "Settings…"}</button>}
            </div>
          </aside>

        <main className="main-panel">
          {historyAnnouncement && <span className="sr-only" role="status" aria-label={t(locale, "visitHistory")}>{historyAnnouncement}</span>}
          {newMarkdownOpen && <NewMarkdownDialog locale={locale} defaultDestination={rootProblem ? null : root}
            available={isTauri() && editingAvailable && typeof api.createMarkdownFile === "function"}
            onCreated={openCreatedMarkdown} onClose={closeNewMarkdown} />}
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
            busy={busy || cleanupBusy} cleanupPending={cleanupBusy} suspended={clearSessionConfirm || clearRecentsConfirm || clearDraftsConfirm || clearCopiesConfirm}
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
          {historyBusy && <div className="notice"><PreviewLoading inline label={t(locale, "loading")} />
            <button type="button" onClick={cancelHistoryTraversal}>{t(locale, "cancel")}</button></div>}
          {goMenu && <ActionMenu {...goMenu} onClose={() => setGoMenu(null)} actions={[
            { label: historyDestinationLabel(-1), disabled: historyBusy || !(active ? history.entries[history.cursor - 1] : history.entries[history.cursor]),
              reason: historyBusy ? t(locale, "loading") : !(active ? history.entries[history.cursor - 1] : history.entries[history.cursor]) ? t(locale, "historyNoPrevious") : undefined,
              run: () => void traverseHistory(active ? history.cursor - 1 : history.cursor) },
            { label: historyDestinationLabel(1), disabled: historyBusy || !active || !history.entries[history.cursor + 1],
              reason: historyBusy ? t(locale, "loading") : !active || !history.entries[history.cursor + 1] ? t(locale, "historyNoNext") : undefined, run: () => void traverseHistory(history.cursor + 1) },
            { label: t(locale, "visitHistory"), run: () => { setHistoryDirection(null); showHtmlOverlay(()=>setHistoryOpen(true)); } },
            { label: t(locale, "clearVisitHistory"), disabled: historyBusy || !history.entries.length, run: clearVisitHistory }
          ]} />}
          {projectsMenu && <ActionMenu {...projectsMenu} onClose={() => setProjectsMenu(null)} actions={[
            { label: t(locale, "newMarkdown"), hint: shortcutHint("T"), disabled: busy, run: openNewMarkdown },
            { label: t(locale, "openFile"), hint: shortcutHint("O"), disabled: busy, run: () => void chooseFile() },
            { label: t(locale, "openFolder"), hint: shortcutHint("O", true), disabled: busy, run: () => void chooseFolder() },
            { label: t(locale, "folderSearch"), hint: shortcutHint("F", true), disabled: !root,
              run: () => { setFolderSearchScope([]); setSidebarOpen(true); if (compactSidebar) setCompactSidebarOpen(true); setSidebarPanel("search"); } },
            ...(root ? [
              { label: `${t(locale, "reload")} ${root.name} ${t(locale, "folder")}`, disabled: busy,
                run: () => void startReload({ ...projectsMenu, target: { kind: "folder", rootId: root.id, segments: [] }, label: root.name }) },
              { label: t(locale, "copyPath"), disabled: !navigator.clipboard?.writeText,
                reason: !navigator.clipboard?.writeText ? t(locale, "pathCopyUnavailable") : undefined,
                run: () => void copyPath(root.displayPath) }
            ] : [])
          ]} />}
          {reloadMenu && <ActionMenu anchor={reloadMenu.anchor} x={reloadMenu.x} y={reloadMenu.y}
            onClose={() => setReloadMenu(null)} actions={[
              ...(reloadFeedback(reloadMenu.target) ? [{ label: t(locale, "lastReloadStatus"), disabled: true,
                reason: `${reloadMenu.label}: ${reloadFeedback(reloadMenu.target)}`, run: () => {} }] : []),
              ...(reloadMenu.target.kind === "folder" && reloadMenu.target.segments.length === 0 ? [
                { label: t(locale, "openFile"), hint: shortcutHint("O"), run: () => void chooseFile() },
                { label: t(locale, "openFolder"), hint: shortcutHint("O", true), run: () => void chooseFolder() },
                { label: t(locale, "folderSearch"), hint: shortcutHint("F", true), run: () => { setFolderSearchScope([]); setSidebarOpen(true); if (compactSidebar) setCompactSidebarOpen(true); setSidebarPanel("search"); } }
              ] : []),
              ...(reloadMenu.target.kind === "folder" && reloadMenu.target.segments.length > 0 ? [
                { label: t(locale, directories[pathKey(reloadMenu.target.segments)]?.expanded ? "collapseFolder" : "expandFolder"),
                  run: () => { if (reloadMenu.target.kind === "folder") toggleDirectory(reloadMenu.target.segments); } },
                { label: t(locale, "folderSearch"), run: () => {
                  if (reloadMenu.target.kind !== "folder") return;
                  setFolderSearchScope([...reloadMenu.target.segments]);
                  setSidebarOpen(true); if (compactSidebar) setCompactSidebarOpen(true); setSidebarPanel("search");
                } }
              ] : []),
              ...(reloadMenu.target.kind === "root-file" && reloadMenu.anchor.getAttribute("role") !== "tab" ? [{ label: `${t(locale, "openRecent")} ${reloadMenu.label}`,
                disabled: !/\.(md|markdown)$/i.test(reloadMenu.label) && !imageName(reloadMenu.label),
                reason: !/\.(md|markdown)$/i.test(reloadMenu.label) && !imageName(reloadMenu.label) ? t(locale, "unsupported") : undefined,
                run: () => { if (reloadMenu.target.kind !== "root-file") return;
                  void (imageName(reloadMenu.label) ? openImage : openDocument)({ rootId: reloadMenu.target.rootId, segments: reloadMenu.target.segments },
                    { name: reloadMenu.label, path: contextPath ?? reloadMenu.label }); } }] : []),
              ...(fileRevealAvailable && localAbsolutePath(contextPath) && reloadMenu.target.kind !== "folder" ? [{
                label: t(locale, isWindows ? "revealInFileExplorer" : "revealInFinder"),
                disabled: !!contextRevealReason || !reloadMenu.revealTarget,
                reason: contextRevealReason ?? (!reloadMenu.revealTarget ? errorText(locale, "reselection_required") : undefined),
                run: () => { if (reloadMenu.revealTarget) void revealLocalFile(reloadMenu.revealTarget); }
              }] : []),
              ...(contextPath ? [{ label: t(locale, "copyPath"), disabled: !navigator.clipboard?.writeText,
                reason: !navigator.clipboard?.writeText ? t(locale, "pathCopyUnavailable") : undefined, run: () => void copyPath(contextPath) }] : []),
              ...(contextTab ? [{ label: `${t(locale, "closeTab")}: ${contextTab.name}`, hint: contextTab.id === activeId ? shortcutHint("W") : undefined,
                disabled: busy || savingTabId === contextTab.id, run: () => void closeTab(contextTab.id) },
                ...(reloadMenu.anchor.getAttribute("role") === "tab" ? [
                  { label: t(locale, "closeOtherTabs"), disabled: busy || tabs.length < 2 || savingTabId !== null,
                    run: () => void closeTabs(tabs.filter(tab => tab.id !== contextTab.id).map(tab => tab.id)) },
                  { label: t(locale, "closeTabsRight"), disabled: busy || tabs.at(-1)?.id === contextTab.id || savingTabId !== null,
                    run: () => void closeTabs(tabs.slice(tabs.findIndex(tab => tab.id === contextTab.id) + 1).map(tab => tab.id)) }
                ] : [])
              ] : []),
              { label: `${t(locale, "reload")} ${reloadMenu.label}${reloadMenu.target.kind === "folder" ? ` ${t(locale, "folder")}` : ""}`,
                disabled: busy, hint: contextTab?.id === activeId ? shortcutHint("R") : undefined, run: () => void startReload(reloadMenu) }
            ]} />}
          {sessionNotice && <div className="notice" role="status">
            <span>{sessionNotice.diagnostic ?? sessionErrorText(locale, sessionNotice.operation, sessionNotice.code)}</span>
            {sessionNotice.operation === "checkpoint" && <button type="button" disabled={sessionRetrying}
              onClick={() => {
                setSessionRetrying(true);
                void checkpointSession().catch(() => {}).finally(() => setSessionRetrying(false));
              }}>{t(locale, "retry")}</button>}
            <button type="button" aria-label={t(locale, "dismiss")} onClick={() => setSessionNotice(null)}>×</button>
          </div>}
          {notice && <div className="notice" role="status">
            <span>{notice}</span>
            <button type="button" aria-label={t(locale, "dismiss")} onClick={() => setNotice(null)}>×</button>
          </div>}
          {pendingSaveAs && <div className="section-modal-backdrop">
            <div ref={modalRef} className="section-modal" role="alertdialog" aria-modal="true" aria-label={t(locale, "replaceFile")}>
              <strong>{t(locale, "replaceFile")}</strong>
              <p>{pendingSaveAs.name}</p>
              <div className="section-modal-actions">
                <button type="button" disabled={copySaving !== null} onClick={() => setPendingSaveAs(null)}>{t(locale, "cancel")}</button>
                <button type="button" className="primary-button" disabled={busy}
                  onClick={() => void commitSaveAs(pendingSaveAs.tabId, pendingSaveAs.token, true, pendingSaveAs.name)}>
                  {copySaving && <PreviewLoading inline label={t(locale, "sourceSaving")} />}{t(locale, "replace")}
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
                  onClick={() => void resolvePendingSection("save")}>{savingTabId && <PreviewLoading inline label={t(locale, "sourceSaving")} />}{t(locale, "save")}</button>
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
            <div ref={modalRef} className="section-modal close-edit-dialog" role="alertdialog" aria-modal="true" aria-label={t(locale, closeIntent.kind === "read" ? "returnReadingQuestion" : closeIntent.kind === "tab" ? "closeTabEditQuestion" : closeIntent.kind === "folder" ? "changeFolderEditQuestion" : closeIntent.kind === "window" ? "closeWindowEditQuestion" : "quitEditQuestion")}>
              <strong>{t(locale, closeIntent.kind === "read" ? "returnReadingQuestion" : closeIntent.kind === "tab" ? "closeTabEditQuestion" : closeIntent.kind === "folder" ? "changeFolderEditQuestion" : closeIntent.kind === "window" ? "closeWindowEditQuestion" : "quitEditQuestion")}</strong>
              <p>{t(locale, "chooseEditOutcome")}{closingEditIds.length === 1 && <span> {tabs.find(tab => tab.id === closingEditIds[0])?.name}</span>}</p>
              <div className="close-edit-consequences">
                <div><WorkspaceIcon name="file-text" /><div><h3>{t(locale, "saveToFile")}</h3><p>{t(locale, "saveToFileDetail")}</p></div></div>
                <div><WorkspaceIcon name="pencil" /><div><h3>{t(locale, "keepDraft")}</h3><p>{t(locale, closeIntent.kind === "read" ? "keepReadingDetail" : "keepClosingDetail")}</p></div></div>
              </div>
              <p className="close-edit-secondary">{t(locale, "discardCancelDetail")}</p>
              {closingConflict && <p role="status">{t(locale, "saveConflict")}</p>}
              {closeIntent.tabIds && closeIntent.tabIds.length > 1 && <ul>{closeIntent.tabIds.map(id => {
                const tab = tabs.find(item => item.id === id);
                return <li key={id}>{tab?.displayPath ?? id}</li>;
              })}</ul>}
              <div className="section-modal-actions">
                <button type="button" disabled={busy} onClick={() => void resolveClose("cancel")}>{t(locale, "cancel")}</button>
                <button type="button" disabled={busy} onClick={() => void resolveClose("discard")}>{t(locale, "discard")}</button>
                <button type="button" disabled={busy || closingConflict} onClick={() => void resolveClose("save")}>{savingTabId && <PreviewLoading inline visibleLabel label={t(locale, "sourceSaving")} />}{t(locale, "saveToFile")}</button>
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
                <button type="button" className="primary-button" disabled={cleanupBusy} onClick={() => void runCleanup(clearSession)}>{cleanupBusy && <PreviewLoading inline label={t(locale, "cleanupBusy")} />}{t(locale, "clearSession")}</button>
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
                <button type="button" disabled={cleanupBusy} onClick={() => void runCleanup(clearRecents)}>{cleanupBusy && <PreviewLoading inline label={t(locale, "cleanupBusy")} />}{t(locale, "clearRecents")}</button>
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
                <button type="button" disabled={cleanupBusy} onClick={() => void runCleanup(clearSavedDrafts)}>{cleanupBusy && <PreviewLoading inline label={t(locale, "cleanupBusy")} />}{t(locale, "clearDrafts")}</button>
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
                <button type="button" disabled={cleanupBusy} onClick={() => void runCleanup(clearResolvedCopies)}>{cleanupBusy && <PreviewLoading inline label={t(locale, "cleanupBusy")} />}{t(locale, "clearSafetyCopies")}</button>
              </div>
            </div>
          </div>}
          <div className="document-content" inert={narrowWorkspace && sidebarVisible} aria-hidden={narrowWorkspace && sidebarVisible}>
          {active && <DocumentLocation key={active.id} name={active.name} path={active.displayPath} locale={locale}
            folders={documentSegments(active)?.slice(0, -1).join(" / ") ?? null}
            onReveal={documentSegments(active) ? () => void revealDocument(active) : undefined} revealing={revealing}
            beforeMenuOpen={htmlHandles.current.size ? hideHtml : undefined}
            onMenuOpen={() => { setProjectsMenu(null); setReloadMenu(null); setGoMenu(null); }}
            menuActions={<>
              {active.kind !== "image" && active.kind !== "prototype" && (narrowWorkspace || (activeEdit && !activeEdit.paused)) && <>
                <button ref={outlineTriggerRef} type="button" aria-pressed={outlineVisible} disabled={!active.content && !(active.kind === "html" && active.htmlState?.headings.length)}
                  aria-description={active.kind === "html" && !active.htmlState?.headings.length ? t(locale,"outlineEmpty") : undefined}
                  onClick={toggleOutline}><WorkspaceIcon name="list" />{t(locale, "outline")}</button>
                <button ref={settingsTriggerRef} type="button" aria-expanded={readingSettingsOpen} aria-controls="reading-settings-panel"
                  onClick={() => openSettings("Reading")}><WorkspaceIcon name="settings-2" />{t(locale, "readingSettings")}</button>
              </>}
              <button type="button" disabled={!navigator.clipboard?.writeText} aria-description={!navigator.clipboard?.writeText ? t(locale, "pathCopyUnavailable") : undefined}
                onClick={() => void copyPath(active.displayPath)}>{t(locale, "copyPath")}</button>
              {active.kind==='html' && <button type="button" onClick={()=>void htmlHandles.current.get(active.id)?.details()}>{t(locale,'viewDetails')}</button>}

              <button type="button" onClick={()=>void closeTab(active.id)}>{t(locale,"closeTab")}</button>
              <button type="button" disabled={busy || (!active.largeInspection && !refreshTarget(active))} onClick={() => {
                if(active.kind === "prototype") {void reloadPrototype(active.id);return;}
        if(active.kind === "html") {void htmlHandles.current.get(active.id)?.reload();return;}
        if (active.largeInspection) { void reloadLargeTab(active.id); return; }
                const target = refreshTarget(active);
                if (target) void startReload({ target, label: active.name, x: 0, y: 0, anchor: readerRef.current ?? document.body });
              }}>{t(locale, "reload")}</button>
            </>}
            actions={<>
              {active.kind === "image" ? <div className="image-controls-host" ref={setImageControlsHost} />
                : active.kind === "prototype" ? null : <button type="button" onClick={openFind} disabled={!findAvailable}><WorkspaceIcon name="search" />{t(locale, "findInDocument")}</button>}
              {active.kind !== "image" && active.kind !== "prototype" && !narrowWorkspace && !(activeEdit && !activeEdit.paused) && <>
                <button ref={outlineTriggerRef} type="button" aria-pressed={outlineVisible} disabled={!active.content && !(active.kind === "html" && active.htmlState?.headings.length)}
                  aria-description={active.kind === "html" && !active.htmlState?.headings.length ? t(locale,"outlineEmpty") : undefined}
                  onClick={toggleOutline}><WorkspaceIcon name="list" />{t(locale, "outline")}</button>
                <button ref={settingsTriggerRef} type="button" aria-expanded={readingSettingsOpen} aria-controls="reading-settings-panel"
                  onClick={() => openSettings("Reading")}><WorkspaceIcon name="settings-2" />{t(locale, "readingSettings")}</button>
              </>}
              {active.kind !== "image" && active.kind !== "html" && active.kind !== "details" && active.kind !== "prototype" && !isNativeDocument(active.name) && !active.largeInspection && !active.errorCode && <>
              {activeEdit && !activeEdit.paused ? <div className="header-edit-actions">
                <button type="button" className="primary-button" disabled={busy || Boolean(activeEdit.conflict)
                  || active.freshness === "conflict" || activeEdit.draft === activeEdit.source}
                  aria-label={t(locale, "saveFile")} onClick={() => void saveEdit(active.id)}>{savingTabId === active.id && !closeIntent && !pendingSection ? <PreviewLoading inline label={t(locale, "sourceSaving")} /> : <WorkspaceIcon name="save" />}{t(locale, "saveFile")}</button>
                <button type="button" disabled={busy} onClick={() => activeEdit.draft === activeEdit.source
                  ? void discardEdit(active.id) : setCloseIntent({ kind: "read", tabId: active.id })}>{t(locale, "returnReading")}</button>
                <button type="button" disabled={busy} onClick={() => void saveEditAs(active.id)}>{t(locale, "saveAs")}</button>
                <small>{copySaving === active.id && !pendingSaveAs ? <PreviewLoading inline visibleLabel label={t(locale, "saveAsCopy")} /> : t(locale, "saveReturnsReading")}</small>
              </div> : <button type="button" title={!editingAvailable ? t(locale, "editingUnavailable") : undefined} aria-disabled={Boolean(enteringSection)} disabled={!editingAvailable || busy || !sectionsByTab[active.id]?.length}
                onClick={() => {
                  const reader = readerRef.current;
                  const top = reader?.getBoundingClientRect().top ?? 0;
                  const region = Array.from(reader?.querySelectorAll<HTMLElement>("[data-section-id]") ?? [])
                    .find((element) => zoomRect(element, documentZoom).bottom > top + 24);
                  const section = sectionsByTab[active.id]?.find((item) => item.id === region?.dataset.sectionId)
                    ?? sectionsByTab[active.id]?.[0];
                  if (section) void beginEdit(section);
                }}><WorkspaceIcon name="pencil" />{t(locale, "editSection")}</button>}
              {!editingAvailable && <small>{t(locale, "editingUnavailable")}</small>}
            </>} </>} />}
          {documentOpening && <div className="document-acquisition">{documentPending?.name && <span>{documentPending.name}</span>}{active && <PreviewLoading inline label={t(locale, "loading")} />}</div>}
          {findOpen && <div className="find-band" role="search" aria-label={t(locale, "findInDocument")}>
            <input ref={findInputRef} type="search" value={findQuery} autoComplete="off"
              maxLength={active?.kind === "html" ? 256 : 4096}
              aria-label={t(locale, "findInDocument")} placeholder={t(locale, "findPlaceholder")}
              onChange={(event) => { setFindQuery(event.target.value); setFindOrdinal(0); }}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); moveFind(event.shiftKey ? -1 : 1); }
                if (event.key === "Escape") { event.preventDefault(); closeFind(); }
              }} />
            <span className="find-count" role="status" aria-live="polite">
              {!findAvailable || findIndexError ? t(locale, "findUnavailable")
                : !findQuery.trim() ? t(locale, "findEntry")
                  : !findResults ? <PreviewLoading inline announce={false} label={t(locale, "checking")} />
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
          <div className="reader-scroll" data-image={active?.kind === "image"} ref={readerRef}
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
            {tabs.filter(tab=>tab.kind==='html' && tab.localView).map(tab=><HtmlView key={tab.localView!.viewToken!}
              view={tab.localView!} active={tab.id===activeId} outlineOpen={outlineVisible} locale={locale}
              blocked={htmlShellOverlay || busy || documentsOpen || historyOpen || storageOpen || Boolean(closeIntent) || (narrowWorkspace && sidebarVisible) || readingSettingsOpen}
              baseline={{font:readingSettings.readingFont,size:readingSettings.readingSize,lineHeight:readingSettings.readingLineHeight}}
              initialLocation={htmlLocations.current.get(tab.id)} fallbackHeadings={htmlFallbackHeadings.current.get(tab.id)}
              register={handle=>{if(handle)htmlHandles.current.set(tab.id,handle);else htmlHandles.current.delete(tab.id);}}
              onState={state=>{
                if(['ready','empty'].includes(state.state)) htmlReadyWaiters.current.get(tab.id)?.resolve();
                else if(state.state==='failed')htmlReadyWaiters.current.get(tab.id)?.reject({code:state.reasonCode ?? 'html_render_failed',message:'HTML rendering failed'});
                setTabs(old=>old.map(t=>t.id===tab.id && t.localView?.viewToken===state.viewToken ? {...t,htmlState:state}:t));
              }}
              onLocation={location=>retainHtmlLocation(tab.id,location)}
              onReplace={(view,location,fallback)=>{
                htmlFallbackHeadings.current.set(tab.id,fallback ?? []);
                htmlLocations.current.set(tab.id,location);
                setTabs(old=>old.map(t=>t.id===tab.id ? validHtmlView(view) ? {...t,localView:view,htmlState:undefined,diskVersion:view.diskVersion}
                  : {...t,localView:undefined,errorCode:'html_view_unavailable'} : t));
              }}
              onLink={(link, selected) => followHtmlLink(link, selected, active?.explicitFile)} onPassage={(before,after,anchor)=>{
                retainHtmlLocation(tab.id,before);
                changeHistory(recordVisit(historyRef.current,{key:tab.id,anchor,target:{...tab,htmlLocation:after},scrollTop:after.scrollTop,scrollLeft:after.scrollLeft}));
                retainHtmlLocation(tab.id,after);
              }} onShortcut={(key,shift)=>{
                if(key.toLowerCase()==='f')openFind();else if(key.toLowerCase()==='r')void htmlHandles.current.get(tab.id)?.reload();
                else if(key.toLowerCase()==='w')void closeTab(tab.id);else if(key.toLowerCase()==='o')void (shift?chooseFolder():chooseFile());
              }} onClose={()=>void closeTab(tab.id)} />)}
            {!active && documentOpening ? <div className="error-state"><PreviewLoading label={t(locale, "loading")} /></div> : !active ? (
              <div className="welcome">
                {!sessionReady && !restoreOffer && <PreviewLoading placeholder label={t(locale, "restoreSession")} />}
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
                  <button type="button" disabled={busy} onClick={openNewMarkdown}>{t(locale, "newMarkdown")}</button>
                  {!isTauri() && <button ref={settingsTriggerRef} type="button" onClick={() => openSettings("Reading")}>{t(locale, "readingSettings")}</button>}
                  <button className="primary-button" type="button" onClick={() => void chooseFolder()}>{t(locale, "openFolder")}</button>
                  <button type="button" onClick={() => void chooseFile()}>{t(locale, "openFile")}</button>
                </div>
                {!root && !priorRoot && !recents && sessionReady && (recentsLoading ? <PreviewLoading placeholder label={t(locale, "recents")} /> : recentIssue ? <p role="status">{t(locale, "recentsRecovered")} <button onClick={() => void refreshRecents()}>{t(locale, "retry")}</button></p> : null)}
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
                            {openingRecent === entry.id && <PreviewLoading inline label={t(locale, "loading")} />}{t(locale, entry.status === "available" ? "openRecent" : "reselectRecent")}
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
                  {busy && <PreviewLoading label={t(locale, "largeSourceLoading")} progress={largeProgress?.fileId === active.id
                    ? { completed: largeProgress.completedBytes, total: largeProgress.totalBytes } : {}}
                    detail={largeProgress?.fileId === active.id ? `${largeProgress.completedBytes.toLocaleString(locale)} / ${largeProgress.totalBytes.toLocaleString(locale)} bytes` : undefined} />}
                  {!active.largeInspection.overLimit && <button type="button" className="primary-button"
                    disabled={busy} onClick={() => void openLargeTab(active.id)}>{t(locale,
                      active.errorCode ? "largeSourceReload" : "largeSourceOpen")}</button>}
                  <button type="button" onClick={() => void closeTab(active.id)}>{t(locale, "cancel")}</button>
                </div>}
              </div>
            ) : active.documentLoading || (active.imageLoading && !active.image) ? (
              <div className="error-state"><PreviewLoading label={t(locale, active.imageLoading ? "imageLoading" : isHtmlDocument(active.name) ? "openingHtml" : "loading")} /></div>
            ) : active.errorCode ? (
              <div className="error-state" role="alert">
                <div className="error-symbol" aria-hidden="true">!</div>
                <h1>{errorText(locale, active.errorCode)}</h1>
                <p>{t(locale, active.errorCode === "html_view_unavailable" ? "htmlUnavailableDetail" : "retryHint")}</p>
                {active.errorCode === "reselection_required" && active.explicitFile
                  ? <button type="button" disabled={busy} onClick={() => void (active.request.fileId
                    ? reselectFile(active.id) : recoverMissingFile(active))}>{t(locale, "selectFileAgain")}</button>
                  : active.errorCode === "root_reselection_required"
                    ? <button type="button" disabled={busy} onClick={() => void (root
                      ? reselectFolder() : recoverMissingRoot())}>{t(locale, "selectFolderAgain")}</button>
                    : <button type="button" onClick={() => void (active.kind === "image" ? openImage : openDocument)(active.request, { name: active.name, path: active.displayPath })}>
                      {t(locale, "retry")}
                    </button>}
                {isNativeDocument(active.name) && <button type="button" onClick={() => void closeTab(active.id)}>{t(locale, "closeTab")}</button>}
              </div>
            ) : active.kind === "html" ? null : active.kind === "prototype" && active.localView && validPrototypeView(active.localView) ? (
              <PrototypeView view={active.localView} locale={locale} changed={active.freshness==='changed'} reloadFailed={Boolean(active.prototypeReloadFailed)} onReload={()=>void reloadPrototype(active.id)} />
            ) : active.kind === "details" ? (
              <section className="error-state" role="tabpanel" aria-label={active.name}>
                <h1>{active.name}</h1><p>{t(locale,'previewUnavailable')}</p><p className="selectable-path" tabIndex={0}>{active.displayPath}</p>
                <p>{active.localView?.extension} · {copySize(active.localView?.bytes ?? 0,locale)}</p>
                <button disabled title={t(locale,'defaultAppUnavailable')}>{t(locale,'openDefaultApp')}</button><p>{t(locale,'defaultAppUnavailable')}</p>
              </section>
            ) : active.kind === "image" ? (
              active.image ? <ImageView key={active.id} image={active.image} locale={locale} hideIdentity controlsHost={imageControlsHost}
                initialView={imageViews.current.get(active.id)} onViewChange={(view) => {
                  imageViews.current.set(active.id, view);
                  const visit = historyRef.current.entries[historyRef.current.cursor];
                  if (visit?.key === active.id) visit.target.imageView = { ...view };
                }} />
                : active.imageLoading || (active.freshness !== "unavailable" && active.freshness !== "uncertain")
                  ? <div className="error-state"><PreviewLoading label={t(locale, "imageLoading")} /></div>
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
                      document.querySelector<HTMLElement>("[data-rich-leaf]")?.focus();
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
                <MarkdownView content={active.content ?? ""} fileId={active.id} locale={locale}
                  pendingSectionId={enteringSection?.tabId === active.id ? enteringSection.sectionId : undefined}
                  layoutPending={hasPendingSectionLayout(active)}
                  findRootRef={findRootRef}
                  onSelectionReady={selectionReady}
                  onPainted={(id, content) => { paintedMarkdown.current = { id, content }; }}
                  onRendered={(id, content) => setRenderedMarkdown(old => old?.id === id && old.content === content ? old : { id, content })}
                  onHeadings={(entries) => updateHeadings(active.id, entries)}
                  sections={sectionsByTab[active.id]}
                  editingSection={activeEdit?.section}
                  editingOriginalSource={activeEdit?.source}
                  editingDraft={activeEdit && !activeEdit.paused ? activeEdit.draft : undefined}
                  sectionEditor={activeEdit && !activeEdit.paused && <SectionEditor
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
                  findResults={findOpen && findInDraft ? markdownFindResults : null}
                  findOrdinal={activeFindOrdinal}
                  onFindReady={(adapter) => { editorFindRef.current = adapter; }} onCommandState={setEditorMenu}
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
                  activeSectionId={!activeEdit?.paused ? activeEdit?.section.id : undefined}
                  onEditSection={editingAvailable ? (section) => void beginEdit(section) : undefined}
                  onNavigate={(target) => void navigate(target)} />
              </div>
            )}
          </div>
          {active?.content && active.kind !== "image" && <aside ref={outlineElementRef} className="outline-panel"
            data-open={outlineVisible} aria-hidden={!outlineVisible} inert={!outlineVisible}
            aria-label={t(locale, "outline")}>
            <div className="outline-heading">
              <strong>{t(locale, "outline")}</strong>
              <button type="button" aria-label={t(locale, "closeOutline")}
                onClick={() => { if (activeId && readerRef.current) captureReadingPosition(activeId, readerRef.current);
                  setOutlineOpen(false); setCompactOutlineOpen(false); focusActionTrigger(outlineTriggerRef.current); }}>×</button>
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

          </div>
        </main>
      </div>
      <footer className="workspace-status">
          <ReloadFeedback fallback={active ? active.freshness === "current" && !active.dirty && !active.errorCode ? t(locale, "currentOnDisk") : active.name : t(locale, "localOnly")} message={manualReload && reloadStatusText(manualReload.result)
            ? `${manualReload.label}: ${reloadStatusText(manualReload.result)}` : null}
            successful={Boolean(manualReload && !manualReload.result.reasonCode
              && ["current", "changed"].includes(manualReload.result.state))}
            dismissLabel={t(locale, "dismiss")} progress={manualReload ? reloadProgress(manualReload.target) ?? (manualReload.result.state === "checking" ? <PreviewLoading inline label={t(locale, "checking")} /> : null) : null} />        {layout === "atlas" && <button className="status-storage" type="button" onClick={() => { showHtmlOverlay(() => setStorageOpen(true)); void refreshSafetyCopies(); }}>{t(locale, "storageManagement")}</button>}
        <span className="workspace-signature">Intentgrove by Theonira</span>
      </footer>
    </div>
  );
}
