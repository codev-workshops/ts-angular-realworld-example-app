import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { defaultImage } from '../../shared/defaultImage';
import { Article } from './model';

export interface ArticleMetaProps {
  article: Article;
  children?: ReactNode;
}

/**
 * Angular's `date: 'longDate'` (`MMMM d, y` for en-US).
 *
 * Lives here rather than in `src/shared/` because that directory belongs to
 * another wave; `ArticleComment` imports it from this module.
 */
export function formatLongDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

/** Port of `article-meta.component.ts`. `<ng-content>` becomes `children`. */
export function ArticleMeta({ article, children }: ArticleMetaProps) {
  return (
    <div className="article-meta">
      <Link to={`/profile/${article.author.username}`}>
        <img src={defaultImage(article.author.image)} />
      </Link>

      <div className="info">
        <Link className="author" to={`/profile/${article.author.username}`}>
          {article.author.username}
        </Link>
        <span className="date">{formatLongDate(article.createdAt)}</span>
      </div>

      {children}
    </div>
  );
}
