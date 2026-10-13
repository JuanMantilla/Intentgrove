import { writeFileSync } from "node:fs";
import { mergeConfig } from "vitest/config";
import base from "/Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source/vitest.config.ts";
const out = "/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0034-investigation-20261012T022335Z";
const app = "/Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source/src/app/App.tsx";
const markdown = app.replace("app/App.tsx", "reader/MarkdownView.tsx");
const changes = [
  ["const tab = tabsRef.current.find(item => item.id === id);\n    if (tab && tab.kind !== \"image\"", "const tab = tabsRef.current.find(item => item.id === id); (globalThis as any).__qa34?.('capture-attempt', {id, scrollTop:reader.scrollTop, pending:tab ? hasPendingSectionLayout(tab):null, renderedId:renderedMarkdown?.id, renderedMatches:renderedMarkdown?.content === tab?.content, markdownBody:Boolean(reader.querySelector('.document-page .markdown-body')), saved:readingAnchors.current.get(id), position:scrollPositions.current.get(id)});\n    if (tab && tab.kind !== \"image\""],
  ["const scrollTop = reader.scrollTop;", "(globalThis as any).__qa34?.('capture-accepted',{id,scrollTop:reader.scrollTop}); const scrollTop = reader.scrollTop;"],
  ["const saved = readingAnchors.current.get(activeId ?? \"\");", "const saved = readingAnchors.current.get(activeId ?? \"\"); (globalThis as any).__qa34?.('restore-ready',{activeId,scrollTop:reader.scrollTop,saved,position:scrollPositions.current.get(activeId ?? ''),renderedId:renderedMarkdown?.id,sections:sectionLayoutVersions});"],
  ["if (!reader) return;\n    if (!active ||", "if (!reader) return; (globalThis as any).__qa34?.('restore-attempt',{activeId,scrollTop:reader.scrollTop,pending:active ? hasPendingSectionLayout(active):null,renderedId:renderedMarkdown?.id,renderedMatches:renderedMarkdown?.content === active?.content});\n    if (!active ||"],
  ["void api.listEditSections(active.id).then((result) => {", "(globalThis as any).__qa34?.('sections-start',{id:active.id,version:active.diskVersion}); void api.listEditSections(active.id).then((result) => { (globalThis as any).__qa34?.('sections-resolved',{id:active.id,version:active.diskVersion,cancelled,resultVersion:result.diskVersion});"],
  ["void api.getConfirmedDocument(event.fileId, event.diskVersion, event.generation)", "(globalThis as any).__qa34?.('refresh-held-start',{id:event.fileId,version:event.diskVersion}); void api.getConfirmedDocument(event.fileId, event.diskVersion, event.generation)"],
  ["onRendered={(id, content) => setRenderedMarkdown({ id, content })}", "onRendered={(id, content) => { (globalThis as any).__qa34?.('onRendered',{id}); setRenderedMarkdown({ id, content }); }}"]
];
export default mergeConfig(base, {
  plugins: [{ name: "qa0034-observation", enforce: "pre", transform(source: string, id: string) {
    if (id !== app && id !== markdown) return;
    let code = source;
    const replacements = id === app ? changes : [[
      "if (!layoutPending && renderReady && painted >= blocks.length) renderedCallback.current?.(fileId, content);",
      "(globalThis as any).__qa34?.('markdown-layout',{fileId,layoutPending,renderReady,painted,blocks:blocks.length}); if (!layoutPending && renderReady && painted >= blocks.length) renderedCallback.current?.(fileId, content);"
    ]];
    for (const [before, after] of replacements) {
      if (code.split(before).length !== 2) throw new Error("Observation target must be unique: " + before);
      code = code.replace(before, after);
    }
    writeFileSync(out + "/evidence/transform-" + (id === app ? "app" : "markdown") + "-proof.txt", code);
    return { code, map: null };
  }}],
  test: { setupFiles: [out + "/diagnostic-setup.ts"] }
});
