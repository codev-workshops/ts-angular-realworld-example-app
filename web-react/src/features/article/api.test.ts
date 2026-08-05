import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import {
  createArticle,
  deleteArticle,
  favoriteArticle,
  getArticle,
  queryArticles,
  unfavoriteArticle,
  updateArticle,
} from './api';
import { ArticleListConfig } from './list-config';
import { Article } from './model';

const mockArticle: Article = {
  slug: 'test-article',
  title: 'Test Article',
  description: 'Test description',
  body: 'Test body content',
  tagList: ['test', 'angular'],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-02',
  favorited: false,
  favoritesCount: 5,
  author: {
    username: 'testuser',
    bio: 'Test bio',
    image: 'https://example.com/avatar.jpg',
    following: false,
  },
};

const mockArticleList: Article[] = [mockArticle, { ...mockArticle, slug: 'second-article', title: 'Second Article' }];

describe('articles api', () => {
  describe('queryArticles', () => {
    it('fetches articles with default config', async () => {
      let method = '';
      server.use(
        mswHttp.get(`${API_URL}/articles`, ({ request }) => {
          method = request.method;
          return HttpResponse.json({ articles: mockArticleList, articlesCount: 2 });
        }),
      );

      const config: ArticleListConfig = { type: 'all', filters: {} };
      const response = await queryArticles(config);

      expect(method).toBe('GET');
      expect(response.articles).toEqual(mockArticleList);
      expect(response.articlesCount).toBe(2);
    });

    it('fetches feed articles when type is feed', async () => {
      let method = '';
      server.use(
        mswHttp.get(`${API_URL}/articles/feed`, ({ request }) => {
          method = request.method;
          return HttpResponse.json({ articles: mockArticleList, articlesCount: 2 });
        }),
      );

      await queryArticles({ type: 'feed', filters: {} });
      expect(method).toBe('GET');
    });

    it('includes query parameters from filters', async () => {
      let url: URL | undefined;
      server.use(
        mswHttp.get(`${API_URL}/articles`, ({ request }) => {
          url = new URL(request.url);
          return HttpResponse.json({ articles: mockArticleList, articlesCount: 2 });
        }),
      );

      await queryArticles({
        type: 'all',
        filters: { tag: 'angular', author: 'testuser', limit: 10, offset: 0 },
      });

      expect(url?.pathname).toBe('/api/articles');
      expect(url?.searchParams.get('tag')).toBe('angular');
      expect(url?.searchParams.get('author')).toBe('testuser');
      expect(url?.searchParams.get('limit')).toBe('10');
      expect(url?.searchParams.get('offset')).toBe('0');
    });

    it('handles pagination parameters', async () => {
      let url: URL | undefined;
      server.use(
        mswHttp.get(`${API_URL}/articles`, ({ request }) => {
          url = new URL(request.url);
          return HttpResponse.json({ articles: mockArticleList, articlesCount: 100 });
        }),
      );

      await queryArticles({ type: 'all', filters: { limit: 20, offset: 40 } });

      expect(url?.searchParams.get('limit')).toBe('20');
      expect(url?.searchParams.get('offset')).toBe('40');
    });

    it('handles empty results', async () => {
      server.use(mswHttp.get(`${API_URL}/articles`, () => HttpResponse.json({ articles: [], articlesCount: 0 })));

      const response = await queryArticles({ type: 'all', filters: {} });
      expect(response.articles).toEqual([]);
      expect(response.articlesCount).toBe(0);
    });
  });

  describe('getArticle', () => {
    it('fetches a single article by slug', async () => {
      let method = '';
      server.use(
        mswHttp.get(`${API_URL}/articles/test-article`, ({ request }) => {
          method = request.method;
          return HttpResponse.json({ article: mockArticle });
        }),
      );

      const article = await getArticle('test-article');
      expect(method).toBe('GET');
      expect(article).toEqual(mockArticle);
    });

    it('handles article not found', async () => {
      server.use(
        mswHttp.get(`${API_URL}/articles/non-existent`, () =>
          HttpResponse.json({ errors: { article: ['not found'] } }, { status: 404 }),
        ),
      );

      await expect(getArticle('non-existent')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('deleteArticle', () => {
    it('deletes an article by slug', async () => {
      let method = '';
      server.use(
        mswHttp.delete(`${API_URL}/articles/article-to-delete`, ({ request }) => {
          method = request.method;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      await deleteArticle('article-to-delete');
      expect(method).toBe('DELETE');
    });

    it('handles delete error', async () => {
      server.use(
        mswHttp.delete(`${API_URL}/articles/protected-article`, () =>
          HttpResponse.json({ errors: { article: ['forbidden'] } }, { status: 403 }),
        ),
      );

      await expect(deleteArticle('protected-article')).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('createArticle', () => {
    it('creates a new article', async () => {
      const newArticle: Partial<Article> = {
        title: 'New Article',
        description: 'New description',
        body: 'New body',
        tagList: ['new', 'test'],
      };
      let method = '';
      let body: unknown;
      let pathname = '';
      server.use(
        mswHttp.post(`${API_URL}/articles/`, async ({ request }) => {
          method = request.method;
          pathname = new URL(request.url).pathname;
          body = await request.json();
          return HttpResponse.json({ article: { ...mockArticle, ...newArticle } });
        }),
      );

      const article = await createArticle(newArticle);

      expect(method).toBe('POST');
      expect(pathname).toBe('/api/articles/');
      expect(body).toEqual({ article: newArticle });
      expect(article.title).toBe(newArticle.title);
    });

    it('handles validation errors', async () => {
      server.use(
        mswHttp.post(`${API_URL}/articles/`, () =>
          HttpResponse.json({ errors: { title: ["can't be blank"] } }, { status: 422 }),
        ),
      );

      await expect(createArticle({ title: '', description: '', body: '' })).rejects.toMatchObject({ status: 422 });
    });
  });

  describe('updateArticle', () => {
    it('updates an existing article', async () => {
      const updates: Partial<Article> = {
        slug: 'existing-article',
        title: 'Updated Title',
        description: 'Updated description',
      };
      let method = '';
      let body: unknown;
      server.use(
        mswHttp.put(`${API_URL}/articles/existing-article`, async ({ request }) => {
          method = request.method;
          body = await request.json();
          return HttpResponse.json({ article: { ...mockArticle, ...updates } });
        }),
      );

      const article = await updateArticle(updates);

      expect(method).toBe('PUT');
      expect(body).toEqual({ article: updates });
      expect(article.title).toBe(updates.title);
    });
  });

  describe('favoriteArticle', () => {
    it('favorites an article', async () => {
      let method = '';
      let body: unknown;
      server.use(
        mswHttp.post(`${API_URL}/articles/article-to-favorite/favorite`, async ({ request }) => {
          method = request.method;
          body = await request.json();
          return HttpResponse.json({ article: { ...mockArticle, favorited: true } });
        }),
      );

      const article = await favoriteArticle('article-to-favorite');

      expect(method).toBe('POST');
      expect(body).toEqual({});
      expect(article.favorited).toBe(true);
    });
  });

  describe('unfavoriteArticle', () => {
    it('unfavorites an article with a 200 and no body', async () => {
      let method = '';
      server.use(
        mswHttp.delete(`${API_URL}/articles/article-to-unfavorite/favorite`, ({ request }) => {
          method = request.method;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      await expect(unfavoriteArticle('article-to-unfavorite')).resolves.toBeUndefined();
      expect(method).toBe('DELETE');
    });

    it('accepts a 204 response', async () => {
      server.use(
        mswHttp.delete(
          `${API_URL}/articles/article-to-unfavorite/favorite`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      );

      await expect(unfavoriteArticle('article-to-unfavorite')).resolves.toBeUndefined();
    });
  });
});
