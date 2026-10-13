import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../../vite.config.ts';
export default mergeConfig(base,defineConfig({test:{maxWorkers:Number(process.env.INTENTGROVE_WORKERS??2),include:process.env.INTENTGROVE_FULL==='1'?['tests/**/*.test.{ts,tsx}','tests/diagnostics/reliability/generated/*.diagnostic.tsx']:['tests/diagnostics/reliability/generated/*.diagnostic.tsx'],exclude:['tests/ui/workspace-handoff.test.tsx','tests/ui/close-edit.test.tsx']}}));
