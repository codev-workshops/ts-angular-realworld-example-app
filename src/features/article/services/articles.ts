import { del, post } from '@/lib/api';
import type { Article } from '../models/article';

/**
 * Angular services become plain async functions: no DI, no Observables.
 * Phase 1 adds the remaining ArticlesService methods (query/get/create/update/delete).
 */
export async function favorite(slug: string): Promise<Article> {
  const data = await post<{ article: Article }>(`/articles/${slug}/favorite`, {});
  return data.article;
}

export async function unfavorite(slug: string): Promise<void> {
  await del<void>(`/articles/${slug}/favorite`);
}
