import { Component, createElement, cloneElement, isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type ReactElement, type Ref } from "react";
import Markdown, { type Components } from "react-markdown";
import { createPortal, flushSync } from "react-dom";
import { selectDocumentContents, ownsTextInput, watchSelectionOwner, type DocumentSelectionAdapter, type DocumentSelectionRequest } from "./document-selection";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";
import type { Plugin } from "unified";
import { parseBounded, documentOverLimit } from "./bounded-parser";
import remarkFrontmatter from "remark-frontmatter";
import { api, type SectionDescriptor } from "../app/api";
import { t, type Locale } from "../app/i18n";
import { useRetainedOverlay } from "../app/useRetainedOverlay";
import { mapRenderedSections } from "./sectionMap";
import { parseFrontmatter, type MetadataResult } from "./frontmatter";
import { collectHeadings, headingSlug, type HeadingEntry } from "./heading-model";
import { BLOCK_PROTOCOL, type BoundedBlock } from "./block-budget";
import DiagramBlock from "./DiagramBlock";
import PreviewLoading from "./PreviewLoading";
import CodeBlock, { fencedSource } from "./CodeBlock";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    const element = node as { props: { children?: ReactNode } };
    return textOf(element.props.children);
  }
  return "";
}

export { headingSlug } from "./heading-model";

// Reject inputs with unusually expensive parse shapes before react-markdown runs
// synchronously on the WebView thread. Ordinary mixed documents stay within this
// budget even at the 10 MiB file limit.
export function exceedsRenderBudget(content: string): boolean {
  let lineLength = 0;
  let tableSeparators = 0;
  let totalSeparators = 0;
  let lines = 0;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === "\n") {
      lines += 1;
      if (lines > 50_000) return true;
      lineLength = 0;
      tableSeparators = 0;
    } else {
      lineLength += 1;
      if (character === "|") {
        tableSeparators += 1;
        totalSeparators += 1;
      }
      if (lineLength > 65_536 || tableSeparators > 512 || totalSeparators > 50_000) return true;
    }
  }
  return false;
}

class RenderBoundary extends Component<{ children: ReactNode; locale: Locale; source?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; locale: Locale; source?: string }>) {
    if (previous.source !== this.props.source && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (this.state.failed) {
      return <div className="error-state" role="alert"><p>{t(this.props.locale, "renderBudget")}</p><pre>{this.props.source}</pre></div>;
    }
    return this.props.children;
  }
}

export function SafeImage({ sourceId, target, alt, locale }: {
  sourceId: string;
  target: string;
  alt: string;
  locale: Locale;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(false);
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) {
      setError(true);
      return;
    }
    api.readImage(sourceId, target).then((image) => {
      if (!live) return;
      objectUrl = URL.createObjectURL(new Blob([new Uint8Array(image.bytes)], { type: image.mime }));
      setUrl(objectUrl);
    }).catch(() => {
      if (live) setError(true);
    });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceId, target]);

  if (error) {
    return <span className="image-placeholder" role="img" aria-label={alt || t(locale, "imageBlocked")}>
      {t(locale, "imageBlocked")}{alt ? `: ${alt}` : ""}
    </span>;
  }
  if (!url) return <PreviewLoading inline label={t(locale, "imageLoading")} />;
  return <img src={url} alt={alt} loading="lazy" onError={() => setError(true)} />;
}

