/**
 * The parity matrix: every route of the app, in every auth state it can render,
 * at desktop and mobile viewports. `mock` selects the fixture variant that the
 * case needs (pagination, empty lists, error responses).
 */
export const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

const AUTHED = { token: 'parity-token' };

export const CASES = [
  { name: 'home-global-anon', url: '/' },
  { name: 'home-global-authed', url: '/', ...AUTHED },
  { name: 'home-global-paginated', url: '/', mock: { articles: 'many' } },
  { name: 'home-page-2', url: '/?page=2', mock: { articles: 'many' } },
  { name: 'home-empty', url: '/', mock: { articles: 'empty' } },
  { name: 'home-auth-unavailable', url: '/', ...AUTHED, mock: { user: 'unavailable' } },
  { name: 'home-token-rejected', url: '/', ...AUTHED, mock: { user: 'unauthorized' } },
  { name: 'home-feed-empty', url: '/?feed=following', ...AUTHED },
  { name: 'home-feed-articles', url: '/?feed=following', ...AUTHED, mock: { feed: 'default' } },
  { name: 'tag-javascript', url: '/tag/javascript' },
  { name: 'tag-unknown-empty', url: '/tag/nothing-here' },
  { name: 'login', url: '/login' },
  { name: 'register', url: '/register' },
  { name: 'settings', url: '/settings', ...AUTHED },
  { name: 'settings-anon-redirects-to-login', url: '/settings', expectUrl: '/login' },
  { name: 'editor-new', url: '/editor', ...AUTHED },
  { name: 'editor-existing', url: '/editor/how-to-learn-javascript-efficiently', ...AUTHED },
  { name: 'article-anon', url: '/article/how-to-learn-javascript-efficiently' },
  { name: 'article-author', url: '/article/how-to-learn-javascript-efficiently', ...AUTHED },
  { name: 'article-other-author', url: '/article/react-hooks-best-practices', ...AUTHED },
  { name: 'article-not-found', url: '/article/does-not-exist', mock: { articleStatus: 404 } },
  { name: 'article-server-error', url: '/article/how-to-learn-javascript-efficiently', mock: { articleStatus: 500 } },
  { name: 'profile-own', url: '/profile/johndoe', ...AUTHED },
  { name: 'profile-own-anon', url: '/profile/johndoe' },
  { name: 'profile-other', url: '/profile/janesmith', ...AUTHED },
  { name: 'profile-favorites-empty', url: '/profile/johndoe/favorites' },
  { name: 'profile-not-found', url: '/profile/ghost', mock: { profileStatus: 404 } },
];
