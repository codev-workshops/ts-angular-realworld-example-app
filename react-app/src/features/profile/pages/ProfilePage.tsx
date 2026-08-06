import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../../../core/auth/auth-context';
import type { ApiError } from '../../../core/api/client';
import type { Errors } from '../../../core/models/errors';
import { ListErrors } from '../../../shared/components/ListErrors';
import { defaultImage } from '../../../shared/util/defaultImage';
import { FollowButton } from '../components/FollowButton';
import type { Profile } from '../models/profile';
import { getProfile } from '../services/profile';

const activeClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

export function ProfilePage() {
  const { username = '' } = useParams();
  const { currentUser } = useAuth();

  const [state, setState] = useState<{ username: string; profile: Profile | null; errors: Errors | null }>({
    username,
    profile: null,
    errors: null,
  });

  if (state.username !== username) {
    setState({ username, profile: null, errors: null });
  }

  useEffect(() => {
    const controller = new AbortController();
    getProfile(username, controller.signal)
      .then(profile => setState({ username, profile, errors: null }))
      .catch((err: ApiError) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          username,
          profile: null,
          // See ArticlePage: Angular stores `err.errors` directly here too.
          errors: (err.errors ?? { error: ['Failed to load profile'] }) as unknown as Errors,
        });
      });
    return () => controller.abort();
  }, [username]);

  const profile = state.username === username ? state.profile : null;
  const errors = state.username === username ? state.errors : null;
  const setProfile = (updated: Profile) => setState({ username, profile: updated, errors: null });
  const isUser = !!profile && profile.username === currentUser?.username;

  return (
    <app-profile-page>
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
                        <NavLink className={activeClass} to={`/profile/${profile.username}`} end>
                          {' '}
                          My Posts{' '}
                        </NavLink>
                      </li>
                      <li className="nav-item">
                        <NavLink className={activeClass} to={`/profile/${profile.username}/favorites`} end>
                          {' '}
                          Favorited Posts{' '}
                        </NavLink>
                      </li>
                    </ul>
                  </div>

                  <router-outlet></router-outlet>
                  <Outlet context={profile} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </app-profile-page>
  );
}
