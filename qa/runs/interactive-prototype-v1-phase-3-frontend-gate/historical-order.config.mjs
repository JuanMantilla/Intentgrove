import { mergeConfig } from "/Users/juanmantilla/projects/personal/md-reader/node_modules/vite/dist/node/index.js";
import { BaseSequencer } from "/Users/juanmantilla/projects/personal/md-reader/node_modules/vitest/dist/node.js";
import base from "/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-verification-unblock/regression-candidate-final/vitest.config.ts";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
const order=JSON.parse(readFileSync("/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/frontend-v3-results-order.json","utf8")).map(x=>x.file);
class HistoricalOrder extends BaseSequencer { async sort(files) { return [...files].sort((a,b)=>order.indexOf(basename(a.moduleId))-order.indexOf(basename(b.moduleId))); } }
export default mergeConfig(base,{test:{sequence:{sequencer:HistoricalOrder}}});
