import { afterEach, describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api } from '@/lib/api';
import type { ApiError } from '@/core/models/errors';
import { add, getAll, remove } from './comments';
import type { Comment } from '../models/comment';

interface Captured {
  method?: string;
  url?: string;
  body?: unknown;
}

const comment: Comment = {
  id: '1',
  body: 'Thank you so much!',
  createdAt: '2024-01-01T00:00:00.000Z',
  author: { username: 'jake', bio: null, image: null, following: false },
};

function capture(responseData: unknown): Captured {
  const seen: Captured = {};
  api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    seen.method = config.method;
    seen.url = config.url;
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

describe('comments service', () => {
  it('getAll fetches /articles/:slug/comments and unwraps data.comments', async () => {
    const seen = capture({ comments: [comment] });

    const result = await getAll('the-slug');

    expect(seen.method).toBe('get');
    expect(seen.url).toBe('/articles/the-slug/comments');
    expect(result).toEqual([comment]);
  });

  it('add posts { comment: { body } } and unwraps data.comment', async () => {
    const seen = capture({ comment });

    const result = await add('the-slug', 'Thank you so much!');

    expect(seen.method).toBe('post');
    expect(seen.url).toBe('/articles/the-slug/comments');
    expect(seen.body).toEqual({ comment: { body: 'Thank you so much!' } });
    expect(result).toEqual(comment);
  });

  it('remove deletes /articles/:slug/comments/:id', async () => {
    const seen = capture(undefined);

    await remove('42', 'the-slug');

    expect(seen.method).toBe('delete');
    expect(seen.url).toBe('/articles/the-slug/comments/42');
  });

  it('propagates the normalized { ...body, status } error shape', async () => {
    failWith(422, { errors: { body: ["can't be blank"] } });

    await expect(add('the-slug', '')).rejects.toEqual({
      errors: { body: ["can't be blank"] },
      status: 422,
    } satisfies ApiError);
  });
});
