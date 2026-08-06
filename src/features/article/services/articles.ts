import { del, get as apiGet, post, put } from '@/lib/api';
import type { Article } from '../models/article';
import type { ArticleListConfig } from '../models/article-list-config';

/**
 * Angular services become plain async functions: no DI, no Observables.
 *
 * The delete endpoint is exported as `remove` because `del` is already the
 * imported HTTP helper from `@/lib/api`; the article-by-slug getter is `get`,
 * which is why the api helper is imported aliased as `apiGet`.
 */
export async function query(config: ArticleListConfig): Promise<{ articles: Article[]; articlesCount: number }> {
  const url = '/articles' + (config.type === 'feed' ? '/feed' : '');
  const params: Record<string, string | number> = {};
  (Object.keys(config.filters) as (keyof ArticleListConfig['filters'])[]).forEach(key => {
    const value = config.filters[key];
    if (value !== undefined) {
      params[key] = value;
    }
  });
  return apiGet<{ articles: Article[]; articlesCount: number }>(url, params);
}

export async function get(slug: string): Promise<Article> {
  const data = await apiGet<{ article: Article }>(`/articles/${slug}`);
  return data.article;
}

export async function create(article: Partial<Article>): Promise<Article> {
  const data = await post<{ article: Article }>('/articles/', { article });
  return data.article;
}

export async function update(article: Partial<Article>): Promise<Article> {
  const data = await put<{ article: Article }>(`/articles/${article.slug}`, { article });
  return data.article;
}

export async function remove(slug: string): Promise<void> {
  await del<void>(`/articles/${slug}`);
}

export async function favorite(slug: string): Promise<Article> {
  const data = await post<{ article: Article }>(`/articles/${slug}/favorite`, {});
  return data.article;
}

export async function unfavorite(slug: string): Promise<void> {
  await del<void>(`/articles/${slug}/favorite`);
}
