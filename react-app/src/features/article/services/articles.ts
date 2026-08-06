import { request } from '../../../core/api/client';
import type { Article } from '../models/article';
import type { ArticleListConfig } from '../models/article-list-config';

export function queryArticles(
  config: ArticleListConfig,
  signal?: AbortSignal,
): Promise<{ articles: Article[]; articlesCount: number }> {
  return request<{ articles: Article[]; articlesCount: number }>(
    '/articles' + (config.type === 'feed' ? '/feed' : ''),
    { params: { ...config.filters }, signal },
  );
}

export async function getArticle(slug: string, signal?: AbortSignal): Promise<Article> {
  const data = await request<{ article: Article }>(`/articles/${slug}`, { signal });
  return data.article;
}

export function deleteArticle(slug: string): Promise<void> {
  return request<void>(`/articles/${slug}`, { method: 'DELETE' });
}

export async function createArticle(article: Partial<Article>): Promise<Article> {
  const data = await request<{ article: Article }>('/articles/', { method: 'POST', body: { article } });
  return data.article;
}

export async function updateArticle(article: Partial<Article>): Promise<Article> {
  const data = await request<{ article: Article }>(`/articles/${article.slug}`, { method: 'PUT', body: { article } });
  return data.article;
}

export async function favoriteArticle(slug: string): Promise<Article> {
  const data = await request<{ article: Article }>(`/articles/${slug}/favorite`, { method: 'POST', body: {} });
  return data.article;
}

export function unfavoriteArticle(slug: string): Promise<void> {
  return request<void>(`/articles/${slug}/favorite`, { method: 'DELETE' });
}
