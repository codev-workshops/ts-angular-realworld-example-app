/**
 * Static parity run: every case in cases.mjs x every viewport, screenshotted in
 * both apps against the same fixtures and diffed pixel by pixel.
 *
 * Requires the Angular app on :4200 and the React app on :4300.
 */
import { CASES, VIEWPORTS } from './cases.mjs';
import { ANGULAR_URL, REACT_URL, diff, goto, launchBrowser, openApp } from './harness.mjs';

const only = process.argv[2];

const browser = await launchBrowser();
const failures = [];
let total = 0;

for (const testCase of CASES) {
  for (const viewport of VIEWPORTS) {
    const name = `${testCase.name}--${viewport.name}`;
    if (only && !name.includes(only)) {
      continue;
    }
    total += 1;

    const angular = await openApp(browser, ANGULAR_URL, { ...testCase, viewport });
    const react = await openApp(browser, REACT_URL, { ...testCase, viewport });

    await Promise.all([goto(angular.page, ANGULAR_URL, testCase.url), goto(react.page, REACT_URL, testCase.url)]);

    const problems = [];

    if (testCase.expectUrl) {
      for (const [label, page, base] of [
        ['angular', angular.page, ANGULAR_URL],
        ['react', react.page, REACT_URL],
      ]) {
        const actual = page.url().replace(base, '');
        if (actual !== testCase.expectUrl) {
          problems.push(`${label} url ${actual} != ${testCase.expectUrl}`);
        }
      }
    }

    const angularUrl = angular.page.url().replace(ANGULAR_URL, '');
    const reactUrl = react.page.url().replace(REACT_URL, '');
    if (angularUrl !== reactUrl) {
      problems.push(`url ${angularUrl} != ${reactUrl}`);
    }

    const { mismatch, note } = await diff(name, angular.page, react.page);
    if (mismatch !== 0) {
      problems.push(`mismatch=${mismatch}${note ? ` (${note})` : ''}`);
    }

    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${name} mismatch=${mismatch}${note ? ` ${note}` : ''}`);
    if (problems.length) {
      failures.push(`${name}: ${problems.join('; ')}`);
    }

    await angular.context.close();
    await react.context.close();
  }
}

await browser.close();

console.log(`\n${total - failures.length}/${total} cases at 0 mismatched pixels`);
if (failures.length) {
  console.log(failures.map(failure => `  - ${failure}`).join('\n'));
  process.exit(1);
}
