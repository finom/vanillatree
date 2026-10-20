import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// the suite against src/, and with VANILLATREE_DIST=1 against dist/vanillatree.min.js, the ES5 script-tag bundle
// (npm run test:dist)
const target = process.env.VANILLATREE_DIST
  ? resolve(import.meta.dirname, 'test/dist-umd.js')
  : resolve(import.meta.dirname, 'src/vanillatree.ts');

export default defineConfig({
  test: {
    include: ['test/**/*.test.{js,ts}'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: true,
    // every line and branch of src is covered
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { lines: 100, statements: 100, branches: 100, functions: 100 }
    }
  },
  resolve: {
    alias: [{ find: /^vanillatree$/, replacement: target }]
  }
});
