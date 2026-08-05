import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { getTags } from './tags';

const mockTags = ['angular', 'typescript', 'javascript', 'react'];

function respondWithTags(tags: unknown): void {
  server.use(mswHttp.get(`${API_URL}/tags`, () => HttpResponse.json({ tags })));
}

function respondWithStatus(status: number): void {
  server.use(mswHttp.get(`${API_URL}/tags`, () => HttpResponse.json({ errors: { tags: ['failed'] } }, { status })));
}

describe('tags api', () => {
  it('fetches all tags with GET /tags', async () => {
    let method = '';
    let pathname = '';
    server.use(
      mswHttp.get(`${API_URL}/tags`, ({ request }) => {
        method = request.method;
        pathname = new URL(request.url).pathname;
        return HttpResponse.json({ tags: mockTags });
      }),
    );

    const tags = await getTags();

    expect(method).toBe('GET');
    expect(pathname).toBe('/api/tags');
    expect(tags).toEqual(mockTags);
  });

  it('extracts the tags array from the response wrapper', async () => {
    respondWithTags(mockTags);
    const tags = await getTags();
    expect(Array.isArray(tags)).toBe(true);
    expect((tags as unknown as { tags?: unknown }).tags).toBeUndefined();
  });

  it('handles an empty tags list', async () => {
    respondWithTags([]);
    await expect(getTags()).resolves.toEqual([]);
  });

  it('handles a single tag', async () => {
    respondWithTags(['angular']);
    await expect(getTags()).resolves.toEqual(['angular']);
  });

  it('handles many tags', async () => {
    const manyTags = Array.from({ length: 100 }, (_, i) => `tag${i}`);
    respondWithTags(manyTags);
    const tags = await getTags();
    expect(tags.length).toBe(100);
    expect(tags[0]).toBe('tag0');
    expect(tags[99]).toBe('tag99');
  });

  it.each([
    ['special characters', ['c++', 'c#', 'node.js', 'vue.js', 'asp.net']],
    ['hyphens', ['web-development', 'machine-learning', 'test-driven-development']],
    ['underscores', ['web_dev', 'unit_testing', 'code_review']],
    ['numbers', ['angular17', 'vue3', 'react18', 'node20']],
    ['mixed case', ['Angular', 'TypeScript', 'JavaScript', 'RxJS']],
    ['spaces', ['web development', 'machine learning', 'data science']],
    ['duplicates', ['angular', 'angular', 'typescript', 'typescript']],
    ['unicode', ['日本語', '中文', 'español', 'français', '한국어']],
    ['emoji', ['🚀 rocket', '💻 coding', '🎨 design', '📱 mobile']],
    ['empty strings', ['', 'angular', '', 'typescript']],
    ['whitespace only', ['   ', '\t', '\n', 'valid']],
    ['URL characters', ['tag&param', 'tag?query', 'tag#hash', 'tag/path']],
    ['quotes', ['"quoted"', "'single'", 'normal']],
    ['backslashes', ['tag\\with\\backslash', 'normal']],
  ])('handles tags with %s', async (_label, tags) => {
    respondWithTags(tags);
    await expect(getTags()).resolves.toEqual(tags);
  });

  it('handles very long tag names', async () => {
    const longTag = 'a'.repeat(100);
    respondWithTags([longTag]);
    const tags = await getTags();
    expect(tags[0]).toBe(longTag);
  });

  it.each([500, 0, 504, 401, 403, 404])('rejects with status %i', async status => {
    if (status === 0) {
      server.use(mswHttp.get(`${API_URL}/tags`, () => HttpResponse.error()));
    } else {
      respondWithStatus(status);
    }
    await expect(getTags()).rejects.toMatchObject({ status });
  });

  it('rejects on a malformed 2XX body', async () => {
    server.use(mswHttp.get(`${API_URL}/tags`, () => new HttpResponse('invalid json', { status: 200 })));
    await expect(getTags()).rejects.toBeDefined();
  });

  it('returns null tags verbatim', async () => {
    respondWithTags(null);
    await expect(getTags()).resolves.toBeNull();
  });

  it('returns undefined when the response has no tags property', async () => {
    server.use(mswHttp.get(`${API_URL}/tags`, () => HttpResponse.json({})));
    await expect(getTags()).resolves.toBeUndefined();
  });

  it('makes one request per call', async () => {
    let calls = 0;
    server.use(
      mswHttp.get(`${API_URL}/tags`, () => {
        calls += 1;
        return HttpResponse.json({ tags: mockTags });
      }),
    );

    await Promise.all([getTags(), getTags(), getTags()]);
    expect(calls).toBe(3);
  });

  it('handles a large tag list efficiently', async () => {
    const largeTags = Array.from({ length: 1000 }, (_, i) => `tag${i}`);
    respondWithTags(largeTags);
    const tags = await getTags();
    expect(tags.length).toBe(1000);
  });
});
