import { useEffect, useState } from "react";
import { t, type Locale } from "../app/i18n";
import type { CodeToken } from "./code-tokens";

let activeTokenWorkers = 0;
const MAX_ACTIVE_TOKEN_WORKERS = 2;

export function fencedSource(content: string, start: number | undefined, end: number | undefined,
  fallback: string): string {
  if (start === undefined || end === undefined || start < 0 || end < start || end > content.length)
    return fallback;
  const raw = content.slice(start, end);
  const opening = /^ {0,3}(`{3,}|~{3,})[^\r\n]*(\r\n|\n|\r)/.exec(raw);
  if (!opening) return fallback;
  const body = raw.slice(opening[0].length);
  const lines = body.split(/(?<=\r\n|\r|\n)/);
  const last = lines[lines.length - 1] || lines[lines.length - 2] || "";
  const closing = new RegExp(`^ {0,3}${opening[1][0] === "`" ? "`" : "~"}{${opening[1].length},}[ \\t]*$`);
  if (!closing.test(last.trimEnd())) return body;
  return body.slice(0, body.length - last.length);
}

export function renderTokens(tokens: CodeToken[]): React.ReactNode {
  return tokens.map((token, index) => "text" in token
    ? token.text
    : <span key={index} className={token.className}>{renderTokens(token.children)}</span>);
}

export default function CodeBlock({ source, copySource, language, locale }: {
  source: string; copySource: string; language: string; locale: Locale;
}) {
  const tokens = useCodeTokens(source, language);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  return <div className="code-block">
    <div className="code-block-toolbar">
      <span>{language || t(locale, "plainCode")}</span>
      <button type="button" onClick={() => {
        if (!navigator.clipboard?.writeText) { setCopyStatus("failed"); return; }
        void navigator.clipboard.writeText(copySource).then(() => setCopyStatus("copied"),
          () => setCopyStatus("failed"));
      }}>{t(locale, "copyCode")}</button>
      {copyStatus !== "idle" && <span role="status">{t(locale,
        copyStatus === "copied" ? "codeCopied" : "codeCopyFailed")}</span>}
    </div>
    <pre><code>{tokens ? renderTokens(tokens) : source}</code></pre>
  </div>;
}

export function useCodeTokens(source: string, language: string) {
  const [result, setTokens] = useState<{ source: string; language: string; tokens: CodeToken[] } | null>(null);
  useEffect(() => {
    setTokens(null);
    if (!language || source.length > 32 * 1024 || typeof Worker === "undefined"
      || activeTokenWorkers >= MAX_ACTIVE_TOKEN_WORKERS) return;
    activeTokenWorkers += 1;
    let reserved = true;
    const release = () => {
      if (reserved) { activeTokenWorkers -= 1; reserved = false; }
    };
    let live = true;
    let worker: Worker;
    try { worker = new Worker(new URL("./codeTokens.worker.ts", import.meta.url), { type: "module" }); }
    catch { release(); return; }
    const timer = setTimeout(() => { live = false; worker.terminate(); release(); }, 2_000);
    worker.onmessage = (event: MessageEvent<{ kind: string; tokens?: CodeToken[] }>) => {
      if (!live) return;
      clearTimeout(timer);
      worker.terminate();
      release();
      if (event.data.kind === "tokens" && Array.isArray(event.data.tokens))
        setTokens({ source, language, tokens: event.data.tokens });
    };
    worker.onerror = () => { live = false; clearTimeout(timer); worker.terminate(); release(); };
    worker.postMessage({ language, source });
    return () => { live = false; clearTimeout(timer); worker.terminate(); release(); };
  }, [language, source]);

  return result?.source === source && result.language === language ? result.tokens : null;
}
