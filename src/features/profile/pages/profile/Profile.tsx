import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { get as getProfile } from '../../services/profile';
import { FollowButton } from '../../components/FollowButton';
import { ListErrors } from '@/shared/components/ListErrors';
import { defaultImage } from '@/shared/utils/default-image';
import { useAuthStore } from '@/core/auth/store';
import type { Profile as ProfileModel } from '../../models/profile';
import type { ApiError, Errors } from '@/core/models/errors';

/**
 * Port of `src/app/features/profile/pages/profile/profile.component.{ts,html}`.
 * Loads the `:username` profile, decides whether it is the current user's own profile
 * (Edit-settings link) or someone else's (follow button), and hosts the articles/favorites
 * tab outlet.
 */
export function Profile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [errors, setErrors] = useState<Errors | null>(null);
  const currentUser = useAuthStore(s => s.currentUser);

  useEffect(() => {
    if (!username) {
      return;
    }
    let active = true;
    setErrors(null);
    getProfile(username)
      .then(loaded => {
        if (active) {
          setProfile(loaded);
        }
      })
      .catch((error: ApiError | undefined) => {
        if (active) {
          setErrors(error?.errors ? error : { errors: { error: ['Failed to load profile'] } });
        }
      });
    return () => {
      active = false;
    };
  }, [username]);

  const isUser = !!profile && profile.username === currentUser?.username;

  return (
    <div className="profile-page">
      {errors && (
        <div className="container">
          <div className="row">
            <div className="col-xs-12 col-md-10 offset-md-1">
              <ListErrors errors={errors} />
            </div>
          </div>
        </div>
      )}

      {profile && (
        <>
          <div className="user-info">
            <div className="container">
              <div className="row">
                <div className="col-xs-12 col-md-10 offset-md-1">
                  <img src={defaultImage(profile.image)} className="user-img" />
                  <h4>{profile.username}</h4>
                  <p>{profile.bio ?? ''}</p>
                  {!isUser && <FollowButton profile={profile} onToggle={setProfile} />}
                  {isUser && (
                    <Link to="/settings" className="btn btn-sm btn-outline-secondary action-btn">
                      <i className="ion-gear-a"></i> Edit Profile Settings
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="container">
            <div className="row">
              <div className="col-xs-12 col-md-10 offset-md-1">
                <div className="articles-toggle">
                  <ul className="nav nav-pills outline-active">
                    <li className="nav-item">
                      <NavLink
                        end
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                        to={`/profile/${profile.username}`}
                      >
                        My Posts
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink
                        end
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                        to={`/profile/${profile.username}/favorites`}
                      >
                        Favorited Posts
                      </NavLink>
                    </li>
                  </ul>
                </div>

                <Outlet />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
