import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { favorite, unfavorite } from '../services/articles';
import { useAuthStore, selectIsAuthenticated } from '@/core/auth/store';
import type { Article } from '../models/article';

interface FavoriteButtonProps {
  article: Article;
  /** Replaces `@Output() toggle`; receives the new favorited value. */
  onToggle?: (favorited: boolean) => void;
  /** `<ng-content>` becomes children. */
  children?: ReactNode;
}

export function FavoriteButton({ article, onToggle, children }: FavoriteButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const navigate = useNavigate();

  const toggleFavorite = async () => {
    setIsSubmitting(true);

    if (!isAuthenticated) {
      // Matches Angular: the stream completes without emitting, so the button stays
      // in its submitting state while the redirect unmounts it.
      void navigate('/register');
      return;
    }

    try {
      if (!article.favorited) {
        await favorite(article.slug);
      } else {
        await unfavorite(article.slug);
      }
      setIsSubmitting(false);
      onToggle?.(!article.favorited);
    } catch {
      setIsSubmitting(false);
    }
  };

  const className = [
    'btn',
    'btn-sm',
    isSubmitting ? 'disabled' : '',
    article.favorited ? 'btn-primary' : 'btn-outline-primary',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={className} onClick={toggleFavorite}>
      <i className="ion-heart"></i> {children}
    </button>
  );
}
