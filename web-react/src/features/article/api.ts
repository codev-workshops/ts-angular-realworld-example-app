import { http } from '../../lib/http';
import { ArticleListConfig } from './list-config';
import { Article } from './model';

/** Port of Angular's `ArticlesService`. */
export async function queryArticles(
  config: ArticleListConfig,
): Promise<{ articles: Article[]; articlesCount: number }> {
  const { data } = await http.get<{ articles: Article[]; articlesCount: number }>(
    '/articles' + (config.type === 'feed' ? '/feed' : ''),
    { params: { ...config.filters } },
  );
  return data;
}

export async function getArticle(slug: string): Promise<Article> {
  const { data } = await http.get<{ article: Article }>(`/articles/${slug}`);
  return data.article;
}

export async function deleteArticle(slug: string): Promise<void> {
  await http.delete<void>(`/articles/${slug}`);
}

export async function createArticle(article: Partial<Article>): Promise<Article> {
  const { data } = await http.post<{ article: Article }>('/articles/', { article });
  return data.article;
}

export async function updateArticle(article: Partial<Article>): Promise<Article> {
  const { data } = await http.put<{ article: Article }>(`/articles/${article.slug}`, { article });
  return data.article;
}

export async function favoriteArticle(slug: string): Promise<Article> {
  const { data } = await http.post<{ article: Article }>(`/articles/${slug}/favorite`, {});
  return data.article;
}

export async function unfavoriteArticle(slug: string): Promise<void> {
  await http.delete<void>(`/articles/${slug}/favorite`);
}
