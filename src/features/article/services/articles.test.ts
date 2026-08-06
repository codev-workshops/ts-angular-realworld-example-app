import { afterEach, describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api } from '@/lib/api';
import type { ApiError } from '@/core/models/errors';
import { create, favorite, get, query, remove, unfavorite, update } from './articles';
import type { Article } from '../models/article';
import type { ArticleListConfig } from '../models/article-list-config';

interface Captured {
  method?: string;
  url?: string;
  params?: unknown;
  body?: unknown;
}

const article: Article = {
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body: 'It takes a Jacobian',
  tagList: ['dragons', 'training'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  favorited: false,
  favoritesCount: 0,
  author: { username: 'jake', bio: null, image: null, following: false },
};

function capture(responseData: unknown): Captured {
  const seen: Captured = {};
  api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    seen.method = config.method;
    seen.url = config.url;
    seen.params = config.params;
    seen.body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    return Promise.resolve({
      data: responseData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse);
  };
  return seen;
}

function failWith(status: number, data?: unknown) {
  api.defaults.adapter = config =>
    Promise.reject(
      new AxiosError('failed', 'ERR', config, null, { data, status, statusText: '', headers: {}, config }),
    );
}

afterEach(() => {
  delete api.defaults.adapter;
});

describe('articles service', () => {
  it('query hits /articles with the config filters as params', async () => {
    const seen = capture({ articles: [article], articlesCount: 1 });
    const config: ArticleListConfig = { type: 'all', filters: { tag: 'dragons', limit: 10, offset: 0 } };

    const result = await query(config);

    expect(seen.method).toBe('get');
    expect(seen.url).toBe('/articles');
    expect(seen.params).toEqual({ tag: 'dragons', limit: 10, offset: 0 });
    expect(result).toEqual({ articles: [article], articlesCount: 1 });
  });

  it('query hits /articles/feed for feed configs and omits undefined filters', async () => {
    const seen = capture({ articles: [], articlesCount: 0 });

    await query({ type: 'feed', filters: { limit: 10, offset: undefined } });

    expect(seen.url).toBe('/articles/feed');
    expect(seen.params).toEqual({ limit: 10 });
  });

  it('get fetches a single article by slug and unwraps data.article', async () => {
    const seen = capture({ article });

    const result = await get('how-to-train-your-dragon');

    expect(seen.method).toBe('get');
    expect(seen.url).toBe('/articles/how-to-train-your-dragon');
    expect(result).toEqual(article);
  });

  it('create posts { article } to /articles/ and unwraps data.article', async () => {
    const seen = capture({ article });
    const payload = { title: 'How to train your dragon', description: 'd', body: 'b', tagList: ['dragons'] };

    const result = await create(payload);

    expect(seen.method).toBe('post');
    expect(seen.url).toBe('/articles/');
    expect(seen.body).toEqual({ article: payload });
    expect(result).toEqual(article);
  });

  it('update puts { article } to /articles/:slug and unwraps data.article', async () => {
    const seen = capture({ article });
    const payload = { slug: 'how-to-train-your-dragon', title: 'new title' };

    const result = await update(payload);

    expect(seen.method).toBe('put');
    expect(seen.url).toBe('/articles/how-to-train-your-dragon');
    expect(seen.body).toEqual({ article: payload });
    expect(result).toEqual(article);
  });

  it('remove deletes /articles/:slug', async () => {
    const seen = capture(undefined);

    await remove('how-to-train-your-dragon');

    expect(seen.method).toBe('delete');
    expect(seen.url).toBe('/articles/how-to-train-your-dragon');
  });

  it('favorite posts to /articles/:slug/favorite and unwraps data.article', async () => {
    const seen = capture({ article: { ...article, favorited: true } });

    const result = await favorite('how-to-train-your-dragon');

    expect(seen.method).toBe('post');
    expect(seen.url).toBe('/articles/how-to-train-your-dragon/favorite');
    expect(seen.body).toEqual({});
    expect(result.favorited).toBe(true);
  });

  it('unfavorite deletes /articles/:slug/favorite', async () => {
    const seen = capture(undefined);

    await unfavorite('how-to-train-your-dragon');

    expect(seen.method).toBe('delete');
    expect(seen.url).toBe('/articles/how-to-train-your-dragon/favorite');
  });

  it('propagates the normalized { ...body, status } error shape', async () => {
    failWith(422, { errors: { title: ["can't be blank"] } });

    await expect(create({ title: '' })).rejects.toEqual({
      errors: { title: ["can't be blank"] },
      status: 422,
    } satisfies ApiError);
  });
});
