import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorState, Transaction, type Extension } from "@codemirror/state";
import { history, historyField, undo, redo, undoDepth, redoDepth, isolateHistory } from "@codemirror/commands";
import MarkdownView, { SafeImage } from "./MarkdownView";
import { richModel, replaceLeaf, paragraphBreak, joinAtBoundary, indentListItem, changeTable, inlineProperties, createLink, blockFormat, codeLanguage, type TableOperation, type RichNode, type RichLeaf, type SourcePatch } from "./rich-source";
import { t, type Locale } from "../app/i18n";
import { domPoint, textOffset } from "./rich-dom";
import ActionMenu, { type MenuAction } from "../app/ActionMenu";
import { RichCodeText } from "./RichCodeText";
import { replaceSelection, headingLevel, selectionText } from "./rich-selection";
import type { DraftFindAdapter, EditorCommandState, RichCommand } from "./SectionEditor";

interface RichRange { leaf: RichLeaf; last: RichLeaf; start: number; end: number; element: HTMLElement; anchor: number; head: number }

export interface RichSectionProps {
  sessionId: string; fileId: string; label: string; headingId?: string; headingIds?: Record<number, string>; initialDraft: string; initialEditorJson?: unknown;
  lineSeparator: string; locale: Locale; saving?: boolean;
  onChange: (source: string) => void;
  onCheckpoint: (source: string, json: unknown, top: number, left: number) => void;
  onFindReady?: (adapter: DraftFindAdapter | null) => void;
  onCommandState?: (state: EditorCommandState) => void;
}
/** Retain schema-1 CodeMirror source history behind the rendered document. */
export function restoreSourceState(draft: string, json: unknown, eol: string): EditorState {
  const extensions: Extension[] = [history(), EditorState.lineSeparator.of(eol)];
  if (json === undefined || json === null) return EditorState.create({ doc: draft, extensions });
  const state = EditorState.fromJSON(json as object, { extensions }, { history: historyField });
  if (state.doc.toString() !== draft) throw new Error("Recovery text mismatch");
  return state;
}
export default function RichSection(props: RichSectionProps) {
  const current = useRef(props); current.current = props;
  // Raw offsets and CodeMirror coordinates agree only for the verified LF path.
  // Preserve deferred EOL drafts/checkpoints without entering a normalized engine.
  const unsupportedEol = props.lineSeparator !== "\n";
  const root = useRef<HTMLDivElement>(null);
  const browserInput = useRef<{ leaf: RichLeaf; element: HTMLElement } | null>(null);
  const composition = useRef<{ leaf: RichLeaf; element: HTMLElement; value: string; range?: RichRange; text?: string; blocked?: boolean } | null>(null);
  const [loaded] = useState(() => {
    if (unsupportedEol) return { state: EditorState.create({ doc: "" }), error: false };
    try { return { state: restoreSourceState(props.initialDraft, props.initialEditorJson, props.lineSeparator), error: false }; }
    catch { return { state: EditorState.create({ doc: props.initialDraft }), error: true }; }
  });
  const stateRef = useRef(loaded.state);
  const [state, setState] = useState(loaded.state);
  const [announcement, setAnnouncement] = useState("");
  const [reason, setReason] = useState(loaded.error ? "richRecoveryBlocked" : "");
  const [selection, setSelection] = useState<RichRange | null>(null);
  const [blockTarget, setBlockTarget] = useState<RichLeaf | null>(null);
  const [compositionRevision, setCompositionRevision] = useState(0);
  const [tableTarget, setTableTarget] = useState<RichLeaf | null>(null);
  const [contextMenu, setContextMenu] = useState<{ anchor: HTMLElement; x: number; y: number; selected: RichRange } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const alive = useRef(true);
  const structureTabEscape = useRef(false);
  const commands = useRef<{ run: (command: RichCommand) => void; publish: () => void }>({ run: () => {}, publish: () => {} });
  const [languageTarget, setLanguageTarget] = useState<{ node: RichNode; value: string } | null>(null);
  const [properties, setProperties] = useState<{ node: RichNode; label: string; url: string; title: string; creating?: { leaf: RichLeaf; start: number; end: number } } | null>(null);
  const openProperties = (node: RichNode) => {
    const text = (part: RichNode): string => part.value ?? part.children?.map(text).join("") ?? "";
    if (node.type === "link" || node.type === "image") setProperties({ node, label: node.type === "image" ? node.alt ?? "" : text(node), url: node.url, title: node.title ?? "" });
    else setReason("richOperationBlocked");
  };
  const source = unsupportedEol ? props.initialDraft : state.doc.toString();
  const model = useMemo(() => richModel(source, state.selection.main.head), [source, state.selection.main.head]);
  const latestModel = useRef(model); latestModel.current = model;
  const pendingFocus = useRef(!loaded.error);
  const editable = !unsupportedEol && !loaded.error && !props.saving && !model.blocked;
  const scroll = () => root.current?.closest<HTMLElement>(".reader-scroll") ?? root.current?.closest<HTMLElement>(".reader-content");
  const checkpoint = () => {
    if (loaded.error || unsupportedEol) return;
    const state = stateRef.current, surface = scroll();
    current.current.onCheckpoint(state.doc.toString(), state.toJSON({ history: historyField }), surface?.scrollTop ?? 0, surface?.scrollLeft ?? 0);
  };
  function dispatch(transaction: Transaction) {
    stateRef.current = transaction.state;
    setState(transaction.state);
    if (transaction.docChanged) {
      setSelection(null); setBlockTarget(null); setContextMenu(null); setTableTarget(null); setProperties(null); setLanguageTarget(null);
      current.current.onChange(transaction.state.doc.toString());
    }
    checkpoint();
  }
  function apply(patch: SourcePatch, event = "input") {
    if (!editable || current.current.saving || !alive.current || composition.current) return;
    pendingFocus.current = true;
    setReason(""); setSelection(null); setBlockTarget(null); setContextMenu(null); setTableTarget(null); setProperties(null); setLanguageTarget(null);
    dispatch(stateRef.current.update({ changes: patch, selection: { anchor: patch.caret },
      annotations: [Transaction.userEvent.of(event), isolateHistory.of("full")] }));
  }
  function historyCommand(command: typeof undo) {
    if (!editable || composition.current) return;
    pendingFocus.current = true; setSelection(null);
    command({ state: stateRef.current, dispatch });
  }
  function range() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !root.current?.contains(selection.anchorNode) || !root.current.contains(selection.focusNode)) return null;
    const anchor = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode as HTMLElement : selection.anchorNode?.parentElement;
    const focus = selection.focusNode?.nodeType === Node.ELEMENT_NODE ? selection.focusNode as HTMLElement : selection.focusNode?.parentElement;
    const a = anchor?.closest<HTMLElement>("[data-rich-leaf]"), b = focus?.closest<HTMLElement>("[data-rich-leaf]");
    if (!a || !b) return null;
    const first = model.leaves[Number(a.dataset.richLeaf)], last = model.leaves[Number(b.dataset.richLeaf)];
    if (!first || !last) return null;
    const offset = textOffset;
    const anchorOffset = offset(a, selection.anchorNode!, selection.anchorOffset), focusOffset = offset(b, selection.focusNode!, selection.focusOffset);
    const backwards = first.offsets[anchorOffset] > last.offsets[focusOffset];
    return { leaf: backwards ? last : first, last: backwards ? first : last,
      start: backwards ? focusOffset : anchorOffset, end: backwards ? anchorOffset : focusOffset,
      element: backwards ? b : a, anchor: first.offsets[anchorOffset], head: last.offsets[focusOffset] };
  }
  function replaceRange(selected: NonNullable<ReturnType<typeof range>>, value: string) {
    return replaceSelection(source, model, { leaf: selected.leaf, offset: selected.start },
      { leaf: selected.last, offset: selected.end }, value, props.lineSeparator);
  }

  useLayoutEffect(() => {
    if (!pendingFocus.current || !editable) return;
    pendingFocus.current = false;
    const anchor = state.selection.main.anchor, head = state.selection.main.head;
    const locate = (pos: number) => {
      let best: { leaf: RichLeaf; index: number; offset: number; distance: number } | null = null;
      model.leaves.forEach((leaf, index) => leaf.offsets.forEach((offset, at) => {
        const distance = Math.abs(offset - pos);
        if (!best || distance < best.distance) best = { leaf, index, offset: at, distance };
      }));
      return best as { leaf: RichLeaf; index: number; offset: number; distance: number } | null;
    };
    const a = locate(anchor), h = locate(head);
    if (!a || !h) return;
    const element = root.current?.querySelector<HTMLElement>(`[data-rich-leaf="${a.index}"]`);
    const end = root.current?.querySelector<HTMLElement>(`[data-rich-leaf="${h.index}"]`);
    if (!element || !end) return;
    element.focus({ preventScroll: true });
    window.getSelection()?.setBaseAndExtent(...domPoint(element, a.offset), ...domPoint(end, h.offset));
  }, [state, editable, model, compositionRevision]);
  useEffect(() => {
    (globalThis as any).__fc?.event(17,props.fileId,props.sessionId);
    alive.current = true;
    if (!loaded.error && !unsupportedEol) checkpoint();
    const surface = scroll();
    const dismiss = () => { setSelection(null); setBlockTarget(null); setContextMenu(null); setTableTarget(null); setProperties(null); setLanguageTarget(null); };
    const capture = () => { checkpoint(); dismiss(); };
    surface?.addEventListener("scroll", capture);
    window.addEventListener("blur", dismiss);
    const publish = () => { queueMicrotask(() => commands.current.publish()); };
    document.addEventListener("focusin", publish); document.addEventListener("focusout", publish); window.addEventListener("focus", publish);
    current.current.onFindReady?.({
      command: command => commands.current.run(command),
      focus: () => { pendingFocus.current = true; setState(stateRef.current.update({}).state); },
      reveal: (span, options) => {
        // Automatic Find revelation scrolls and updates the source selection
        // without replacing the query input's keyboard/DOM selection owner.
        pendingFocus.current = options?.focus !== false;
        dispatch(stateRef.current.update({ selection: { anchor: span.start, head: span.end } }));
        const leaf = latestModel.current.leaves.findIndex(leaf => span.start >= leaf.from && span.start <= leaf.to);
        root.current?.querySelector(`[data-rich-leaf="${leaf}"]`)?.scrollIntoView?.({ block: "center" });
      }
    });
    return () => { (globalThis as any).__fc?.event(18,props.fileId,props.sessionId); alive.current = false; surface?.removeEventListener("scroll", capture); window.removeEventListener("blur", dismiss); current.current.onFindReady?.(null);
      document.removeEventListener("focusin", publish); document.removeEventListener("focusout", publish); window.removeEventListener("focus", publish);
      current.current.onCommandState?.({ owner: false, undo: false, redo: false, selection: false }); };
  }, []);
  useEffect(() => {
    const changed = () => {
      if (composition.current) return;
      const selected = range();
      setSelection(selected && selected.anchor !== selected.head ? selected : null);
      setBlockTarget(selected?.leaf ?? null);
      setTableTarget(selected?.leaf.ancestors.some(n => n.type === "tableCell") ? selected.leaf : null);
      if (selected && editable) {
        const { anchor, head } = selected;
        if (anchor !== undefined && head !== undefined && (stateRef.current.selection.main.anchor !== anchor || stateRef.current.selection.main.head !== head))
          dispatch(stateRef.current.update({ selection: { anchor, head }, annotations: Transaction.addToHistory.of(false) }));
      }
    };
    document.addEventListener("selectionchange", changed);
    return () => document.removeEventListener("selectionchange", changed);
  }, [model, editable]);
  const attempt = (fn: () => SourcePatch) => { try { apply(fn()); } catch (error) { setReason(error instanceof Error && error.message === "whole-table removal requires confirmation" ? "richTableRemovalBlocked" : "richOperationBlocked"); } };
  function reconcileText(leaf: RichLeaf, element: HTMLElement) {
    const next = element.textContent ?? "", previous = leaf.value;
    let start = 0, oldEnd = previous.length, newEnd = next.length;
    while (start < oldEnd && start < newEnd && previous[start] === next[start]) start++;
    while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) { oldEnd--; newEnd--; }
    if (start > 0 && /[\uD800-\uDBFF]/.test(previous[start - 1]) && /[\uDC00-\uDFFF]/.test(previous[start] ?? "")) start--;
    if (oldEnd > 0 && /[\uD800-\uDBFF]/.test(previous[oldEnd - 1]) && /[\uDC00-\uDFFF]/.test(previous[oldEnd] ?? "")) { oldEnd++; newEnd++; }
    if (next !== previous) attempt(() => replaceLeaf(source, leaf, start, oldEnd, next.slice(start, newEnd), props.lineSeparator));
    pendingFocus.current = true; setCompositionRevision(n => n + 1);
  }
  function finishComposition(text?: string) {
    const composed = composition.current; composition.current = null;
    if (!composed) return;
    if (composed.range) {
      if (!composed.blocked && text) attempt(() => replaceRange(composed.range!, text));
      pendingFocus.current = true; setCompositionRevision(n => n + 1);
    } else reconcileText(composed.leaf, composed.element);
    queueMicrotask(() => commands.current.publish());
  }
  function format(marker: string, selected = range()) {
    if (!selected || selected.leaf !== selected.last) { setReason("richOperationBlocked"); return; }
    const { leaf, start, end } = selected, from = leaf.offsets[start], to = leaf.offsets[end];
    if (start === end || leaf.node.type !== "text" || /[\r\n`]/.test(source.slice(from, to))) { setReason("richOperationBlocked"); return; }
    apply({ from, to, insert: marker + source.slice(from, to) + marker, caret: from + marker.length + to - from }, "input.format");
  }
  const ownsFocus = () => {
    const focused = document.activeElement as HTMLElement | null;
    return Boolean(focused && !focused.matches("input, textarea, select")
      && (root.current?.closest(".section-editor") ?? root.current)?.contains(focused));
  };
  const savedRange = () => {
    const direct = range(); if (direct) return direct;
    const { anchor, head } = stateRef.current.selection.main;
    const locate = (pos: number) => model.leaves.find(leaf => leaf.offsets.includes(pos));
    const leaf = locate(Math.min(anchor, head)), last = locate(Math.max(anchor, head));
    if (!leaf || !last) return null;
    const element = root.current?.querySelector<HTMLElement>(`[data-rich-leaf="${model.leaves.indexOf(leaf)}"]`);
    if (!element) return null;
    return { leaf, last, element, start: leaf.offsets.indexOf(Math.min(anchor, head)), end: last.offsets.indexOf(Math.max(anchor, head)), anchor, head };
  };
  commands.current = {
    publish: () => {
      const owner = editable && ownsFocus() && !composition.current;
      const selected = savedRange();
      current.current.onCommandState?.({ owner, undo: owner && undoDepth(stateRef.current) > 0, redo: owner && redoDepth(stateRef.current) > 0,
        selection: owner && Boolean(selected && selected.leaf === selected.last && selected.start !== selected.end && selected.leaf.node.type === "text") });
    },
    run: command => {
      if (!editable || !ownsFocus() || composition.current) return;
      if (command === "undo" || command === "redo") { historyCommand(command === "undo" ? undo : redo); return; }
      const selected = savedRange();
      if (!selected || selected.leaf !== selected.last || selected.start === selected.end) return;
      if (command === "link") { setProperties({ node: selected.leaf.node, label: selected.leaf.value.slice(selected.start, selected.end), url: "", title: "", creating: selected }); return; }
      format(command === "bold" ? "**" : command === "italic" ? "*" : "`", selected);
    }
  };
  useEffect(() => { commands.current.publish(); }, [state, editable, selection, blockTarget]);
  const plainSelection = (selected: RichRange) => selectionText(model, { leaf: selected.leaf, offset: selected.start }, { leaf: selected.last, offset: selected.end });
  const restoreSelection = () => { pendingFocus.current = true; setState(stateRef.current.update({}).state); };
  const clipboardAction = async (kind: "copy" | "cut" | "paste", selected: RichRange) => {
    const original = stateRef.current.doc.toString();
    try {
      if (kind === "paste") {
        if (!navigator.clipboard?.readText) throw new Error("clipboard unavailable");
        const value = await navigator.clipboard.readText();
        if (!alive.current || current.current.saving || stateRef.current.doc.toString() !== original) return;
        apply(replaceRange(selected, value), "input.paste");
      } else {
        const patch = kind === "cut" ? replaceRange(selected, "") : null;
        if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(plainSelection(selected));
        if (patch && alive.current && !current.current.saving && stateRef.current.doc.toString() === original) apply(patch, "delete.cut");
        else if (kind === "copy") restoreSelection();
      }
    } catch (error) { setReason(error instanceof Error && error.message === "whole-table removal requires confirmation" ? "richTableRemovalBlocked" : "richClipboardFailed"); }
  };
  const openContext = (target: HTMLElement, x: number, y: number) => {
    const selected = savedRange();
    if (!selected || !editable || composition.current) return;
    dispatch(stateRef.current.update({ selection: { anchor: selected.anchor, head: selected.head }, annotations: Transaction.addToHistory.of(false) }));
    setContextMenu({ anchor: target, x, y, selected });
  };
  const contextActions = (): MenuAction[] => {
    if (!contextMenu) return [];
    const selected = contextMenu.selected, single = selected.leaf === selected.last && selected.start !== selected.end;
    const actions: MenuAction[] = (["cut", "copy", "paste"] as const).map(kind => ({ label: t(props.locale, kind === "cut" ? "richCut" : kind === "copy" ? "richCopy" : "richPaste"),
      disabled: kind !== "paste" && selected.anchor === selected.head, run: () => { void clipboardAction(kind, selected); } }));
    for (const [label, marker] of [["richBold", "**"], ["richItalic", "*"], ["richCode", "`"]] as const)
      actions.push({ label: t(props.locale, label), disabled: !single, run: () => format(marker, selected) });
    actions.push({ label: t(props.locale, "richLink"), disabled: !single, run: () => setProperties({ node: selected.leaf.node,
      label: plainSelection(selected), url: "", title: "", creating: selected }) });
    actions.push({ label: t(props.locale, "richMore"), run: () => { setBlockTarget(selected.leaf); setSelection(single ? selected : null); setMoreOpen(true); } });
    if (selected.leaf.ancestors.some(n => n.type === "tableCell")) for (const operation of ["rowAbove", "rowBelow", "columnBefore", "columnAfter", "deleteRow", "deleteColumn"] as TableOperation[])
      actions.push({ label: t(props.locale, operation), run: () => attempt(() => changeTable(source, selected.leaf, operation, props.lineSeparator)) });
    return actions;
  };
  function input(event: InputEvent) {
    if (event.isComposing || composition.current) return;
    if (!event.cancelable) {
      const selected = range(); browserInput.current = selected && selected.leaf === selected.last ? { leaf: selected.leaf, element: selected.element } : null;
      return;
    }
    event.preventDefault();
    if (!editable) return;
    if (event.inputType === "historyUndo") { historyCommand(undo); return; }
    if (event.inputType === "historyRedo") { historyCommand(redo); return; }
    const selected = range();
    if (!selected) { setReason("richOperationBlocked"); return; }
    if (selected.leaf !== selected.last) {
      if (event.inputType.startsWith("delete")) attempt(() => replaceRange(selected, ""));
      else if (["insertText", "insertReplacementText"].includes(event.inputType)) attempt(() => replaceRange(selected, event.data ?? ""));
      else setReason("richOperationBlocked");
      return;
    }
    let { start, end } = selected;
    const { leaf } = selected;
    if (event.inputType === "insertParagraph" || event.inputType === "insertLineBreak") {
      attempt(() => paragraphBreak(source, leaf, start, end, props.lineSeparator, event.inputType === "insertLineBreak")); return;
    }
    if (event.inputType.startsWith("delete")) {
      if (start === end) {
        if (event.inputType === "deleteContentBackward" && start > 0) start -= /[\uDC00-\uDFFF]/.test(leaf.value[start - 1]) ? 2 : 1;
        else if (event.inputType === "deleteContentForward" && end < leaf.value.length) end += /[\uD800-\uDBFF]/.test(leaf.value[end]) ? 2 : 1;
        else if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
          const backwards = event.inputType === "deleteContentBackward";
          const adjacent = model.leaves[model.leaves.indexOf(leaf) + (backwards ? -1 : 1)];
          const block = (value: RichLeaf) => [...value.ancestors].reverse().find(n => ["paragraph", "heading", "tableCell"].includes(n.type));
          if (adjacent && adjacent.value.length && block(adjacent) === block(leaf)) {
            const length = adjacent.value.length;
            const point = backwards ? length - (/[\uDC00-\uDFFF]/.test(adjacent.value[length - 1]) ? 2 : 1)
              : (/[\uD800-\uDBFF]/.test(adjacent.value[0]) ? 2 : 1);
            attempt(() => backwards
              ? replaceSelection(source, model, { leaf: adjacent, offset: point }, { leaf, offset: 0 }, "", props.lineSeparator)
              : replaceSelection(source, model, { leaf, offset: leaf.value.length }, { leaf: adjacent, offset: point }, "", props.lineSeparator));
          } else attempt(() => joinAtBoundary(source, model, leaf, backwards));
          return;
        } else if (event.inputType === "deleteWordBackward") start = leaf.value.slice(0, start).replace(/(?:\s+|[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+)\s*$/u, "").length;
        else if (event.inputType === "deleteWordForward") end += /^(?:\s+|[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+)\s*/u.exec(leaf.value.slice(end))?.[0].length ?? 0;
        else { setReason("richBoundary"); return; }
      }
      attempt(() => replaceSelection(source, model, { leaf, offset: start }, { leaf, offset: end }, "", props.lineSeparator)); return;
    }
    if (event.inputType === "insertText" || event.inputType === "insertReplacementText")
      attempt(() => replaceLeaf(source, leaf, start, end, event.data ?? "", props.lineSeparator));
    else setReason("richOperationBlocked");
  }
  useEffect(() => {
    const element = root.current;
    element?.addEventListener("beforeinput", input);
    return () => element?.removeEventListener("beforeinput", input);
  });
  const renderNode = (node: RichNode, key: number): ReactNode => {
    const leafIndex = model.leaves.findIndex(leaf => leaf.node === node);
    if (leafIndex >= 0) {
      const leaf = model.leaves[leafIndex];
      const tag = node.type === "code" || node.type === "inlineCode" ? "code" : "span";
      const text = createElement(tag, { key, "data-rich-leaf": leafIndex, contentEditable: undefined,
        suppressContentEditableWarning: true, role: "textbox", "aria-multiline": true,
        "aria-label": `${t(props.locale, "editingSection")}: ${props.label}`, spellCheck: node.type !== "code", tabIndex: -1 }, node.type === "code" ? <RichCodeText source={leaf.value} language={node.lang ?? ""} /> : leaf.value);
      return node.type === "code" ? <div key={key} className="code-block">
        <div className="code-block-toolbar" contentEditable={false}><button type="button" disabled={!editable} aria-label={t(props.locale, "richLanguage")}
          onClick={() => setLanguageTarget({ node, value: node.lang ?? "" })}>{node.lang || t(props.locale, "plainCode")}</button></div>
        <pre>{text}</pre>
      </div> : text;
    }
    const children = node.type === "listItem" && !node.spread
      ? node.children?.map((child, index) => child.type === "paragraph" ? <span key={index}>{child.children?.map(renderNode)}</span> : renderNode(child, index))
      : node.children?.map(renderNode);
    const tags: Record<string, string> = { paragraph: "p", strong: "strong", emphasis: "em", delete: "del", link: "span", linkReference: "span",
      listItem: "li", table: "table", tableRow: "tr", tableCell: "td", blockquote: "blockquote" };
    if (node.type === "break") return <br key={key} />;
    if (node.type === "thematicBreak") return <hr key={key} />;
    if (node.type === "image") return <span key={key} className="rich-image-object" contentEditable={false}>
      <SafeImage sourceId={props.fileId} target={node.url} alt={node.alt ?? ""} locale={props.locale} />
      <button type="button" disabled={!editable} onClick={() => openProperties(node)}>{t(props.locale, "richImage")}</button>
    </span>;
    if (node.type === "link" || node.type === "linkReference") return <span key={key} className="document-link" onDoubleClick={() => openProperties(node)}>{children}
      <button type="button" className="rich-property-trigger" contentEditable={false} aria-label={t(props.locale, "richLink")} disabled={!editable} onClick={() => openProperties(node)}>…</button></span>;
    if (node.type === "heading") return createElement(`h${node.depth}`, { key, id: props.headingIds?.[node.position!.start.offset!] ?? (node === model.tree.children.find(n => n.type === "heading") ? props.headingId : undefined) }, children);
    if (node.type === "list") return createElement(node.ordered ? "ol" : "ul", { key, start: node.start ?? undefined }, children);
    if (node.type === "listItem" && node.checked !== null && node.checked !== undefined) {
      const from = node.position!.start.offset!, to = node.position!.end.offset!;
      const match = /\[[ xX]\]/.exec(source.slice(from, to));
      return <li key={key}><input type="checkbox" aria-label={t(props.locale, "task")} contentEditable={false} checked={node.checked} disabled={!editable || !match}
        onChange={() => match && apply({ from: from + match.index + 1, to: from + match.index + 2, insert: node.checked ? " " : "x", caret: from + match.index + 3 })} />{children}</li>;
    }
    if (node.type === "table") return <div key={key} className="rich-table"><table>{node.children?.map((row, rowIndex) => createElement(rowIndex === 0 ? "thead" : "tbody", { key: rowIndex },
      <tr>{row.children?.map((cell, cellIndex) => createElement(rowIndex === 0 ? "th" : "td", { key: cellIndex, style: { textAlign: node.align?.[cellIndex] ?? undefined } }, cell.children?.map(renderNode) ?? renderNode(cell, cellIndex)))}</tr>))}</table></div>;
    if (tags[node.type]) return createElement(tags[node.type], { key }, children);
    const from = node.position?.start.offset ?? 0, to = node.position?.end.offset ?? source.length;
    return <div key={key} className="rich-opaque" contentEditable={false}>
      <span className="rich-lock">{t(props.locale, "richOpaque")}</span>
      <MarkdownView content={source.slice(from, to)} fileId={props.fileId} locale={props.locale} onNavigate={() => {}} />
    </div>;
  };
  return <>
    {unsupportedEol && <p role="status" className="rich-reason">{t(props.locale, "richEolDeferred")}</p>}
    {announcement && <p role="status" className="rich-reason">{announcement}</p>}
    {reason && <p role="status" className="rich-reason">{t(props.locale, reason as "richOperationBlocked")}</p>}
    {model.blocked && <p role="alert">{t(props.locale, "richSizeBlocked")}</p>}
    {(selection || blockTarget) && editable && <div className="rich-formatting" role="toolbar" aria-label={t(props.locale, "richFormatting")}>
      {([["richBold", "**"], ["richItalic", "*"], ["richCode", "`"], ["richStrike", "~~"]] as const).map(([label, marker]) => <button key={label} type="button"
        disabled={!selection || selection.leaf !== selection.last} onMouseDown={event => event.preventDefault()} onClick={() => {
          if (!selection) return;
          format(marker, selection);
        }}>{t(props.locale, label)}</button>)}
      <button type="button" disabled={!selection || selection.leaf !== selection.last} onMouseDown={event => event.preventDefault()} onClick={() => {
        if (!selection) return;
        if (selection.leaf.node.type !== "text") { setReason("richOperationBlocked"); return; }
        setProperties({ node: selection.leaf.node, label: selection.leaf.value.slice(selection.start, selection.end), url: "", title: "", creating: selection });
      }}>{t(props.locale, "richLink")}</button>
      <details open={moreOpen} onToggle={event => setMoreOpen(event.currentTarget.open)}><summary>{t(props.locale, "richMore")}</summary>
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => attempt(() => blockFormat(source, (selection?.leaf ?? blockTarget)!, "quote", props.lineSeparator))}>{t(props.locale, "richQuote")}</button>
        <button type="button" disabled={!(selection?.leaf ?? blockTarget)?.ancestors.some(n => n.type === "blockquote")} onMouseDown={event => event.preventDefault()} onClick={() => attempt(() => blockFormat(source, (selection?.leaf ?? blockTarget)!, "unquote", props.lineSeparator))}>{t(props.locale, "richUnquote")}</button>
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => attempt(() => blockFormat(source, (selection?.leaf ?? blockTarget)!, "rule", props.lineSeparator))}>{t(props.locale, "richRule")}</button>
        <label>{t(props.locale, "richBlockFormat")}<select aria-label={t(props.locale, "richBlockFormat")}
          value={(selection?.leaf ?? blockTarget)?.ancestors.find(n => n.type === "heading")?.depth ?? 0}
          onChange={event => attempt(() => headingLevel(source, (selection?.leaf ?? blockTarget)!, Number(event.target.value)))}>
          <option value={0}>{t(props.locale, "richParagraph")}</option>
          {[1, 2, 3, 4, 5, 6].map(depth => <option key={depth} value={depth}>{t(props.locale, "richHeading")} {depth}</option>)}
        </select></label>
      </details>
    </div>}
    {tableTarget && editable && <details className="rich-table-controls"><summary>{t(props.locale, "richTable")}</summary>
      <div role="group" aria-label={t(props.locale, "richTable")}>
        {(["rowAbove", "rowBelow", "deleteRow", "columnBefore", "columnAfter", "deleteColumn", "alignLeft", "alignCenter", "alignRight"] as TableOperation[]).map(operation =>
          <button key={operation} type="button" onMouseDown={event => event.preventDefault()} onClick={() => {
            try {
              const patch = changeTable(source, tableTarget, operation, props.lineSeparator);
              const table = tableTarget.ancestors.find(n => n.type === "table"), row = tableTarget.ancestors.find(n => n.type === "tableRow");
              const cell = tableTarget.ancestors.find(n => n.type === "tableCell");
              const target = operation.toLowerCase().includes("row") ? (table?.children?.indexOf(row!) ?? -1) + 1 : (row?.children?.indexOf(cell!) ?? -1) + 1;
              apply(patch, "input.table"); setAnnouncement(`${t(props.locale, operation)} · ${target}`);
            } catch { setReason("richOperationBlocked"); }
          }}>{t(props.locale, operation)}</button>)}
      </div>
    </details>}
    {languageTarget && <form className="rich-properties" aria-label={t(props.locale, "richLanguage")} onSubmit={event => {
      event.preventDefault(); try {
        const patch = codeLanguage(source, languageTarget.node, languageTarget.value);
        if (patch) apply(patch, "input.format"); else setLanguageTarget(null);
      } catch { setReason("richOperationBlocked"); }
    }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setLanguageTarget(null); } }}>
      <label>{t(props.locale, "richLanguage")}<input autoFocus value={languageTarget.value} onChange={event => setLanguageTarget({ ...languageTarget, value: event.target.value })} /></label>
      <button type="submit" disabled={!editable}>{t(props.locale, "richApply")}</button>
      <button type="button" onClick={() => setLanguageTarget(null)}>{t(props.locale, "cancel")}</button>
    </form>}
    {properties && <form className="rich-properties" aria-label={t(props.locale, properties.node.type === "image" ? "richImage" : "richLink")}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setProperties(null); pendingFocus.current = true; setState(stateRef.current.update({}).state); } }}
      onSubmit={event => { event.preventDefault(); try {
        const patch = properties.creating ? createLink(source, properties.creating.leaf, properties.creating.start, properties.creating.end, properties.label, properties.url, properties.title)
          : inlineProperties(source, properties.node, properties.label, properties.url, properties.title);
        if (patch) apply(patch, "input.format"); else { setProperties(null); pendingFocus.current = true; setState(stateRef.current.update({}).state); }
      } catch { setReason("richTargetBlocked"); } }}>
      <label>{t(props.locale, "richLabel")}<input autoFocus value={properties.label} onChange={event => setProperties({ ...properties, label: event.target.value })} /></label>
      <label>{t(props.locale, "richTarget")}<input value={properties.url} onChange={event => setProperties({ ...properties, url: event.target.value })} /></label>
      <label>{t(props.locale, "richTitle")}<input value={properties.title} onChange={event => setProperties({ ...properties, title: event.target.value })} /></label>
      <button type="submit" disabled={!editable}>{t(props.locale, "richApply")}</button>
      <button type="button" onClick={() => { setProperties(null); pendingFocus.current = true; setState(stateRef.current.update({}).state); }}>{t(props.locale, "cancel")}</button>
    </form>}
    {contextMenu && <ActionMenu {...contextMenu} actions={contextActions()} onClose={() => setContextMenu(null)} onRestoreFocus={restoreSelection} />}
    <div ref={root} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); openContext(event.target as HTMLElement, event.clientX + 8, event.clientY + 8); }} contentEditable={editable} suppressContentEditableWarning tabIndex={0} role="textbox" aria-multiline="true" aria-label={`${t(props.locale, "editingSection")}: ${props.label}`} onFocus={() => { structureTabEscape.current = false; }} className="rich-section markdown-body" data-rich-session={props.sessionId} key={compositionRevision}
      onPaste={event => { event.preventDefault(); const selected = range();
        if (selected && editable && !composition.current) attempt(() => replaceRange(selected, event.clipboardData.getData("text/plain"))); else setReason("richOperationBlocked"); }}
      onCut={event => { event.preventDefault(); const selected = range();
        if (!selected || !editable || composition.current) { setReason("richOperationBlocked"); return; }
        try { replaceRange(selected, ""); event.clipboardData.setData("text/plain", plainSelection(selected)); }
        catch { setReason("richClipboardFailed"); return; }
        attempt(() => replaceRange(selected, "")); }}
      onCopy={event => { const selected = range(); if (!selected) return;
        const from = selected.leaf.offsets[selected.start], to = selected.last.offsets[selected.end];
        if (model.opaque.some(n => n.from < to && n.to > from)) return;
        event.preventDefault(); try { event.clipboardData.setData("text/plain", plainSelection(selected)); } catch { setReason("richClipboardFailed"); }
      }}
      onDrop={event => { event.preventDefault(); setReason("richOperationBlocked"); }}
      onInput={event => {
        if (composition.current) return;
        const element = (event.target as HTMLElement).closest<HTMLElement>("[data-rich-leaf]");
        const leaf = element && model.leaves[Number(element.dataset.richLeaf)];
        const pending = browserInput.current; browserInput.current = null;
        if (element && leaf) reconcileText(leaf, element);
        else if (pending) reconcileText(pending.leaf, pending.element);
        else { setReason("richOperationBlocked"); setCompositionRevision(n => n + 1); }
      }}
      onCompositionStart={() => {
        const selected = range(); if (!selected || !editable) return;
        let blocked = false;
        if (selected.leaf !== selected.last) try { replaceRange(selected, ""); } catch { blocked = true; setReason("richOperationBlocked"); }
        composition.current = { leaf: selected.leaf, element: selected.element, value: selected.leaf.value,
          range: selected.leaf !== selected.last ? selected : undefined, blocked };
        commands.current.publish();
      }}
      onCompositionUpdate={event => { if (composition.current) composition.current.text = event.data; }}
      onCompositionEnd={event => { finishComposition(event.data); }}
      onBlur={event => {
        const composed = composition.current;
        if (composed && (event.target === composed.element || composed.range)) {
          finishComposition(composed.text); pendingFocus.current = false;
        }
      }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || composition.current) return;
        if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
          event.preventDefault(); event.stopPropagation(); const selected = savedRange();
          const anchor = selected?.element ?? root.current; const bounds = anchor?.getBoundingClientRect();
          if (anchor && bounds) openContext(anchor, bounds.left + 8, bounds.bottom + 8); return;
        }
        const mod = event.metaKey || event.ctrlKey;
        if (mod && ["b", "i"].includes(event.key.toLowerCase())) { event.preventDefault(); format(event.key.toLowerCase() === "b" ? "**" : "*"); }
        if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); historyCommand(event.shiftKey ? redo : undo); }
        if (mod && event.key.toLowerCase() === "a") { event.preventDefault();
          const first = root.current?.querySelector<HTMLElement>("[data-rich-leaf]");
          const all = root.current?.querySelectorAll<HTMLElement>("[data-rich-leaf]");
          const last = all?.[all.length - 1];
          if (first && last) window.getSelection()?.setBaseAndExtent(...domPoint(first, 0), ...domPoint(last, last.textContent?.length ?? 0));
        }
        if (mod && ["ArrowUp", "ArrowDown"].includes(event.key)) {
          const selected = range(), target = event.key === "ArrowUp" ? model.leaves[0] : model.leaves.at(-1);
          if (selected && target) {
            event.preventDefault(); pendingFocus.current = true;
            const head = event.key === "ArrowUp" ? target.from : target.to;
            dispatch(stateRef.current.update({ selection: { anchor: event.shiftKey ? selected.anchor : head, head } }));
            return;
          }
        }
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          const selected = range();
          if (selected && selected.start === selected.end && !event.shiftKey) {
            const backwards = event.key === "ArrowLeft" || event.key === "ArrowUp";
            const atBoundary = backwards ? selected.start === 0 : selected.end === selected.leaf.value.length;
            if (atBoundary || (mod && ["ArrowUp", "ArrowDown"].includes(event.key))) {
              const adjacent = mod && ["ArrowUp", "ArrowDown"].includes(event.key)
                ? (backwards ? model.leaves[0] : model.leaves.at(-1))
                : model.leaves[model.leaves.indexOf(selected.leaf) + (backwards ? -1 : 1)];
              event.preventDefault();
              if (adjacent) {
                pendingFocus.current = true;
                dispatch(stateRef.current.update({ selection: { anchor: backwards && !mod ? adjacent.to : backwards ? adjacent.from : mod ? adjacent.to : adjacent.from } }));
              } else setReason("richBoundary");
            }
          }
        }
        if (event.key === "Escape") { setSelection(null); setBlockTarget(null); setContextMenu(null); setTableTarget(null); setProperties(null); setLanguageTarget(null); structureTabEscape.current = true; }
        if (event.key === "Tab") {
          const selected = range();
          if (selected?.leaf.node.type === "code" && !structureTabEscape.current) {
            event.preventDefault();
            if (!event.shiftKey) attempt(() => replaceLeaf(source, selected.leaf, selected.start, selected.end, "  ", props.lineSeparator));
            else {
              const at = selected.leaf.value.lastIndexOf("\n", selected.start - 1) + 1;
              const count = /^ {1,2}/.exec(selected.leaf.value.slice(at))?.[0].length ?? 0;
              if (count) attempt(() => replaceLeaf(source, selected.leaf, at, at + count, "", props.lineSeparator));
            }
          } else if (!structureTabEscape.current && selected?.leaf.ancestors.some(n => n.type === "listItem")) {
            event.preventDefault(); attempt(() => indentListItem(source, selected.leaf, event.shiftKey));
          }
          if (!structureTabEscape.current && selected?.leaf.ancestors.some(n => n.type === "tableCell")) {
            const cells = Array.from(root.current?.querySelectorAll<HTMLElement>("td [data-rich-leaf], th [data-rich-leaf]") ?? []);
            const next = cells[cells.indexOf(selected.element) + (event.shiftKey ? -1 : 1)];
            if (next) {
              event.preventDefault(); pendingFocus.current = true;
              dispatch(stateRef.current.update({ selection: { anchor: model.leaves[Number(next.dataset.richLeaf)].from } }));
            }
          }
        }
      }}>
      {model.blocked ? <MarkdownView content={source} fileId={props.fileId} locale={props.locale} onNavigate={() => {}} /> : model.tree.children.map((node, index) => renderNode(node as RichNode, index))}
    </div>
    <div className="rich-history">
      <button type="button" disabled={!editable || !undoDepth(state)} onClick={() => historyCommand(undo)}>{t(props.locale, "undo")}</button>
      <button type="button" disabled={!editable || !redoDepth(state)} onClick={() => historyCommand(redo)}>{t(props.locale, "redo")}</button>
    </div>
  </>;
}
