import { useEffect, useRef, useState } from "react";
import { Compartment, EditorState, type Range as CmRange } from "@codemirror/state";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyField, historyKeymap, redo, undo, undoDepth, redoDepth } from "@codemirror/commands";
import MarkdownView from "./MarkdownView";
import { t, type Locale } from "../app/i18n";
import { useAppearance } from "../app/appearance";
import { FindIndex, type FindResults, type FindSpan } from "./find-index";

export interface DraftFindAdapter {
  reveal: (span: FindSpan) => void;
  focus: () => void;
}

export default function SectionEditor({
  sessionId, fileId, label, initialSource, initialDraft, initialEditorJson,
  initialScrollTop, initialScrollLeft, lineSeparator, locale,
  onChange, onCheckpoint, onSave, onSaveAs, onDiscard, onReturn, busy, checkpointStatus, conflict = false, saving = false,
  findIndex, findResults, findOrdinal, onFindReady, headerActions = false
}: {
  sessionId: string;
  fileId: string;
  label: string;
  initialSource: string;
  initialDraft: string;
  initialEditorJson?: unknown;
  initialScrollTop?: number;
  initialScrollLeft?: number;
  lineSeparator: string;
  locale: Locale;
  onChange: (value: string) => void;
  onCheckpoint: (value: string, editorJson: unknown, scrollTop: number, scrollLeft: number) => void;
  onSave: () => void;
  onSaveAs: () => void;
  onDiscard: () => void;
  onReturn: () => void;
  busy: boolean;
  checkpointStatus: "pending" | "saved" | "error";
  conflict?: boolean;
  saving?: boolean;
  findIndex?: FindIndex | null;
  findResults?: FindResults | null;
  findOrdinal?: number;
  onFindReady?: (adapter: DraftFindAdapter | null) => void;
  headerActions?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const { resolved } = useAppearance();
  const appearanceCompartment = useRef(new Compartment());
  const writeCompartment = useRef(new Compartment());
  const labelCompartment = useRef(new Compartment());
  const findCompartment = useRef(new Compartment());
  const view = useRef<EditorView | null>(null);
  const findCurrent = useRef({ index: findIndex, results: findResults, ordinal: findOrdinal ?? -1 });
  const findUpdate = useRef<(() => void) | null>(null);
  const changed = useRef(onChange);
  const checkpoint = useRef(onCheckpoint);
  const [draft, setDraft] = useState(initialDraft);
  const [historyAvailable, setHistoryAvailable] = useState({ undo: false, redo: false });
  changed.current = onChange;
  checkpoint.current = onCheckpoint;
  findCurrent.current = { index: findIndex, results: findResults, ordinal: findOrdinal ?? -1 };

  useEffect(() => {
    if (!host.current) return;
    const extensions = [
        appearanceCompartment.current.of(EditorView.darkTheme.of(resolved === "dark")),
        writeCompartment.current.of([EditorState.readOnly.of(saving), EditorView.editable.of(!saving)]),
        findCompartment.current.of(EditorView.decorations.of(Decoration.none)),
        EditorState.lineSeparator.of(lineSeparator),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        labelCompartment.current.of(EditorView.contentAttributes.of({ "aria-label": t(locale, "markdownSource") + ": " + label })),
        EditorView.updateListener.of((update) => {
          setHistoryAvailable({ undo: undoDepth(update.state) > 0, redo: redoDepth(update.state) > 0 });
          if (!update.docChanged && !update.selectionSet) return;
          const next = update.state.doc.toString();
          if (update.docChanged) {
            setDraft(next);
            changed.current(next);
          }
          checkpoint.current(next, update.state.toJSON({ history: historyField }),
            update.view.scrollDOM.scrollTop, update.view.scrollDOM.scrollLeft);
        })
      ];
    let state: EditorState;
    let restoredHistory = false;
    try {
      state = initialEditorJson
        ? EditorState.fromJSON(initialEditorJson as object, { extensions }, { history: historyField })
        : EditorState.create({ doc: initialDraft, extensions });
      if (state.doc.toString() !== initialDraft) throw new Error("Recovery text mismatch");
      restoredHistory = Boolean(initialEditorJson);
    } catch {
      state = EditorState.create({ doc: initialDraft, extensions });
    }
    const editor = new EditorView({ state, parent: host.current });
    setHistoryAvailable({ undo: undoDepth(state) > 0, redo: redoDepth(state) > 0 });
    view.current = editor;
    const updateFindDecorations = () => {
      const current = findCurrent.current;
      if (!current.index || !current.results?.count) {
        editor.dispatch({ effects: findCompartment.current.reconfigure(
          EditorView.decorations.of(Decoration.none)) });
        return;
      }
      const marks: CmRange<Decoration>[] = [];
      const starts = current.results.starts;
      let painted = 0;
      const visited = new Set<number>();
      for (const visible of editor.visibleRanges) {
        let low = 0;
        let high = starts.length;
        const normalizedStart = current.index.normalizedAt(visible.from);
        const normalizedEnd = current.index.normalizedAt(visible.to);
        while (low < high) {
          const middle = (low + high) >>> 1;
          if (starts[middle] < normalizedStart - current.results.queryLength) low = middle + 1;
          else high = middle;
        }
        for (let ordinal = low; ordinal < starts.length && painted < 300; ordinal++) {
          if (starts[ordinal] > normalizedEnd) break;
          if (visited.has(ordinal)) continue;
          visited.add(ordinal);
          const span = current.index.span(starts[ordinal], current.results.queryLength);
          if (!span || span.start < 0 || span.end > editor.state.doc.length) continue;
          marks.push(Decoration.mark({ class: ordinal === current.ordinal
            ? "cm-find-match-active" : "cm-find-match" }).range(span.start, span.end));
          painted++;
        }
      }
      marks.sort((a, b) => a.from - b.from || a.to - b.to);
      editor.dispatch({ effects: findCompartment.current.reconfigure(
        EditorView.decorations.of(Decoration.set(marks))) });
    };
    findUpdate.current = updateFindDecorations;
    onFindReady?.({
      reveal: (span) => editor.dispatch({ effects: EditorView.scrollIntoView(span.start, { y: "center" }) }),
      focus: () => editor.focus()
    });
    const updateOnScroll = () => requestAnimationFrame(updateFindDecorations);
    editor.scrollDOM.addEventListener("scroll", updateOnScroll);
    const captureScroll = () => checkpoint.current(editor.state.doc.toString(),
      editor.state.toJSON({ history: historyField }),
      editor.scrollDOM.scrollTop, editor.scrollDOM.scrollLeft);
    editor.scrollDOM.addEventListener("scroll", captureScroll);
    editor.scrollDOM.scrollTop = initialScrollTop ?? 0;
    editor.scrollDOM.scrollLeft = initialScrollLeft ?? 0;
    if (!restoredHistory) {
      checkpoint.current(initialDraft, state.toJSON({ history: historyField }),
        editor.scrollDOM.scrollTop, editor.scrollDOM.scrollLeft);
    }
    editor.focus();
    return () => {
      onFindReady?.(null);
      findUpdate.current = null;
      view.current = null;
      editor.scrollDOM.removeEventListener("scroll", updateOnScroll);
      editor.scrollDOM.removeEventListener("scroll", captureScroll);
      editor.destroy();
    };
  }, [sessionId]);

  useEffect(() => { findUpdate.current?.(); }, [findIndex, findResults, findOrdinal]);

  useEffect(() => {
    view.current?.dispatch({ effects: writeCompartment.current.reconfigure([EditorState.readOnly.of(saving), EditorView.editable.of(!saving)]) });
  }, [saving, sessionId]);

  useEffect(() => {
    view.current?.dispatch({ effects: labelCompartment.current.reconfigure(
      EditorView.contentAttributes.of({ "aria-label": t(locale, "markdownSource") + ": " + label })) });
  }, [locale, label, sessionId]);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.facet(EditorView.darkTheme) !== (resolved === "dark")) {
      editor.dispatch({ effects: appearanceCompartment.current.reconfigure(EditorView.darkTheme.of(resolved === "dark")) });
    }
  }, [resolved, sessionId]);

  return <section className="section-editor" aria-label={t(locale, "editingSection") + ": " + label}>
    <div className="section-editor-header">
      <strong>{t(locale, "editingSection")}: {label}</strong>
    </div>
    <div className="section-editor-status">
      <p role="status" className="file-write-status">{t(locale, saving ? "sourceSaving"
        : draft !== initialSource ? "sourceDirty" : "sourceUnchanged")}</p>
      <p role="status" className="recovery-status" data-state={checkpointStatus}>
        {checkpointStatus === "saved" && <span aria-hidden="true">✓ </span>}
        {t(locale, checkpointStatus === "saved" ? "recoveryConfirmed"
          : checkpointStatus === "error" ? "recoveryFailed" : "recoveryWriting")}</p>
      {checkpointStatus === "error" && <button type="button" onClick={() => {
        const editor = view.current;
        if (editor) checkpoint.current(editor.state.doc.toString(),
          editor.state.toJSON({ history: historyField }),
          editor.scrollDOM.scrollTop, editor.scrollDOM.scrollLeft);
      }}>{t(locale, "retry")}</button>}
    </div>
    <div className="section-editor-columns">
      <div className="section-source">
        <div className="section-column-label">{t(locale, "markdownSource")}</div>
        <div ref={host} />
      </div>
      <div className="section-preview" aria-label={t(locale, "livePreview")}>
        <div className="section-column-label">{t(locale, "livePreview")}</div>
        <MarkdownView content={draft} fileId={fileId} locale={locale} onNavigate={() => {}} />
      </div>
    </div>
    <div className="section-editor-actions">
      <button type="button" disabled={!historyAvailable.undo || saving} onClick={() => view.current && undo(view.current)}>{t(locale, "undo")}</button>
      <button type="button" disabled={!historyAvailable.redo || saving} onClick={() => view.current && redo(view.current)}>{t(locale, "redo")}</button>
      <span className="toolbar-spacer" />
      <button type="button" onClick={onDiscard} disabled={busy}>{t(locale, "discardChanges")}</button>
      {!headerActions && <button type="button" onClick={onReturn} disabled={busy}>{t(locale, "returnReading")}</button>}
      <button type="button" onClick={onSaveAs} disabled={busy}>{t(locale, "saveAsCopy")}</button>
      {!headerActions && <button type="button" className="primary-button" onClick={onSave} disabled={busy || conflict || draft === initialSource}
        title={draft === initialSource ? t(locale, "noChangesToSave") : conflict ? t(locale, "saveConflict") : undefined}>
        {t(locale, "saveFile")}
      </button>}
    </div>
  </section>;
}
