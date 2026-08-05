/** Port of Angular's `article-list-config.model.ts`. */
export interface ArticleListConfig {
  type: string;

  filters: {
    tag?: string;
    author?: string;
    favorited?: string;
    limit?: number;
    offset?: number;
  };
}
