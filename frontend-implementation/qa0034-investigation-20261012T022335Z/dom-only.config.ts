import { mergeConfig } from "vitest/config";
import base from "/Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source/vitest.config.ts";
export default mergeConfig(base, { test: { setupFiles: ["/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0034-investigation-20261012T022335Z/dom-only-setup.ts"] } });
