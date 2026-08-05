import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Article } from './model';
import { favoriteArticle, unfavoriteArticle } from './api';

export interface FavoriteButtonProps {
  article: Article;
  /** Angular `@Output() toggle` becomes a callback prop. */
  onToggle: (favorited: boolean) => void;
  isAuthenticated: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Port of `favorite-button.component.ts`.
 *
 * - `@Input() article` / `@Output() toggle` -> props
 * - `signal(false)` submitting flag -> `useState`
 * - injected `Router` -> `useNavigate`
 * - injected `UserService.isAuthenticated` -> `isAuthenticated` prop (the auth
 *   store is owned by Wave 1; keeping it a prop keeps this component pure).
 */
export function FavoriteButton({ article, onToggle, isAuthenticated, children, className }: FavoriteButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const toggleFavorite = async () => {
    setIsSubmitting(true);

    if (!isAuthenticated) {
      setIsSubmitting(false);
      navigate('/register');
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
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} onClick={toggleFavorite}>
      <i className="ion-heart"></i> {children}
    </button>
  );
}
