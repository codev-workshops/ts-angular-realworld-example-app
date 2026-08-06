import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/auth-context';
import type { Profile } from '../models/profile';
import { followProfile, unfollowProfile } from '../services/profile';

export function FollowButton({ profile, onToggle }: { profile: Profile; onToggle: (profile: Profile) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const toggleFollowing = async () => {
    setIsSubmitting(true);

    if (!isAuthenticated) {
      void navigate('/login');
      return;
    }

    try {
      const updated = profile.following
        ? await unfollowProfile(profile.username)
        : await followProfile(profile.username);
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
    <app-follow-button>
      <button className={classes} onClick={() => void toggleFollowing()}>
        <i className="ion-plus-round"></i>
        {` \u00a0 ${profile.following ? 'Unfollow' : 'Follow'} ${profile.username} `}
      </button>
    </app-follow-button>
  );
}
