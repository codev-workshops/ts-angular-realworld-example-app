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
  /**
   * Angular put layout classes on the host element (`<app-favorite-button class="pull-xs-right">`);
   * React has no host element, so callers pass them here and they land on the button.
   */
  className?: string;
}

export function FavoriteButton({ article, onToggle, children, className: extraClassName }: FavoriteButtonProps) {
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
    extraClassName ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={className} onClick={toggleFavorite}>
      <i className="ion-heart"></i> {children}
    </button>
  );
}
