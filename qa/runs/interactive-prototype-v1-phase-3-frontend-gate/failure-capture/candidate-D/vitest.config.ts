import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// jsdom and CodeMirror suites need independent DOMs, not eight competing
// browser simulations on the reference 8-core/16-GiB Mac. Keep parallelism
// and all assertion/test deadlines; do not retry or suppress failures.
export default mergeConfig(viteConfig, defineConfig({ test: { maxWorkers: 2 } }));
