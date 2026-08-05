import { useEffect, useState } from 'react';
import { getProfile } from '../features/profile/api';
import { Profile } from '../features/profile/model';
import { FollowButton } from '../features/profile/FollowButton';

/**
 * TEMPORARY harness route (`/harness/follow-button`).
 *
 * Wave 5 deletes `src/harness/` entirely once the real router table lands.
 */
export function FollowButtonHarness() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile('johndoe')
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  if (!profile) {
    return <div className="container page">Loading profile...</div>;
  }

  return (
    <div className="container page">
      <h1>FollowButton harness</h1>
      <p>{profile.username}</p>
      <FollowButton
        profile={profile}
        isAuthenticated={!!window.localStorage.getItem('jwtToken')}
        onToggle={updated => setProfile(updated)}
      />
    </div>
  );
}
