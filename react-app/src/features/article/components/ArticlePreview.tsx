import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Article } from '../models/article';
import { ArticleMeta } from './ArticleMeta';
import { FavoriteButton } from './FavoriteButton';

export function ArticlePreview({ articleInput }: { articleInput: Article }) {
  // The Angular component keeps the article in a signal that the input setter
  // overwrites, so a new input resets any locally applied favorite toggle.
  const [article, setArticle] = useState(articleInput);
  const [lastInput, setLastInput] = useState(articleInput);

  if (lastInput !== articleInput) {
    setLastInput(articleInput);
    setArticle(articleInput);
  }

  const toggleFavorite = (favorited: boolean) =>
    setArticle(current => ({
      ...current,
      favorited,
      favoritesCount: favorited ? current.favoritesCount + 1 : current.favoritesCount - 1,
    }));

  return (
    <app-article-preview>
      <div className="article-preview">
        <ArticleMeta article={article}>
          <FavoriteButton article={article} onToggle={toggleFavorite} className="pull-xs-right">
            {` ${article.favoritesCount} `}
          </FavoriteButton>
        </ArticleMeta>

        <Link to={`/article/${article.slug}`} className="preview-link">
          <h1>{article.title}</h1>
          <p>{article.description}</p>
          <span>Read more...</span>
          <ul className="tag-list">
            {article.tagList.map(tag => (
              <li className="tag-default tag-pill tag-outline" key={tag}>
                {` ${tag} `}
              </li>
            ))}
          </ul>
        </Link>
      </div>
    </app-article-preview>
  );
}
