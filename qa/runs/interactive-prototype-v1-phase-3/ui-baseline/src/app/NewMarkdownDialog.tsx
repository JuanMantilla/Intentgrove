import { useEffect, useId, useRef, useState } from "react";
import { api, readerError, type GrantInfo, type MarkdownDestination, type CreateMarkdownOutcome } from "./api";
import { errorText, t, type Locale } from "./i18n";
import WorkspaceDialog from "./WorkspaceDialog";

/** Portable UI validation; native validation and exclusive creation remain authoritative. */
export function markdownFilename(value: string): string | null {
  // Option B prototype: a competing extension is 1–8 terminal ASCII letters/digits.
  // Preserve all input except the explicitly authorized terminal Markdown suffixes.
  if (/\.(?!md$)[a-z0-9]{1,8}$/i.test(value)) return null;
  if (!value || /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/.test(value) || /[. ]$/.test(value)) return null;
  const stem = value.replace(/(?:\.md)+$/i, "");
  const reserved = stem.split(".", 1)[0].replace(/ +$/, "");
  if (!stem || stem === "." || stem === ".." || /[. ]$/.test(stem)
    || /^(?:con|conin\$|conout\$|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])$/i.test(reserved)) return null;
  const filename = `${stem}.md`;
  return new TextEncoder().encode(filename).length <= 255 ? filename : null;
}
type Destination = { kind: "root"; grant: GrantInfo } | { kind: "token"; selected: MarkdownDestination };
export default function NewMarkdownDialog({ locale, defaultDestination, available = false, onClose, onCreated }:
  { locale: Locale; defaultDestination: GrantInfo | null; available?: boolean; onClose(): void;
    onCreated?(outcome: CreateMarkdownOutcome): Promise<void> }) {
  const id = useId();
  const [filename, setFilename] = useState("");
  const [destination, setDestination] = useState<Destination | null>(defaultDestination ? { kind: "root", grant: defaultDestination } : null);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [committed, setCommitted] = useState<Extract<CreateMarkdownOutcome, { status: "committed_not_opened" }> | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const owner = useRef(false);
  const token = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false;
    if (token.current) void api.cancelMarkdownDestination(token.current).catch(() => {});
    token.current = null;
  }; }, []);
  const normalized = markdownFilename(filename);
  const nameInvalid = invalid || (filename.length > 0 && !normalized);
  const inlineError = nameInvalid ? t(locale, "newInvalidName") : error;
  const blocked = pending || Boolean(committed) || uncertain;
  const displayPath = destination?.kind === "root" ? destination.grant.displayPath : destination?.selected.displayPath;
  async function chooseDestination() {
    if (owner.current || blocked) return;
    owner.current = true; setPending(true); setError(null);
    try {
      const selected = await api.chooseMarkdownDestination();
      if (selected) {
        if (!mounted.current) { await api.cancelMarkdownDestination(selected.token); return; }
        const previous = token.current;
        token.current = selected.token;
        setDestination({ kind: "token", selected });
        if (previous) await api.cancelMarkdownDestination(previous);
      }
    } catch (failure) { if (mounted.current) setError(errorText(locale, readerError(failure).code)); }
    finally { owner.current = false; if (mounted.current) setPending(false); }
  }
  async function submit() {
    if (owner.current || blocked) return;
    if (nameInvalid || !normalized || !destination) {
      setInvalid(nameInvalid || !normalized); setError(t(locale, nameInvalid || !normalized ? "newInvalidName" : "newNoFolder")); return;
    }
    if (!available || !onCreated) return;
    owner.current = true; setPending(true); setError(null);
    try {
      const outcome = await api.createMarkdownFile(destination.kind === "root"
        ? { rootId: destination.grant.id, segments: [], filename: normalized }
        : { destinationToken: destination.selected.token, filename: normalized });
      token.current = null; // Native consumes selection authority only after commit.
      if (outcome.status === "committed_not_opened") {
        setCommitted(outcome); setError(`${t(locale, "newCommitted")} ${outcome.displayPath}`);
      } else {
        await onCreated(outcome);
        onClose();
      }
    } catch (failure) {
      const code = readerError(failure).code;
      const precommit = ["already_exists", "invalid_filename", "invalid_grant", "root_reselection_required", "denied", "unsupported_mount", "cloud_placeholder"];
      if (precommit.includes(code)) {
        setInvalid(code === "invalid_filename");
        setError(code === "already_exists" ? t(locale, "newDuplicate") : code === "invalid_filename" ? t(locale, "newInvalidName") : errorText(locale, code));
      } else { setUncertain(true); setError(t(locale, "newUncertain")); }
    } finally { owner.current = false; if (mounted.current) setPending(false); }
  }
  return <WorkspaceDialog title={t(locale, "newMarkdown")} closeLabel={t(locale, "cancel")}
    initialFocus="input" isolate closeDisabled={pending} onClose={() => { if (!owner.current) onClose(); }}>
    <form className="new-markdown-form" noValidate onSubmit={event => { event.preventDefault(); void submit(); }}
      onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); } }}>
      <p>{t(locale, "newDescription")}</p>
      <label htmlFor={`${id}-filename`}>{t(locale, "newFilename")}</label>
      <input id={`${id}-filename`} autoComplete="off" value={filename} disabled={blocked}
        aria-invalid={nameInvalid} aria-describedby={`${id}-extension${inlineError ? ` ${id}-error` : ""}`}
        onBlur={() => { if (filename && !normalized) { setInvalid(true); setError(t(locale, "newInvalidName")); } }}
        onChange={event => { setFilename(event.target.value); setInvalid(false); setError(null); }} />
      <p id={`${id}-extension`}>{t(locale, "newExtension")}{normalized ? ` ${normalized}` : ""}</p>
      <label>{t(locale, "newDestination")}</label>
      <div className="new-markdown-destination">
        <output aria-label={t(locale, "newDestination")}>{displayPath ?? t(locale, "newNoFolder")}</output>
        <button type="button" disabled={blocked} onClick={() => void chooseDestination()}>{t(locale, "newChooseFolder")}</button>
      </div>
      {inlineError && <p id={`${id}-error`} className="new-markdown-error" role="alert">{inlineError}</p>}
      {pending && <p role="status">{t(locale, "newWorking")}</p>}
      {!available && <p id={`${id}-availability`} role="status">{t(locale, "newUnavailable")}</p>}
      {committed?.fileId && <button type="button" disabled={pending} onClick={async () => {
        if (owner.current || !onCreated) return;
        owner.current = true; setPending(true);
        try { await onCreated(committed); onClose(); }
        finally { owner.current = false; if (mounted.current) setPending(false); }
      }}>{t(locale, "newReopen")}</button>}
      <div className="new-markdown-actions"><button className="primary-button" type="submit"
        disabled={!available || !onCreated || blocked || nameInvalid || !normalized || !destination}
        aria-describedby={!available ? `${id}-availability` : undefined}>{t(locale, "newCreate")}</button></div>
    </form>
  </WorkspaceDialog>;
}
