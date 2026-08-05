import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../core/auth/store';
import { ArticleMeta } from './ArticleMeta';
import { FavoriteButton } from './FavoriteButton';
import { Article } from './model';

export interface ArticlePreviewProps {
  article: Article;
}

/**
 * Port of `article-preview.component.ts`.
 *
 * The `@Input() set articleInput` -> `signal` indirection becomes local state
 * kept in sync with the prop, so this component owns the optimistic favorites
 * count exactly as `ArticlePreviewComponent.toggleFavorite` does.
 */
export function ArticlePreview({ article }: ArticlePreviewProps) {
  const [current, setCurrent] = useState(article);
  // Angular: `UserService.isAuthenticated` is `currentUser.pipe(map(u => !!u))`.
  const isAuthenticated = useAuthStore(s => !!s.currentUser);

  useEffect(() => setCurrent(article), [article]);

  const toggleFavorite = (favorited: boolean) => {
    setCurrent(a => ({
      ...a,
      favorited,
      favoritesCount: favorited ? a.favoritesCount + 1 : a.favoritesCount - 1,
    }));
  };

  return (
    <div className="article-preview">
      <ArticleMeta article={current}>
        <FavoriteButton
          article={current}
          onToggle={toggleFavorite}
          isAuthenticated={isAuthenticated}
          className="pull-xs-right"
        >
          {current.favoritesCount}
        </FavoriteButton>
      </ArticleMeta>

      <Link to={`/article/${current.slug}`} className="preview-link">
        <h1>{current.title}</h1>
        <p>{current.description}</p>
        <span>Read more...</span>
        <ul className="tag-list">
          {current.tagList.map(tag => (
            <li key={tag} className="tag-default tag-pill tag-outline">
              {tag}
            </li>
          ))}
        </ul>
      </Link>
    </div>
  );
}
