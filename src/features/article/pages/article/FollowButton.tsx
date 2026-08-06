import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAuthenticated } from '@/core/auth/useIsAuthenticated';
import { follow, unfollow } from '@/features/profile/services/profile';
import type { Profile } from '@/features/profile/models/profile';

interface FollowButtonProps {
  profile: Profile;
  /** `@Output() toggle` becomes a callback receiving the updated profile. */
  onToggle?: (profile: Profile) => void;
}

/**
 * Port of `src/app/features/profile/components/follow-button.component.ts`, kept next to
 * the article page: Phase 4 owns the article feature only, so it does not write into
 * `src/features/profile/`. The profile phase ports the same Angular component for the
 * profile page; the two copies should be folded into one shared component afterwards.
 */
export function FollowButton({ profile, onToggle }: FollowButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  const toggleFollowing = async () => {
    setIsSubmitting(true);

    if (!isAuthenticated) {
      // Angular's stream completed without emitting: the button stays submitting while
      // the redirect unmounts it.
      void navigate('/login');
      return;
    }

    try {
      const updated = profile.following ? await unfollow(profile.username) : await follow(profile.username);
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
      &nbsp;
      {profile.following ? 'Unfollow' : 'Follow'} {profile.username}
    </button>
  );
}
