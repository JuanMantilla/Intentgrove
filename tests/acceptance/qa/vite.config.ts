import { defineConfig, mergeConfig } from "vite";
import base from "../../../vite.config.ts";
import { resolve } from "node:path";
const bridge = resolve("tests/acceptance/qa/bridge.ts");
function replaceOnce(source: string, before: string, after: string) {
  if (source.split(before).length !== 2) throw new Error("QA transform anchor changed; review instrumentation");
  return source.replace(before, after);
}
export default mergeConfig(base, defineConfig({
  build: { outDir: "target/qa-dist", emptyOutDir: true },
  plugins: [{
    name: "acceptance-harness", enforce: "pre",
    transformIndexHtml: { order: 'pre', handler(html) { return replaceOnce(html, '/src/main.tsx', '/tests/acceptance/qa/main.ts'); } },
    transform(source, id) {
      if (id.endsWith('/src/app/appearance.ts')) {
        source = `import { qaAppearance } from ${JSON.stringify(bridge)};\n` + source;
        source = replaceOnce(source, 'createAppearanceController({ storage, root:', 'createAppearanceController(qaAppearance({ storage, root:');
        return replaceOnce(source, 'native: isTauri() ? getCurrentWindow() : undefined });',
          'native: isTauri() ? getCurrentWindow() : undefined }));');
      }
      if (id.endsWith('/src/app/App.tsx')) {
        source = `import { observeApp } from ${JSON.stringify(bridge)};\n` + source;
        return replaceOnce(source, '  useEffect(() => { tabsRef.current = tabs; }, [tabs]);',
          `  observeApp(() => ({ rootId: root?.id, activeId, tabs: tabs.map(t => t.id),
            edits: Object.entries(edits).map(([id, e]) => ({ id, sessionId: e.sessionId,
              draft: e.draft, sequence: e.sequence, conflict: e.conflict ?? false,
              checkpointStatus: e.checkpointStatus, paused: e.paused ?? false })),
            recoveries: Object.keys(pendingRecoveries), readerScroll: readerRef.current?.scrollTop ?? 0 }));
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);`);
      }
    },
    generateBundle(_, bundle) {
      const code = Object.values(bundle).filter(item => item.type === 'chunk').map(item => item.code).join('');
      for (const marker of ['qa:snapshot-request', '__F002A_FAULT']) {
        if (!code.includes(marker)) throw new Error('QA entry missing: ' + marker);
      }
      this.emitFile({ type: 'asset', fileName: '.qa-marker', source: 'F002A-acceptance-harness-v1' });
    }
  }]
}));
