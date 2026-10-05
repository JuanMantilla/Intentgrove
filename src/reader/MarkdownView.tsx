import { Component, createElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";
import type { Plugin } from "unified";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import { api, type SectionDescriptor } from "../app/api";
import { t, type Locale } from "../app/i18n";
import { useRetainedOverlay } from "../app/useRetainedOverlay";
import { mapRenderedSections } from "./sectionMap";
import { parseFrontmatter, type MetadataResult } from "./frontmatter";
import { collectHeadings, headingSlug, type HeadingEntry } from "./heading-model";
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

class RenderBoundary extends Component<{ children: ReactNode; locale: Locale }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div className="error-state" role="alert"><h1>{t(this.props.locale, "renderBudget")}</h1></div>;
    }
    return this.props.children;
  }
}

function SafeImage({ sourceId, target, alt, locale }: {
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
  if (!url) return <span className="image-placeholder">{t(locale, "imageLoading")}</span>;
  return <img src={url} alt={alt} loading="lazy" onError={() => setError(true)} />;
}

export default function MarkdownView({ content, fileId, locale, onNavigate, sections, activeSectionId,
  onEditSection, findRootRef, onHeadings, onRendered }: {
  content: string;
  fileId: string;
  locale: Locale;
  onNavigate: (target: string) => void;
  sections?: SectionDescriptor[];
  activeSectionId?: string;
  onEditSection?: (section: SectionDescriptor) => void;
  findRootRef?: Ref<HTMLElement>;
  onHeadings?: (entries: HeadingEntry[]) => void;
  onRendered?: (fileId: string, content: string) => void;
}) {
  const parseContent = content.startsWith("\uFEFF") ? content.slice(1) : content;
  const overBudget = useMemo(() => exceedsRenderBudget(parseContent), [parseContent]);
  const hasWorker = typeof Worker !== "undefined";
  const [parsed, setParsed] = useState<{ content: string; tree?: Root;
    metadata?: MetadataResult | null; error?: boolean } | null>(null);
  const [editMenu, setEditMenu] = useState<{
    section?: SectionDescriptor; reason?: string; x: number; y: number; anchor: HTMLElement
  } | null>(null);
  const editOverlay = useRetainedOverlay(editMenu, 90);

  useEffect(() => {
    if (overBudget || !hasWorker) return;
    let live = true;
    let worker: Worker;
    setParsed(null);
    try {
      worker = new Worker(new URL("./markdownBudget.worker.ts", import.meta.url), { type: "module" });
    } catch {
      setParsed({ content: parseContent, error: true });
      return;
    }
    const finish = (tree?: Root, metadata?: MetadataResult | null) => {
      if (!live) return;
      clearTimeout(timer);
      worker.terminate();
      setParsed(tree ? { content: parseContent, tree, metadata }
        : { content: parseContent, error: true });
    };
    const timer = setTimeout(() => finish(), 5_000);
    worker.onmessage = (event: MessageEvent<{ kind: string; tree?: Root;
      metadata?: MetadataResult | null }>) =>
      finish(event.data.kind === "parsed" ? event.data.tree : undefined, event.data.metadata);
    worker.onerror = () => finish();
    worker.postMessage(parseContent);
    return () => {
      live = false;
      clearTimeout(timer);
      worker.terminate();
    };
  }, [parseContent, hasWorker, overBudget]);

  const tree = parsed?.content === parseContent ? parsed.tree : undefined;
  const workerMetadata = parsed?.content === parseContent ? parsed.metadata : undefined;
  const parseFailed = parsed?.content === parseContent && parsed.error;
  const canParseInline = !overBudget && parseContent.length <= 256 * 1024;
  const renderReady = !overBudget && (Boolean(tree) || ((!hasWorker || parseFailed) && canParseInline));
  const renderedCallback = useRef(onRendered);
  renderedCallback.current = onRendered;
  useLayoutEffect(() => {
    if (renderReady) renderedCallback.current?.(fileId, content);
  }, [fileId, content, renderReady]);
  const sectionTree = useMemo(() => tree ?? (canParseInline
    ? unified().use(remarkParse).use(remarkFrontmatter).parse(parseContent) as Root : undefined),
    [tree, canParseInline, parseContent]);
  const metadata = useMemo(() => {
    if (workerMetadata !== undefined) return workerMetadata;
    const first = sectionTree?.children[0] as { type?: string; value?: string } | undefined;
    return first?.type === "yaml" && typeof first.value === "string"
      ? parseFrontmatter(first.value) : null;
  }, [workerMetadata, sectionTree]);
  const sectionMap = useMemo(() => sections && onEditSection
    ? mapRenderedSections(content, sectionTree, sections)
    : null, [parseContent, sectionTree, sections, onEditSection]);
  const headingEntries = useMemo(() => collectHeadings(sectionTree), [sectionTree]);
  const headingByOffset = useMemo(() => new Map(headingEntries.map((entry) => [entry.offset, entry])),
    [headingEntries]);
  useEffect(() => { onHeadings?.(headingEntries); }, [fileId, headingEntries]);
  const parsedPlugin = useMemo(() => {
    if (!tree) return null;
    const plugin: Plugin = function () { this.parser = () => tree; };
    return plugin;
  }, [tree]);

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
      {editable && onEditSection && <button type="button" className="section-edit-button"
        data-edit-section={section.id}
        aria-label={t(locale, "editSectionNamed").replace("{section}", section.label || textOf(children))}
        onClick={() => onEditSection(section)}>{t(locale, "editSection")}</button>}
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
    const anchor = target.closest<HTMLElement>("[data-section-id]");
    const focusTarget = anchor ?? event.currentTarget;
    const bounds = focusTarget.getBoundingClientRect();
    const x = "clientX" in event && event.clientX ? event.clientX : bounds.left;
    const y = "clientY" in event && event.clientY ? event.clientY : bounds.bottom;
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
  const rendering = useRef({ heading, regionProps, onNavigate });
  rendering.current = { heading, regionProps, onNavigate };
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
            const code = (node as { children?: Array<{ properties?: { className?: unknown } }> })
              ?.children?.[0];
            const classes = code?.properties?.className;
            const language = Array.isArray(classes)
              ? classes.find((value): value is string => typeof value === "string"
                && value.startsWith("language-"))?.slice(9) ?? "" : "";
            const source = textOf(children);
            const position = node?.position;
            return <div {...rendering.current.regionProps(node)}><CodeBlock source={source}
              copySource={fencedSource(parseContent, position?.start?.offset,
                position?.end?.offset, source)} language={language} locale={locale} /></div>;
          },
          table: ({ children, node }) => <table {...rendering.current.regionProps(node)}>{children}</table>,
          a: ({ href, children }) => (
            <button
              type="button"
              className="document-link"
              onClick={() => href && rendering.current.onNavigate(href)}
              title={href ?? undefined}
            >
              {children}
            </button>
          ),
          img: ({ src, alt }) => <SafeImage sourceId={fileId} target={src ?? ""} alt={alt ?? ""} locale={locale} />,
          input: ({ checked }) => <input type="checkbox" checked={Boolean(checked)} disabled readOnly aria-label={t(locale, "task")} />,
          code: ({ children, className }) => <code className={className}>{children}</code>
  }), [parseContent, fileId, locale]);

  if (overBudget || ((parseFailed || !hasWorker) && !canParseInline)) {
    return <div className="error-state" role="alert">
      <h1>{t(locale, "renderBudget")}</h1>
    </div>;
  }
  if (hasWorker && !tree && !parseFailed) return <p role="status">{t(locale, "loading")}</p>;
  return (
    <RenderBoundary key={`${fileId}:${content.length}`} locale={locale}>
    <article ref={findRootRef} className="markdown-body" tabIndex={onEditSection && !sectionMap?.valid ? 0 : -1}
      onContextMenu={openSectionMenu} onKeyDown={(event) => {
      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) openSectionMenu(event);
      if (event.key === "Escape" && editMenu) {
        event.preventDefault();
        event.stopPropagation();
        setEditMenu(null);
        editMenu.anchor.focus();
        if (document.activeElement !== editMenu.anchor) event.currentTarget.focus();
      }
    }}>
      {metadata && <details className="markdown-metadata">
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
      {editOverlay.shown && <div className="context-menu" role="menu"
        data-closing={editOverlay.closing} inert={editOverlay.closing}
        aria-hidden={editOverlay.closing}
        style={{ left: editOverlay.shown.x, top: editOverlay.shown.y }}>
        <button role="menuitem" type="button" autoFocus disabled={!editMenu?.section} onClick={() => {
          if (editMenu?.section) onEditSection?.(editMenu.section);
          setEditMenu(null);
        }}>{t(locale, "editSection")}</button>
        {editOverlay.shown.reason && <div className="context-menu-reason">{editOverlay.shown.reason}</div>}
      </div>}
      <Markdown
        remarkPlugins={parsedPlugin ? [remarkGfm, remarkFrontmatter, parsedPlugin]
          : [remarkGfm, remarkFrontmatter]}
        components={components}
      >
        {parseContent}
      </Markdown>
    </article>
    </RenderBoundary>
  );
}
