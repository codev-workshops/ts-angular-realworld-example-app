/**
 * Replays parity/fixtures/recorded.json into a Playwright page so the Angular and
 * React apps receive byte-identical API responses. Remote avatars are served from
 * a committed fixture image for the same reason.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(here, 'fixtures', 'recorded.json'), 'utf8'));
const avatar = readFileSync(join(here, 'fixtures', 'avatar.png'));

export const API_PREFIX = 'https://api.realworld.show/api';

export const CURRENT_USER = {
  email: 'johndoe@example.com',
  token: 'parity-token',
  username: 'johndoe',
  bio: fixtures.profiles.johndoe.bio,
  image: fixtures.profiles.johndoe.image,
};

/** Deterministically expands the recorded articles into `count` distinct ones. */
function manyArticles(count) {
  const base = fixtures.articles;
  return Array.from({ length: count }, (_value, index) => {
    const article = base[index % base.length];
    return {
      ...article,
      slug: `${article.slug}-${index + 1}`,
      title: `${article.title} (${index + 1})`,
      favoritesCount: (article.favoritesCount + index) % 7,
    };
  });
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ articles?: 'default' | 'many' | 'empty', user?: 'ok' | 'unauthorized' | 'unavailable',
 *           articleStatus?: number, profileStatus?: number, feed?: 'empty' | 'default' }} options
 */
export async function mockApi(page, options = {}) {
  const {
    articles: articleSet = 'default',
    user: userMode = 'ok',
    articleStatus = 200,
    profileStatus = 200,
    feed = 'empty',
  } = options;

  const allArticles =
    articleSet === 'many' ? manyArticles(25) : articleSet === 'empty' ? [] : fixtures.articles.slice();

  await page.route(/^https:\/\/raw\.githubusercontent\.com\/.*/, route =>
    route.fulfill({ status: 200, contentType: 'image/png', body: avatar }),
  );

  await page.route(`${API_PREFIX}/**`, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api', '');
    const method = route.request().method();
    const query = url.searchParams;

    if (path === '/user') {
      if (userMode === 'unauthorized') {
        return json(route, { errors: { token: ['is invalid'] } }, 401);
      }
      if (userMode === 'unavailable') {
        return json(route, { errors: { server: ['is unavailable'] } }, 503);
      }
      return json(route, { user: CURRENT_USER });
    }

    if (path === '/tags') {
      return json(route, { tags: fixtures.tags });
    }

    if (path === '/articles/feed') {
      const list = feed === 'default' ? allArticles : [];
      return json(route, { articles: list, articlesCount: list.length });
    }

    if (path === '/articles' && method === 'GET') {
      let list = allArticles;
      const tag = query.get('tag');
      const author = query.get('author');
      const favorited = query.get('favorited');
      if (tag) {
        list = list.filter(article => article.tagList.includes(tag));
      }
      if (author) {
        list = list.filter(article => article.author.username === author);
      }
      if (favorited) {
        list = [];
      }
      const offset = Number(query.get('offset') ?? 0);
      const limit = Number(query.get('limit') ?? list.length);
      return json(route, { articles: list.slice(offset, offset + limit), articlesCount: list.length });
    }

    const articleMatch = /^\/articles\/([^/]+)$/.exec(path);
    if (articleMatch && method === 'GET') {
      if (articleStatus !== 200) {
        return json(route, { errors: { article: ['not found'] } }, articleStatus);
      }
      const slug = articleMatch[1];
      const detail = fixtures.articleDetails[slug];
      if (!detail) {
        return json(route, { errors: { article: ['not found'] } }, 404);
      }
      return json(route, { article: detail });
    }

    const commentsMatch = /^\/articles\/([^/]+)\/comments$/.exec(path);
    if (commentsMatch && method === 'GET') {
      if (articleStatus !== 200) {
        return json(route, { errors: { article: ['not found'] } }, articleStatus);
      }
      return json(route, { comments: fixtures.comments[commentsMatch[1]] ?? [] });
    }

    if (commentsMatch && method === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      return json(route, {
        comment: {
          id: 9001,
          body: body.comment.body,
          createdAt: fixtures.comments[commentsMatch[1]]?.[0]?.createdAt ?? fixtures.articles[0].createdAt,
          updatedAt: fixtures.comments[commentsMatch[1]]?.[0]?.updatedAt ?? fixtures.articles[0].updatedAt,
          author: fixtures.profiles.johndoe,
        },
      });
    }

    const favoriteMatch = /^\/articles\/([^/]+)\/favorite$/.exec(path);
    if (favoriteMatch) {
      const detail = fixtures.articleDetails[favoriteMatch[1]] ?? fixtures.articles[0];
      return json(route, { article: { ...detail, favorited: method === 'POST' } });
    }

    const profileMatch = /^\/profiles\/([^/]+)$/.exec(path);
    if (profileMatch) {
      if (profileStatus !== 200) {
        return json(route, { errors: { profile: ['not found'] } }, profileStatus);
      }
      const profile = fixtures.profiles[profileMatch[1]];
      if (!profile) {
        return json(route, { errors: { profile: ['not found'] } }, 404);
      }
      return json(route, { profile });
    }

    const followMatch = /^\/profiles\/([^/]+)\/follow$/.exec(path);
    if (followMatch) {
      const profile = fixtures.profiles[followMatch[1]] ?? fixtures.profiles.johndoe;
      return json(route, { profile: { ...profile, following: method === 'POST' } });
    }

    if (path === '/users/login' || path === '/users') {
      return json(route, { user: CURRENT_USER });
    }

    if (path === '/user' && method === 'PUT') {
      return json(route, { user: CURRENT_USER });
    }

    return json(route, { errors: { unmocked: [path] } }, 404);
  });
}

export { fixtures };
