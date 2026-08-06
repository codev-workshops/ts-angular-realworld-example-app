import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArticleMeta } from './ArticleMeta';
import { FavoriteButton } from './FavoriteButton';
import type { Article } from '../models/article';

interface ArticlePreviewProps {
  /** Angular's `@Input({ required: true }) articleInput`, copied into local state. */
  article: Article;
}

/**
 * Port of `src/app/features/article/components/article-preview.component.ts`.
 *
 * The Angular component copied its input into a signal so it could own the optimistic
 * favorite update; the React port keeps that ownership with local state that re-syncs
 * whenever the parent hands down a new article.
 */
export function ArticlePreview({ article }: ArticlePreviewProps) {
  const [current, setCurrent] = useState(article);

  useEffect(() => setCurrent(article), [article]);

  const toggleFavorite = (favorited: boolean) =>
    setCurrent(previous => ({
      ...previous,
      favorited,
      favoritesCount: favorited ? previous.favoritesCount + 1 : previous.favoritesCount - 1,
    }));

  return (
    <div className="article-preview">
      <ArticleMeta article={current}>
        <FavoriteButton article={current} onToggle={toggleFavorite} className="pull-xs-right">
          {current.favoritesCount}
        </FavoriteButton>
      </ArticleMeta>

      <Link to={`/article/${current.slug}`} className="preview-link">
        <h1>{current.title}</h1>
        <p>{current.description}</p>
        <span>Read more...</span>
        <ul className="tag-list">
          {current.tagList.map(tag => (
            <li className="tag-default tag-pill tag-outline" key={tag}>
              {tag}
            </li>
          ))}
        </ul>
      </Link>
    </div>
  );
}
