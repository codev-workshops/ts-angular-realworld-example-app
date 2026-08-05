import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Profile } from './model';
import { followUser, unfollowUser } from './api';

export interface FollowButtonProps {
  profile: Profile;
  /** Angular `@Output() toggle` becomes a callback prop. */
  onToggle: (profile: Profile) => void;
  isAuthenticated: boolean;
}

/**
 * Port of `follow-button.component.ts`.
 *
 * - `@Input() profile` / `@Output() toggle` -> props
 * - `signal(false)` submitting flag -> `useState`
 * - injected `Router` -> `useNavigate`
 * - injected `UserService.isAuthenticated` -> `isAuthenticated` prop (the auth
 *   store is owned by Wave 1; keeping it a prop keeps this component pure).
 */
export function FollowButton({ profile, onToggle, isAuthenticated }: FollowButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const toggleFollowing = async () => {
    setIsSubmitting(true);

    if (!isAuthenticated) {
      setIsSubmitting(false);
      navigate('/login');
      return;
    }

    try {
      const updated = !profile.following
        ? await followUser(profile.username)
        : await unfollowUser(profile.username);
      setIsSubmitting(false);
      onToggle(updated);
    } catch {
      setIsSubmitting(false);
    }
  };

  const classes = [
    'btn',
    'btn-sm',
    'action-btn',
    isSubmitting ? 'disabled' : '',
    profile.following ? 'btn-secondary' : 'btn-outline-secondary',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} onClick={toggleFollowing}>
      <i className="ion-plus-round"></i>
      &nbsp;
      {profile.following ? 'Unfollow' : 'Follow'} {profile.username}
    </button>
  );
}
