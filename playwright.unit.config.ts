import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/unit',
  testMatch: '**/*.test.ts',
  reporter: 'list',
  outputDir: join(tmpdir(), `digger-delta-skin-unit-results-${process.pid}`),
  use: { browserName: 'chromium' },
});
