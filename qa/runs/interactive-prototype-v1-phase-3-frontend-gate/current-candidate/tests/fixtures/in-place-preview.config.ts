// Frozen, disposable renderer preview; native operations are synthetic.
import { defineConfig, mergeConfig } from "vite";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import base from "../../vite.config";
export default mergeConfig(base, defineConfig({
  build: { outDir: resolve(tmpdir(), "intentgrove-in-place-preview-20261008"), emptyOutDir: false,
    rollupOptions: { input: resolve("tests/fixtures/redesign-preview.html") } }
}));