export default function MarkdownView({ content, fileId, locale, onNavigate, sections, activeSectionId,
  onEditSection, pendingSectionId, findRootRef, onHeadings, onRendered, onPainted, onSelectionReady, sectionEditor, editingSection, editingOriginalSource, editingDraft, layoutPending = false }: {
  content: string;
  fileId: string;
  locale: Locale;
  onNavigate: (target: string) => void;
  sections?: SectionDescriptor[];
  activeSectionId?: string;
  onEditSection?: (section: SectionDescriptor) => void;
  pendingSectionId?: string;
  findRootRef?: Ref<HTMLElement>;
  onHeadings?: (entries: HeadingEntry[]) => void;
  onRendered?: (fileId: string, content: string) => void;
  onPainted?: (fileId: string, content: string) => void;
  onSelectionReady?: (adapter: DocumentSelectionAdapter | null) => void;
  layoutPending?: boolean;
  sectionEditor?: ReactNode;
  editingSection?: SectionDescriptor;
  editingOriginalSource?: string;
  editingDraft?: string;
}) {
  const requestedSource = content.startsWith("\uFEFF") ? content.slice(1) : content;
  const overBudget = useMemo(() => documentOverLimit(requestedSource), [requestedSource]);
  const hasWorker = typeof Worker !== "undefined";
  const [parsed, setParsed] = useState<{ fileId: string; raw: string; content: string; tree?: Root;
    metadata?: MetadataResult | null; blocks?: BoundedBlock[]; error?: boolean } | null>(null);
  const retaining = hasWorker && parsed?.fileId === fileId && Boolean(parsed.tree) && parsed.content !== requestedSource;
  const displaySource = retaining ? parsed!.raw : content;
  const parseContent = retaining ? parsed!.content : requestedSource;
  const generation = useRef(0);
  const [painted, setPainted] = useState(24);
  const selectionRoot = useRef<HTMLElement | null>(null);
  const setSelectionRoot = useCallback((node: HTMLElement | null) => {
    selectionRoot.current = node;
    if (typeof findRootRef === "function") findRootRef(node);
    else if (findRootRef) findRootRef.current = node;
  }, [findRootRef]);
  const [selectionRequest, setSelectionRequest] = useState<({ fileId: string; content: string } & DocumentSelectionRequest) | null>(null);
  useEffect(() => {
    if (!selectionRequest) return;
    return watchSelectionOwner(() => selectionRoot.current, () => setSelectionRequest(null));
  }, [selectionRequest]);
  const [editMenu, setEditMenu] = useState<{
    section?: SectionDescriptor; reason?: string; x: number; y: number; anchor: HTMLElement
  } | null>(null);
  const editOverlay = useRetainedOverlay(editMenu, 90);
  const editMenuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const menu = editMenuRef.current;
    const shown = editOverlay.shown;
    if (!menu || !shown) return;
    const position = () => {
      // The body portal is outside document-page's CSS zoom. Both clientX/Y and
      // fixed positioning use viewport CSS pixels; no zoom correction is needed.
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = document.documentElement.clientHeight || window.innerHeight;
      menu.style.left = `${Math.max(0, Math.min(shown.x, width - menu.offsetWidth))}px`;
      menu.style.top = `${Math.max(0, Math.min(shown.y, height - menu.offsetHeight))}px`;
    };
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [editOverlay.shown, locale]);

  useEffect(() => {
    if (!editMenu) return;
    const outsideClick = (event: MouseEvent) => {
      if (event.button === 0 && event.target instanceof Node && !editMenuRef.current?.contains(event.target)) {
        setEditMenu(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setEditMenu(null);
      editMenu.anchor.focus();
      if (document.activeElement !== editMenu.anchor) editMenu.anchor.closest<HTMLElement>(".markdown-body")?.focus();
    };
    // Capture also sees clicks elsewhere in the app that stop bubbling.
    document.addEventListener("click", outsideClick, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("click", outsideClick, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [editMenu]);

  useEffect(() => {
    if (overBudget || !hasWorker) return;
    let live = true;
    const owner = ++generation.current;
    let worker: Worker;(globalThis as any).__qaTrace?.('worker-construct',{fileId,owner,length:requestedSource.length});
    try {
      worker = new Worker(new URL("./markdownBudget.worker.ts", import.meta.url), { type: "module" });
    } catch (error) {(globalThis as any).__qaTrace?.('worker-constructor-error',{fileId,owner,error:String(error)});
      setParsed({ fileId, raw: content, content: requestedSource, error: true });
      return;
    }
    const finish = (tree?: Root, metadata?: MetadataResult | null, blocks?: BoundedBlock[]) => {
      (globalThis as any).__qaTrace?.('worker-finish',{fileId,owner,live,tree:Boolean(tree)});if (!live) return;
      clearTimeout(timer);
      worker.terminate();
      setParsed(tree ? { fileId, raw: content, content: requestedSource, tree, metadata, blocks }
        : { fileId, raw: content, content: requestedSource, error: true });
    };
    const timer = setTimeout(() => {(globalThis as any).__qaTrace?.('worker-deadline',{fileId,owner});finish();}, 5_000);
    worker.onmessage = (event: MessageEvent<{ kind: string; tree?: Root;
      metadata?: MetadataResult | null; version: number; generation: number; blocks?: BoundedBlock[] }>) => {
      (globalThis as any).__qaTrace?.('worker-reply',{fileId,owner,kind:event.data.kind,version:event.data.version,generation:event.data.generation});if (event.data.version !== BLOCK_PROTOCOL || event.data.generation !== owner) return;
      finish(event.data.kind === "parsed" ? event.data.tree : undefined, event.data.metadata, event.data.blocks);
    };
    worker.onerror = (event) => {(globalThis as any).__qaTrace?.('worker-error',{fileId,owner,message:event.message,filename:event.filename,line:event.lineno});finish();};
    (globalThis as any).__qaTrace?.('worker-post',{fileId,owner});worker.postMessage({ version: BLOCK_PROTOCOL, generation: owner, source: requestedSource });
    return () => {
      (globalThis as any).__qaTrace?.('worker-cleanup',{fileId,owner});live = false;
      clearTimeout(timer);
      worker.terminate();
    };
  }, [fileId, requestedSource, hasWorker, overBudget]);

  const tree = parsed?.fileId === fileId && parsed.content === parseContent ? parsed.tree : undefined;
  const workerMetadata = parsed?.fileId === fileId && parsed.content === parseContent ? parsed.metadata : undefined;
  const parseFailed = parsed?.fileId === fileId && parsed.content === parseContent && parsed.error;
  const canParseInline = !overBudget && parseContent.length <= 256 * 1024;
  const renderReady = !retaining && !overBudget && (Boolean(tree) || ((!hasWorker) && canParseInline));
  const sourceFallback = overBudget || parseFailed || (!hasWorker && !canParseInline);
  const selectionReady = renderReady || sourceFallback;
  const blocks = useMemo(() => parsed?.fileId === fileId && parsed.content === parseContent && parsed.blocks
    ? parsed.blocks : canParseInline && (!hasWorker)
      ? parseBounded(parseContent).blocks
      : [], [parsed, parseContent, canParseInline, hasWorker, parseFailed]);
  useEffect(() => { setPainted(24); }, [fileId, parseContent]);
  useEffect(() => {
    if (painted >= blocks.length) return;
    const timer = setTimeout(() => setPainted(count => Math.min(count + 24, blocks.length)), 0);
    return () => clearTimeout(timer);
  }, [painted, blocks]);
  const paintedCallback = useRef(onPainted);
  paintedCallback.current = onPainted;
  useLayoutEffect(() => {
    if (renderReady && painted >= blocks.length) paintedCallback.current?.(fileId, content);
  }, [fileId, content, renderReady, painted, blocks.length]);
  const renderedCallback = useRef(onRendered);
  renderedCallback.current = onRendered;
  useLayoutEffect(() => {
    if (!layoutPending && renderReady && painted >= blocks.length) renderedCallback.current?.(fileId, content);
  }, [fileId, content, renderReady, painted, blocks.length, layoutPending, sections]);
  useEffect(() => {
    onSelectionReady?.({ fileId, selectAll: (request = {}) => {
      // Include blocks that incremental painting has not mounted yet. A request
      // during parsing waits for the current document, never the retained tree.
      flushSync(() => {
        setSelectionRequest({ fileId, content, ...request });
        if (selectionReady) setPainted(blocks.length);
      });
    } });
    return () => onSelectionReady?.(null);
  }, [onSelectionReady, fileId, content, selectionReady, blocks.length]);
  useLayoutEffect(() => {
    if (!selectionRequest) return;
    if (selectionRequest.fileId !== fileId || selectionRequest.content !== content || selectionRequest.isCurrent?.() === false
      || document.querySelector('[aria-modal="true"]') || ownsTextInput(document.activeElement, selectionRoot.current)) {
      setSelectionRequest(null); return;
    }
    if (layoutPending || !selectionReady) return;
    if (painted < blocks.length) { setPainted(blocks.length); return; }
    if (selectionRoot.current) {
      if (sourceFallback) {
        const details = selectionRoot.current.closest("details");
        if (details) details.open = true;
      }
      selectDocumentContents(selectionRoot.current);
      selectionRequest.onComplete?.();
    }
    setSelectionRequest(null);
  }, [selectionRequest, fileId, content, selectionReady, sourceFallback, painted, blocks.length, layoutPending]);
  const sectionTree = useMemo(() => tree ?? (canParseInline
    ? parseBounded(parseContent).tree : undefined),
    [tree, canParseInline, parseContent]);
  const metadata = useMemo(() => {
    if (workerMetadata !== undefined) return workerMetadata;
    const first = sectionTree?.children[0] as { type?: string; value?: string } | undefined;
    return first?.type === "yaml" && typeof first.value === "string"
      ? parseFrontmatter(first.value) : null;
  }, [workerMetadata, sectionTree]);
  const sectionMap = useMemo(() => sections && onEditSection
    ? mapRenderedSections(displaySource, sectionTree, retaining ? [] : sections)
    : null, [parseContent, sectionTree, sections, onEditSection, retaining]);
  const editRange = useMemo(() => {
    if (!sectionEditor || !editingSection || editingOriginalSource === undefined) return null;
    const bytes = new TextEncoder().encode(displaySource);
    const { startByte, endByte } = editingSection;
    if (startByte < 0 || endByte < startByte || endByte > bytes.length) return null;
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
      if (decoder.decode(bytes.slice(startByte, endByte)) !== editingOriginalSource) return null;
      const bom = displaySource.startsWith("\uFEFF") ? 1 : 0;
      const from = decoder.decode(bytes.slice(0, startByte)).length - bom;
      const to = decoder.decode(bytes.slice(0, endByte)).length - bom;
      if (blocks.some(block => {
        const node = block.tree.children[0], start = node?.position?.start.offset, end = node?.position?.end.offset;
        return start !== undefined && end !== undefined && start < to && end > from && (start < from || end > to);
      })) return null;
      return { from, to };
    } catch { return null; }
  }, [displaySource, editingSection, editingOriginalSource, Boolean(sectionEditor), blocks]);
  const headingEntries = useMemo(() => collectHeadings(sectionTree), [sectionTree]);
  const headingByOffset = useMemo(() => new Map(headingEntries.map((entry) => [entry.offset, entry])),
    [headingEntries]);
  const currentHeadingEntries = useMemo(() => {
    if (!editRange || editingDraft === undefined) return headingEntries;
    const next = parseContent.slice(0, editRange.from) + editingDraft + parseContent.slice(editRange.to);
    const entries = collectHeadings(parseBounded(next).tree);
    const original = headingEntries.find(entry => entry.offset === editRange.from);
    const delta = editingDraft.length - (editRange.to - editRange.from);
    const reserved = new Set(headingEntries.filter(entry => entry.offset < editRange.from || entry.offset >= editRange.to).map(entry => entry.id));
    if (original) reserved.add(original.id);
    return entries.map(entry => {
      if (entry.offset < editRange.from || entry.offset >= editRange.from + editingDraft.length) {
        const oldOffset = entry.offset < editRange.from ? entry.offset : entry.offset - delta;
        return { ...entry, id: headingByOffset.get(oldOffset)?.id ?? entry.id };
      }
      if (entry.offset === editRange.from && original) return { ...entry, id: original.id };
      const base = headingSlug(entry.label) || "section";
      let id = base, suffix = 0;
      while (reserved.has(id)) id = `${base}-${++suffix}`;
      reserved.add(id);
      return { ...entry, id };
    });
  }, [parseContent, editRange, editingDraft, headingEntries, headingByOffset]);
  useEffect(() => { onHeadings?.(currentHeadingEntries); }, [fileId, currentHeadingEntries]);
  const mountedSectionEditor = isValidElement(sectionEditor) ? cloneElement(sectionEditor as ReactElement<{ headingId?: string; headingIds?: Record<number, string> }>, {
    headingId: headingEntries.find(entry => entry.offset === editRange?.from)?.id,
    headingIds: editRange ? Object.fromEntries(currentHeadingEntries.filter(entry => entry.offset >= editRange.from && entry.offset < editRange.from + (editingDraft?.length ?? 0))
      .map(entry => [entry.offset - editRange.from, entry.id])) : undefined
  }) : sectionEditor;
  const slugCounts = new Map<string, number>();
  const heading = (level: 1 | 2 | 3 | 4 | 5 | 6, children: ReactNode,
    node?: { position?: { start?: { offset?: number } } }) => {
    const base = headingSlug(textOf(children)) || "section";
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const offset = node?.position?.start?.offset;
    const id = (offset === undefined ? undefined : headingByOffset.get(offset)?.id)
      ?? (count ? `${base}-${count}` : base);
    const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    const section = sectionMap?.valid ? sectionMap.at(offset) : undefined;
    const editable = section?.kind === "heading" && sectionMap?.firstOffsets.get(section.id) === offset;
    return <div className="section-heading">
      {createElement(tag, { id }, children)}
      {editable && !retaining && onEditSection && <button type="button" className="section-edit-button"
        data-edit-section={section.id}
        aria-label={t(locale, "editSectionNamed").replace("{section}", section.label || textOf(children))}
        aria-disabled={Boolean(pendingSectionId)} onClick={() => { if (!pendingSectionId) onEditSection(section); }}>{pendingSectionId === section.id && <PreviewLoading inline label={t(locale, "loading")} />}{t(locale, "editSection")}</button>}
    </div>;
  };

  const regionProps = (node: { position?: { start?: { offset?: number } } } | undefined) => {
    const offset = node?.position?.start?.offset;
    const section = sectionMap?.valid ? sectionMap.at(offset) : undefined;
    if (!section) return {};
    const first = sectionMap?.firstOffsets.get(section.id) === offset;
    return {
      "data-section-id": section.id,
      "data-section-active": activeSectionId === section.id ? "true" : undefined,
      tabIndex: first ? 0 : undefined,
      "aria-label": first ? t(locale, "editSection") + ": "
        + (section.label || t(locale, section.kind === "whole" ? "wholeDocument" : "beforeFirstHeading"))
        : undefined
    };
  };

  const openSectionMenu = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    if (!onEditSection) return;
    const target = event.target as HTMLElement;
    if (editMenuRef.current?.contains(target)) return;
    const anchor = target.closest<HTMLElement>("[data-section-id]");
    const focusTarget = anchor ?? event.currentTarget;
    const bounds = focusTarget.getBoundingClientRect();
    const x = "clientX" in event ? event.clientX : bounds.left;
    const y = "clientY" in event ? event.clientY : bounds.bottom;
    if (!sectionMap?.valid || !sections?.length) {
      event.preventDefault();
      setEditMenu({ reason: !sections ? t(locale, "checking") : t(locale, "sectionChanged"),
        x, y, anchor: focusTarget });
      return;
    }
    const sectionId = anchor?.dataset.sectionId;
    const section = sections.find((candidate) => candidate.id === sectionId)
      ?? (sections.length === 1 ? sections[0] : undefined);
    if (!section) return;
    event.preventDefault();
    setEditMenu({ section, x, y, anchor: focusTarget });
  };

  // Stable renderer types retain DOM/focus when recovery or shell state updates.
  const rendering = useRef({ heading, regionProps, onNavigate, parseContent, fileId, locale });
  rendering.current = { heading, regionProps, onNavigate, parseContent, fileId, locale };
  const components = useMemo<Components>(() => ({
          h1: ({ children, node }) => <div {...rendering.current.regionProps(node)}>{rendering.current.heading(1, children, node)}</div>,
          h2: ({ children, node }) => <div {...rendering.current.regionProps(node)}>{rendering.current.heading(2, children, node)}</div>,
          h3: ({ children, node }) => <div {...rendering.current.regionProps(node)}>{rendering.current.heading(3, children, node)}</div>,
          h4: ({ children, node }) => <div {...rendering.current.regionProps(node)}>{rendering.current.heading(4, children, node)}</div>,
          h5: ({ children, node }) => <div {...rendering.current.regionProps(node)}>{rendering.current.heading(5, children, node)}</div>,
          h6: ({ children, node }) => <div {...rendering.current.regionProps(node)}>{rendering.current.heading(6, children, node)}</div>,
          p: ({ children, node }) => <p {...rendering.current.regionProps(node)}>{children}</p>,
          ul: ({ children, node }) => <ul {...rendering.current.regionProps(node)}>{children}</ul>,
          ol: ({ children, node }) => <ol {...rendering.current.regionProps(node)}>{children}</ol>,
          blockquote: ({ children, node }) => <blockquote {...rendering.current.regionProps(node)}>{children}</blockquote>,
          pre: ({ children, node }) => {
            const { parseContent, locale } = rendering.current;
            const code = (node as { children?: Array<{ properties?: { className?: unknown } }> })
              ?.children?.[0];
            const classes = code?.properties?.className;
            const language = Array.isArray(classes)
              ? classes.find((value): value is string => typeof value === "string"
                && value.startsWith("language-"))?.slice(9) ?? "" : "";
            const source = textOf(children);
            const position = node?.position;
            const copySource = fencedSource(parseContent, position?.start?.offset, position?.end?.offset, source);
            return <div {...rendering.current.regionProps(node)}>{language.toLowerCase() === "mermaid"
              ? <DiagramBlock source={source} copySource={copySource} locale={locale} />
              : <CodeBlock source={source} copySource={copySource} language={language} locale={locale} />}</div>;
          },
          table: ({ children, node }) => <table {...rendering.current.regionProps(node)}>{children}</table>,
          a: ({ href, children, id }) => (
            <button
              type="button"
              className="document-link" id={id}
              onClick={() => href && rendering.current.onNavigate(href)}
              title={href ?? undefined}
            >
              {children}
            </button>
          ),
          img: ({ src, alt }) => <SafeImage sourceId={rendering.current.fileId} target={src ?? ""} alt={alt ?? ""} locale={rendering.current.locale} />,
          input: ({ checked }) => <input type="checkbox" checked={Boolean(checked)} disabled readOnly aria-label={t(rendering.current.locale, "task")} />,
          code: ({ children, className }) => <code className={className}>{children}</code>
  }), []);

  if (sourceFallback) {
    return <div className="error-state" role="alert">
      <h1>{t(locale, "renderBudget")}</h1><details><summary>{t(locale, "blockSource")}</summary><pre ref={node => { selectionRoot.current = node; }} className="document-selection-root" tabIndex={-1}>{content}</pre></details>
    </div>;
  }
  if (hasWorker && !tree && !parseFailed) return <PreviewLoading label={t(locale, "loading")} />;
  return (
    <RenderBoundary key={fileId} locale={locale} source={displaySource}>
    <article ref={setSelectionRoot} className="markdown-body document-selection-root" tabIndex={onEditSection && !sectionMap?.valid ? 0 : -1}
      onContextMenu={openSectionMenu} onKeyDown={(event) => {
      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) openSectionMenu(event);
    }}>
      {pendingSectionId && sections?.some(section => section.id === pendingSectionId && section.kind !== "heading") && <PreviewLoading inline label={t(locale, "loading")} />}
      {metadata && !(sectionEditor && editRange?.from === 0) && <details className="markdown-metadata">
        <summary>{t(locale, "metadata")}{metadata.status === "invalid"
          ? ` · ${t(locale, "invalidMetadata")}` : ""}</summary>
        {metadata.status === "valid" && metadata.entries.length > 0 && <dl>
          {metadata.entries.map((entry, index) => <div key={`${entry.key}:${index}`}>
            <dt>{entry.key}</dt><dd>{entry.value}</dd>
          </div>)}
        </dl>}
        {metadata.status === "invalid" && <p role="status">{t(locale, "invalidMetadata")}</p>}
        <details><summary>{t(locale, "metadataSource")}</summary><pre>{metadata.source}</pre></details>
      </details>}
      {editOverlay.shown && createPortal(<div ref={editMenuRef} className="context-menu section-context-menu" role="menu"
        data-closing={editOverlay.closing} inert={editOverlay.closing}
        aria-hidden={editOverlay.closing}
        style={{ left: editOverlay.shown.x, top: editOverlay.shown.y }}>
        <button role="menuitem" type="button" autoFocus disabled={!editMenu?.section} onClick={() => {
          if (editMenu?.section) onEditSection?.(editMenu.section);
          setEditMenu(null);
        }}>{t(locale, "editSection")}</button>
        {editOverlay.shown.reason && <div className="context-menu-reason">{editOverlay.shown.reason}</div>}
      </div>, document.body)}
      {sectionEditor && !editRange && <p role="alert">{t(locale, "sectionChanged")}</p>}
      {blocks.length === 0 && editRange && mountedSectionEditor}
      {blocks.slice(0, painted).map((block, index) => {
        const offset = block.tree.children[0]?.position?.start.offset;
        if (sectionEditor && editRange && offset !== undefined && offset >= editRange.from && offset < editRange.to) {
          const first = blocks.findIndex(candidate => { const at = candidate.tree.children[0]?.position?.start.offset; return at !== undefined && at >= editRange.from && at < editRange.to; });
          return index === first ? <div key={`editing-${activeSectionId}`} data-section-id={activeSectionId}>{mountedSectionEditor}</div> : null;
        }
        const plugin: Plugin = function () { this.parser = () => block.tree; };
        return <RenderBoundary key={index} locale={locale} source={block.source}>
          {block.fallback ? <div role="alert"><p>{t(locale, "renderBudget")}</p><details><summary>{t(locale, "blockSource")}</summary><pre>{block.source}</pre></details></div>
            : <Markdown remarkPlugins={[remarkGfm, remarkFrontmatter, plugin]} components={components}>{block.source}</Markdown>}
        </RenderBoundary>;
      })}
      {editRange && editRange.from === editRange.to && blocks.length > 0 && mountedSectionEditor}
      {(retaining || painted < blocks.length) && <PreviewLoading label={t(locale, "loading")} />}
    </article>
    </RenderBoundary>
  );
}
