import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/auth-context';
import type { Article } from '../models/article';
import { favoriteArticle, unfavoriteArticle } from '../services/articles';

export function FavoriteButton({
  article,
  onToggle,
  className,
  children,
}: {
  article: Article;
  onToggle: (favorited: boolean) => void;
  className?: string;
  children?: ReactNode;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const toggleFavorite = async () => {
    setIsSubmitting(true);

    if (!isAuthenticated) {
      void navigate('/register');
      return;
    }

    try {
      if (!article.favorited) {
        await favoriteArticle(article.slug);
      } else {
        await unfavoriteArticle(article.slug);
      }
      setIsSubmitting(false);
      onToggle(!article.favorited);
    } catch {
      setIsSubmitting(false);
    }
  };

  const classes = [
    'btn',
    'btn-sm',
    isSubmitting ? 'disabled' : '',
    article.favorited ? 'btn-primary' : 'btn-outline-primary',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <app-favorite-button className={className}>
      <button className={classes} onClick={() => void toggleFavorite()}>
        <i className="ion-heart"></i>
        {children}
      </button>
    </app-favorite-button>
  );
}
