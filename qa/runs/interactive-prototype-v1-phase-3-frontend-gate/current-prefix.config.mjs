import {mergeConfig} from "/Users/juanmantilla/projects/personal/md-reader/node_modules/vite/dist/node/index.js";
import {BaseSequencer} from "/Users/juanmantilla/projects/personal/md-reader/node_modules/vitest/dist/node.js";
import base from "/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/diagnostic-candidate/vitest.config.ts";
import {basename} from "node:path";
const order=["close-edit.test.tsx", "workspace-handoff.test.tsx"];
class Order extends BaseSequencer{async sort(files){return [...files].sort((a,b)=>order.indexOf(basename(a.moduleId))-order.indexOf(basename(b.moduleId)));}}
export default mergeConfig(base,{test:{sequence:{sequencer:Order}}});
