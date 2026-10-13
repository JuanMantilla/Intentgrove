import { defineConfig, mergeConfig } from "vitest/config";
import base from "../../../../vite.config";
export default mergeConfig(base,defineConfig({test:{maxWorkers:8,include:["tests/**/*.test.{ts,tsx}","qa/runs/macos-remaining-20261008/reliability/*.diagnostic.tsx"],exclude:["tests/ui/workspace-handoff.test.tsx","tests/ui/close-edit.test.tsx"]}}));
