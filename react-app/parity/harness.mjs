/**
 * Shared plumbing for the parity scripts: opens the Angular and React apps side
 * by side with identical fixtures, screenshots them and diffs with pixelmatch.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { mockApi } from './api-mock.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export const OUTPUT_DIR = join(here, 'output');
export const ANGULAR_URL = process.env.ANGULAR_URL ?? 'http://localhost:4200';
export const REACT_URL = process.env.REACT_URL ?? 'http://localhost:4300';

/** pixelmatch tolerance. Kept at 0 so only byte-identical pixels pass. */
export const PIXEL_THRESHOLD = 0;

const SETTLE_CSS = `
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    caret-color: transparent !important;
  }
`;

/**
 * Partial raster lets Chromium reuse previously rastered tiles, which makes the
 * antialiasing of rounded borders depend on the paint history of the page rather
 * than only on its final state. Both apps are launched with it off so a capture
 * depends solely on what is on screen.
 */
export function launchBrowser() {
  return chromium.launch({
    args: ['--disable-partial-raster', '--disable-composited-antialiasing', '--force-color-profile=srgb'],
  });
}

export async function openApp(browser, baseUrl, { token, viewport, mock }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });

  // Injected before any app code runs: a transition frozen half way through (for
  // example an input border reacting to focus) would otherwise sample a slightly
  // different colour in each app.
  await context.addInitScript(css => {
    const apply = () => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    };
    if (document.head) {
      apply();
    } else {
      document.addEventListener('DOMContentLoaded', apply);
    }
  }, SETTLE_CSS);

  if (token) {
    await context.addInitScript(value => window.localStorage.setItem('jwtToken', value), token);
  }

  const page = await context.newPage();
  await mockApi(page, mock ?? {});
  return { context, page };
}

export async function settle(page) {
  // A click may only kick off its request on the next tick, so give the app a
  // moment before asking for network idle.
  await page.waitForTimeout(150);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

export async function goto(page, baseUrl, url) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

/**
 * Diffs two full-page screenshots. Returns the number of mismatched pixels and
 * writes the two captures plus a diff image when they differ.
 */
export async function diff(name, angularPage, reactPage) {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Sequential and repeated until the page rasterises identically twice, so a
  // late repaint can never be mistaken for a parity failure.
  const angularBuffer = await stableScreenshot(angularPage);
  const reactBuffer = await stableScreenshot(reactPage);

  const angularPng = PNG.sync.read(angularBuffer);
  const reactPng = PNG.sync.read(reactBuffer);

  if (angularPng.width !== reactPng.width || angularPng.height !== reactPng.height) {
    writeFileSync(join(OUTPUT_DIR, `${name}.angular.png`), angularBuffer);
    writeFileSync(join(OUTPUT_DIR, `${name}.react.png`), reactBuffer);
    return {
      mismatch: Infinity,
      note: `size ${angularPng.width}x${angularPng.height} vs ${reactPng.width}x${reactPng.height}`,
    };
  }

  const output = new PNG({ width: angularPng.width, height: angularPng.height });
  const mismatch = pixelmatch(angularPng.data, reactPng.data, output.data, angularPng.width, angularPng.height, {
    threshold: PIXEL_THRESHOLD,
  });

  if (mismatch > 0) {
    writeFileSync(join(OUTPUT_DIR, `${name}.angular.png`), angularBuffer);
    writeFileSync(join(OUTPUT_DIR, `${name}.react.png`), reactBuffer);
    writeFileSync(join(OUTPUT_DIR, `${name}.diff.png`), PNG.sync.write(output));
  }

  return { mismatch, note: '' };
}

async function stableScreenshot(page, attempts = 4) {
  let previous = await page.screenshot({ fullPage: true });
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await page.waitForTimeout(150);
    const next = await page.screenshot({ fullPage: true });
    if (next.equals(previous)) {
      return next;
    }
    previous = next;
  }
  return previous;
}

export function saveShot(name, buffer) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, name), buffer);
}
