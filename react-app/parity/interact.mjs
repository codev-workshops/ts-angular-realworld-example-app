/**
 * Interaction parity run: drives the same script against both apps and diffs a
 * full-page screenshot after every step, while also asserting the URL,
 * localStorage and link attributes.
 *
 * Requires the Angular app on :4200 and the React app on :4300.
 */
import { ANGULAR_URL, REACT_URL, diff, goto, launchBrowser, openApp, settle } from './harness.mjs';

const AUTHED = { token: 'parity-token' };

/**
 * Each step is applied to both apps. `do` receives the page; `expect` receives a
 * snapshot of URL/localStorage/attributes taken afterwards in both apps and they
 * are compared with each other as well as against the step's expectations.
 */
const SCENARIOS = [
  {
    name: 'home-anon',
    url: '/',
    steps: [
      {
        name: 'hover-first-preview',
        run: page => page.hover('.article-preview .preview-link h1'),
      },
      {
        name: 'focus-tag-pill',
        run: page => page.focus('.sidebar .tag-list a'),
      },
      {
        name: 'click-tag-pill',
        run: page => page.click('.sidebar .tag-list a >> nth=0'),
        expectUrl: '/tag/ai',
      },
      {
        name: 'click-conduit-brand',
        run: page => page.click('.navbar-brand'),
        expectUrl: '/',
      },
      {
        name: 'click-first-article',
        run: page => page.click('.article-preview .preview-link >> nth=0'),
        expectUrl: '/article/how-to-learn-javascript-efficiently',
      },
      {
        name: 'favorite-as-anon-redirects-to-register',
        run: async page => {
          await page.goBack();
          await settle(page);
          await page.click('.article-preview button >> nth=0');
        },
        expectUrl: '/register',
      },
    ],
  },
  {
    name: 'home-paginated',
    url: '/',
    mock: { articles: 'many' },
    steps: [
      { name: 'page-2', run: page => page.click('.pagination .page-link >> nth=1'), expectUrl: '/?page=2' },
      { name: 'page-3', run: page => page.click('.pagination .page-link >> nth=2'), expectUrl: '/?page=3' },
      { name: 'back-to-page-1', run: page => page.click('.pagination .page-link >> nth=0'), expectUrl: '/' },
    ],
  },
  {
    name: 'home-authed',
    url: '/',
    ...AUTHED,
    mock: { feed: 'default' },
    steps: [
      { name: 'your-feed', run: page => page.click('.feed-toggle .nav-link >> nth=0'), expectUrl: '/?feed=following' },
      { name: 'global-feed', run: page => page.click('.feed-toggle .nav-link >> nth=1'), expectUrl: '/' },
      { name: 'favorite-first-article', run: page => page.click('.article-preview button >> nth=0') },
      { name: 'unfavorite-first-article', run: page => page.click('.article-preview button >> nth=0') },
      { name: 'nav-new-article', run: page => page.click('.navbar .nav-link >> nth=1'), expectUrl: '/editor' },
      { name: 'nav-settings', run: page => page.click('.navbar .nav-link >> nth=2'), expectUrl: '/settings' },
      { name: 'nav-profile', run: page => page.click('.navbar .nav-link >> nth=3'), expectUrl: '/profile/johndoe' },
      {
        name: 'profile-favorites-tab',
        run: page => page.click('.articles-toggle .nav-link >> nth=1'),
        expectUrl: '/profile/johndoe/favorites',
      },
      {
        name: 'profile-my-posts-tab',
        run: page => page.click('.articles-toggle .nav-link >> nth=0'),
        expectUrl: '/profile/johndoe',
      },
    ],
  },
  {
    name: 'login-flow',
    url: '/login',
    steps: [
      {
        name: 'fill-credentials',
        run: async page => {
          await page.fill('input[type=text]', 'johndoe@example.com');
          await page.fill('input[type=password]', 'password');
        },
      },
      {
        name: 'submit',
        run: page => page.click('button[type=submit]'),
        expectUrl: '/',
        expectToken: 'parity-token',
      },
    ],
  },
  {
    name: 'register-flow',
    url: '/register',
    steps: [
      {
        name: 'fill-registration',
        run: async page => {
          await page.fill('input[type=text] >> nth=0', 'johndoe');
          await page.fill('input[type=text] >> nth=1', 'johndoe@example.com');
          await page.fill('input[type=password]', 'password');
        },
      },
      { name: 'submit', run: page => page.click('button[type=submit]'), expectUrl: '/', expectToken: 'parity-token' },
    ],
  },
  {
    name: 'article-interactions',
    url: '/article/react-hooks-best-practices',
    ...AUTHED,
    steps: [
      { name: 'follow-author', run: page => page.click('app-follow-button button >> nth=0') },
      { name: 'unfollow-author', run: page => page.click('app-follow-button button >> nth=0') },
      { name: 'favorite-article', run: page => page.click('app-favorite-button button >> nth=0') },
      { name: 'type-comment', run: page => page.fill('textarea', 'Nice write-up!') },
      { name: 'post-comment', run: page => page.click('.comment-form button[type=submit]') },
    ],
  },
  {
    name: 'editor-interactions',
    url: '/editor',
    ...AUTHED,
    steps: [
      {
        name: 'fill-article',
        run: async page => {
          await page.fill('input[placeholder="Article Title"]', 'A parity article');
          await page.fill('input[placeholder="What\'s this article about?"]', 'Testing');
          await page.fill('textarea', 'Body of the parity article.');
        },
      },
      {
        name: 'add-tag',
        run: async page => {
          await page.fill('input[placeholder="Enter tags"]', 'parity');
          await page.press('input[placeholder="Enter tags"]', 'Enter');
        },
      },
      {
        name: 'add-second-tag',
        run: async page => {
          await page.fill('input[placeholder="Enter tags"]', 'react');
          await page.press('input[placeholder="Enter tags"]', 'Enter');
        },
      },
      { name: 'remove-first-tag', run: page => page.click('.tag-list .ion-close-round >> nth=0') },
    ],
  },
  {
    name: 'settings-logout',
    url: '/settings',
    ...AUTHED,
    steps: [
      { name: 'edit-bio', run: page => page.fill('textarea', 'Updated bio for parity run.') },
      { name: 'logout', run: page => page.click('.btn-outline-danger'), expectUrl: '/', expectToken: null },
    ],
  },
];

