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
      if (process.env.VITE_QA_SETTINGS_ACCEPTANCE === '1' && id.endsWith('/src/main.tsx')) {
        source = `import {rootOwner} from ${JSON.stringify(resolve('tests/acceptance/settings/observer.ts'))};\n` + source;
        return replaceOnce(source, 'createRoot(document.getElementById("root")!).render(', 'const qaRoot=createRoot(document.getElementById("root")!); rootOwner(()=>qaRoot.unmount()); qaRoot.render(');
      }
      if (process.env.VITE_QA_SETTINGS_ACCEPTANCE === '1' && id.endsWith('/src/app/useSettingsOwner.ts')) {
        source = `import {ownerTrace, stopOwner} from ${JSON.stringify(resolve('tests/acceptance/settings/observer.ts'))};\n` + source;
        source=replaceOnce(source,'      if (disposed) return;\n      const previous = snapshot;','      if (disposed) return;\n      ownerTrace("accept",next); const previous = snapshot;');
        return replaceOnce(source,'        const stop = await listen(event, handler as (event: { payload: unknown }) => void);','        const nativeStop = await listen(event, handler as (event: { payload: unknown }) => void); ownerTrace("register",event); const stop=()=>stopOwner(event,nativeStop);');
      }
      if (id.endsWith('/src/app/appearance.ts')) {
        source = `import { qaAppearance } from ${JSON.stringify(bridge)};\n` + source;
        source = replaceOnce(source, 'createAppearanceController({ storage, root:', 'createAppearanceController(qaAppearance({ storage, root:');
        return replaceOnce(source, 'native: isTauri() && !new URLSearchParams(location.search).has("settings") ? getCurrentWindow() : undefined });',
          'native: isTauri() && !new URLSearchParams(location.search).has("settings") ? getCurrentWindow() : undefined }));');
      }
      if (id.endsWith('/src/app/App.tsx')) {
        source = `import { observeApp, traceClose } from ${JSON.stringify(bridge)};\n` + source;
        source = replaceOnce(source, '  async function resolveClose(choice: "save" | "keep" | "discard" | "cancel") {',
          '  async function resolveClose(choice: "save" | "keep" | "discard" | "cancel") { traceClose("resolve:" + choice + ":" + closeIntent?.kind);');
        source = replaceOnce(source, '      flushSync(() => setCloseIntent(null));',
          '      flushSync(() => setCloseIntent(null)); traceClose("committed:" + intent.kind);');
        source = replaceOnce(source, '      await finishClose(intent.kind === "app");',
          '      traceClose("commit-complete"); await finishClose(intent.kind === "app");');
        source = replaceOnce(source, '  async function finishClose(quit: boolean) {',
          '  async function finishClose(quit: boolean) { traceClose("finish:" + quit + ":ready:" + sessionReadyRef.current);');
        source = replaceOnce(source, '      await api.finishEditingClose(quit);',
          '      traceClose("native-close:" + quit); await api.finishEditingClose(quit);');
        if(process.env.VITE_QA_SETTINGS_ACCEPTANCE === '1') {
          source=`import {ownerObservation, readerResult} from ${JSON.stringify(resolve('tests/acceptance/settings/observer.ts'))};\n`+source;
        }
        return replaceOnce(source, '  useLayoutEffect(() => { tabsRef.current = tabs; }, [tabs]);',
          `  observeApp(() => ({ ${process.env.VITE_QA_SETTINGS_ACCEPTANCE === '1' ? 'sessionReady, restorePending:Boolean(restoreOffer), restoreTabCount:restoreOffer?.tabs.length??0, restoreHasRoot:Boolean(restoreOffer?.root), settingsListenerCount:ownerObservation().listeners, accepted22:ownerObservation().accepted22, restoredAfter22:ownerObservation().restoredAfter22, probeDone:readerResult.done, probePassed:readerResult.passed,' : ''} rootId: root?.id, activeId, tabs: tabs.map(t => t.id),
            edits: Object.entries(edits).map(([id, e]) => ({ id, sessionId: e.sessionId,
              draft: e.draft, editorJson: e.initialEditorJson, sequence: e.sequence, conflict: e.conflict ?? false,
              checkpointStatus: e.checkpointStatus, paused: e.paused ?? false })),
            recoveries: Object.keys(pendingRecoveries), readerScroll: readerRef.current?.scrollTop ?? 0 }));
  useLayoutEffect(() => { tabsRef.current = tabs; }, [tabs]);`);
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
