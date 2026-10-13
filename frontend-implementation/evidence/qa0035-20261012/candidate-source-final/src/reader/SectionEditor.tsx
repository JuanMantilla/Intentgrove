import { useRef, useState } from "react";
import PreviewLoading from "./PreviewLoading";
import RichSection from "./RichSection";
import { t, type Locale } from "../app/i18n";
import { FindIndex, type FindResults, type FindSpan } from "./find-index";

export type RichCommand = "undo" | "redo" | "bold" | "italic" | "code" | "link";
export interface EditorCommandState { owner: boolean; undo: boolean; redo: boolean; selection: boolean }
export interface DraftFindAdapter { reveal: (span: FindSpan) => void; focus: () => void; command?: (command: RichCommand) => void }


export default function SectionEditor({
  sessionId, fileId, label, headingId, headingIds, initialSource, initialDraft, initialEditorJson,
  lineSeparator, locale,
  onChange, onCheckpoint, onSave, onSaveAs, onDiscard, onReturn, busy, checkpointStatus, conflict = false, saving = false,
  onFindReady, onCommandState, headerActions = false
}: {
  sessionId: string;
  fileId: string;
  label: string;
  headingId?: string;
  headingIds?: Record<number, string>;
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
  onCommandState?: (state: EditorCommandState) => void;
  headerActions?: boolean;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const lastCheckpoint = useRef<{ value: string; json: unknown; top: number; left: number } | null>(null);
  return <section className="section-editor section-editor-in-place" aria-label={t(locale, "editingSection") + ": " + label}>
    <div className="section-editor-header"><strong>{t(locale, "editingSection")}: {label}</strong></div>
    <div className="section-editor-status">
      <p role="status" className="file-write-status">{t(locale, saving ? "sourceSaving" : draft !== initialSource ? "sourceDirty" : "sourceUnchanged")}</p>
      <p role="status" className="recovery-status" data-state={checkpointStatus}>
        {checkpointStatus === "pending" && <PreviewLoading inline announce={false} label={t(locale, "recoveryWriting")} />}
        {checkpointStatus === "saved" && <span aria-hidden="true">✓ </span>}
        {t(locale, checkpointStatus === "saved" ? "recoveryConfirmed" : checkpointStatus === "error" ? "recoveryFailed" : "recoveryWriting")}
      </p>
      {checkpointStatus === "error" && <button type="button" onClick={() => {
        const last = lastCheckpoint.current;
        if (last) onCheckpoint(last.value, last.json, last.top, last.left);
      }}>{t(locale, "retry")}</button>}
    </div>
    <RichSection sessionId={sessionId} fileId={fileId} label={label} headingId={headingId} headingIds={headingIds} initialDraft={initialDraft}
      initialEditorJson={initialEditorJson} lineSeparator={lineSeparator} locale={locale} saving={saving}
      onFindReady={onFindReady} onCommandState={onCommandState} onChange={value => { setDraft(value); onChange(value); }}
      onCheckpoint={(value, json, top, left) => {
        lastCheckpoint.current = { value, json, top, left }; onCheckpoint(value, json, top, left);
      }} />
    <div className="section-editor-actions">
      <button type="button" onClick={onDiscard} disabled={busy}>{t(locale, "discardChanges")}</button>
      {!headerActions && <button type="button" onClick={onReturn} disabled={busy}>{t(locale, "returnReading")}</button>}
      <button type="button" onClick={onSaveAs} disabled={busy}>{t(locale, "saveAsCopy")}</button>
      {!headerActions && <button type="button" className="primary-button" onClick={onSave} disabled={busy || conflict || draft === initialSource}
        aria-label={t(locale, "saveFile")} title={draft === initialSource ? t(locale, "noChangesToSave") : conflict ? t(locale, "saveConflict") : undefined}>{saving && <PreviewLoading inline label={t(locale, "sourceSaving")} />}{t(locale, "saveFile")}</button>}
    </div>
  </section>;
}
