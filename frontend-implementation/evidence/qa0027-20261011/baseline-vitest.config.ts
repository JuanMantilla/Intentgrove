import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../../vitest.config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export default mergeConfig(base, defineConfig({ plugins: [{
  name: 'qa0027-before-app', enforce: 'pre',
  transform(_source, id) {
    if (id === resolve('src/app/App.tsx')) return readFileSync(resolve('frontend-implementation/evidence/qa0027-20261011/before/src/app/App.tsx'), 'utf8');
  }
}] }));
