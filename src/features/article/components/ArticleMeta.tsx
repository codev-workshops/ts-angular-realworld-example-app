import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { defaultImage } from '@/shared/utils/default-image';
import { formatLongDate } from '@/shared/utils/format-date';
import type { Article } from '../models/article';

interface ArticleMetaProps {
  article: Article;
  /** `<ng-content>` becomes children (the favorite/edit actions the pages slot in). */
  children?: ReactNode;
}

/** Port of `src/app/features/article/components/article-meta.component.ts`. */
export function ArticleMeta({ article, children }: ArticleMetaProps) {
  const profileUrl = `/profile/${article.author.username}`;

  return (
    <div className="article-meta">
      <Link to={profileUrl}>
        <img src={defaultImage(article.author.image)} />
      </Link>

      <div className="info">
        <Link className="author" to={profileUrl}>
          {article.author.username}
        </Link>
        <span className="date">{formatLongDate(article.createdAt)}</span>
      </div>

      {children}
    </div>
  );
}