async function snapshot(page) {
  return page.evaluate(() => ({
    token: window.localStorage.getItem('jwtToken'),
    links: [...document.querySelectorAll('a')].map(a => `${a.getAttribute('href')}|${a.target}|${a.rel}`),
  }));
}

const browser = await launchBrowser();
const failures = [];
let total = 0;

for (const scenario of SCENARIOS) {
  const angular = await openApp(browser, ANGULAR_URL, { ...scenario, viewport: { width: 1280, height: 900 } });
  const react = await openApp(browser, REACT_URL, { ...scenario, viewport: { width: 1280, height: 900 } });

  await Promise.all([goto(angular.page, ANGULAR_URL, scenario.url), goto(react.page, REACT_URL, scenario.url)]);

  for (const step of scenario.steps) {
    const name = `${scenario.name}--${step.name}`;
    total += 1;

    await Promise.all([step.run(angular.page), step.run(react.page)]);
    await Promise.all([settle(angular.page), settle(react.page)]);

    const problems = [];
    const [angularState, reactState] = await Promise.all([snapshot(angular.page), snapshot(react.page)]);
    const angularUrl = angular.page.url().replace(ANGULAR_URL, '');
    const reactUrl = react.page.url().replace(REACT_URL, '');

    if (angularUrl !== reactUrl) {
      problems.push(`url ${angularUrl} != ${reactUrl}`);
    }
    if (step.expectUrl && angularUrl !== step.expectUrl) {
      problems.push(`url ${angularUrl} != expected ${step.expectUrl}`);
    }
    if (angularState.token !== reactState.token) {
      problems.push(`token ${angularState.token} != ${reactState.token}`);
    }
    if ('expectToken' in step && angularState.token !== step.expectToken) {
      problems.push(`token ${angularState.token} != expected ${step.expectToken}`);
    }
    if (angularState.links.join(',') !== reactState.links.join(',')) {
      problems.push(
        `links differ:\n      angular ${angularState.links.join(' ')}\n      react   ${reactState.links.join(' ')}`,
      );
    }

    const { mismatch, note } = await diff(name, angular.page, react.page);
    if (mismatch !== 0) {
      problems.push(`mismatch=${mismatch}${note ? ` (${note})` : ''}`);
    }

    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${name} mismatch=${mismatch}${note ? ` ${note}` : ''}`);
    if (problems.length) {
      failures.push(`${name}: ${problems.join('; ')}`);
    }
  }

  await angular.context.close();
  await react.context.close();
}

await browser.close();

console.log(`\n${total - failures.length}/${total} interaction steps at 0 mismatched pixels`);
if (failures.length) {
  console.log(failures.map(failure => `  - ${failure}`).join('\n'));
  process.exit(1);
}
