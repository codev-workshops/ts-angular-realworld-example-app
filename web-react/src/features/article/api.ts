import { http } from '../../lib/http';
import { Article } from './model';

/**
 * Port of the favorite/unfavorite half of Angular's `ArticlesService`.
 * The rest of the service lands in Wave 2a.
 */
export async function favoriteArticle(slug: string): Promise<Article> {
  const { data } = await http.post<{ article: Article }>(`/articles/${slug}/favorite`, {});
  return data.article;
}

export async function unfavoriteArticle(slug: string): Promise<void> {
  await http.delete<void>(`/articles/${slug}/favorite`);
}
