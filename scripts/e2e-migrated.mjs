#!/usr/bin/env node
/**
 * Runs Playwright over the specs listed in e2e-migrated-specs.txt only.
 *
 * Used by CI while the Angular -> React migration is in flight: the copied e2e suite is the
 * parity gate for the finished app, so specs covering not-yet-ported pages must not fail the
 * build. Extra CLI args are forwarded to `playwright test` (e.g. --grep @security).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const listFile = join(root, 'e2e-migrated-specs.txt');

const specs = existsSync(listFile)
  ? readFileSync(listFile, 'utf8')
      .split('\n')
      .map(line => line.replace(/#.*$/, '').trim())
      .filter(Boolean)
  : [];

if (specs.length === 0) {
  console.log('No specs are marked as migrated yet - skipping Playwright run.');
  process.exit(0);
}

const playwright = join(root, 'node_modules', '.bin', 'playwright');
const args = ['test', ...process.argv.slice(2), ...specs.map(spec => join('e2e', spec))];
const { status } = spawnSync(playwright, args, { stdio: 'inherit', cwd: root });
process.exit(status ?? 1);
