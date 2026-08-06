import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { follow, unfollow } from '../services/profile';
import { useAuthStore, selectIsAuthenticated } from '@/core/auth/store';
import type { Profile } from '../models/profile';

interface FollowButtonProps {
  profile: Profile;
  /** Replaces `@Output() toggle`; receives the profile returned by follow/unfollow. */
  onToggle?: (profile: Profile) => void;
}

/**
 * Port of `src/app/features/profile/components/follow-button.component.ts`.
 *
 * Mirrors `FavoriteButton` (the Phase 0 reference port); the one difference is faithful to
 * the Angular original: the follow button redirects anonymous users to `/login`, whereas
 * the favorite button redirects to `/register`.
 */
export function FollowButton({ profile, onToggle }: FollowButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const navigate = useNavigate();

  const toggleFollowing = async () => {
    setIsSubmitting(true);

    if (!isAuthenticated) {
      // Matches Angular: the stream completes without emitting, so the button stays in its
      // submitting state while the redirect unmounts it.
      void navigate('/login');
      return;
    }

    try {
      const updated = !profile.following ? await follow(profile.username) : await unfollow(profile.username);
      setIsSubmitting(false);
      onToggle?.(updated);
    } catch {
      setIsSubmitting(false);
    }
  };

  const className = [
    'btn',
    'btn-sm',
    'action-btn',
    isSubmitting ? 'disabled' : '',
    profile.following ? 'btn-secondary' : 'btn-outline-secondary',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={className} onClick={toggleFollowing}>
      <i className="ion-plus-round"></i>
      &nbsp; {profile.following ? 'Unfollow' : 'Follow'} {profile.username}
    </button>
  );
}
