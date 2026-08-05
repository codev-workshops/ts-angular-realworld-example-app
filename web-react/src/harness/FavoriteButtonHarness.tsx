import { useEffect, useState } from 'react';
import { http } from '../lib/http';
import { Article } from '../features/article/model';
import { FavoriteButton } from '../features/article/FavoriteButton';

/**
 * TEMPORARY harness route (`/harness/favorite-button`).
 *
 * Wave 5 deletes `src/harness/` entirely once the real router table lands.
 */
export function FavoriteButtonHarness() {
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    http
      .get<{ articles: Article[] }>('/articles', { params: { limit: 1 } })
      .then(({ data }) => setArticle(data.articles[0] ?? null))
      .catch(() => setArticle(null));
  }, []);

  if (!article) {
    return <div className="container page">Loading article...</div>;
  }

  return (
    <div className="container page">
      <h1>FavoriteButton harness</h1>
      <p>{article.title}</p>
      <FavoriteButton
        article={article}
        isAuthenticated={!!window.localStorage.getItem('jwtToken')}
        onToggle={favorited =>
          setArticle(a =>
            a ? { ...a, favorited, favoritesCount: favorited ? a.favoritesCount + 1 : a.favoritesCount - 1 } : a,
          )
        }
      >
        {article.favoritesCount}
      </FavoriteButton>
    </div>
  );
}
