import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { Errors } from '../../../core/models/errors';
import { useAuthStore } from '../../../core/auth/store';
import { defaultImage } from '../../../shared/defaultImage';
import { ListErrors } from '../../../shared/ListErrors';
import { FollowButton } from '../FollowButton';
import { getProfile } from '../api';
import { Profile as ProfileModel } from '../model';

/**
 * Port of `profile.component.ts` + `profile.component.html`.
 *
 * The Angular `<router-outlet>` inside the component becomes React Router's
 * `<Outlet />`; the two children (`profile-articles`, `profile-favorites`) are
 * nested routes, exactly as in `profile.routes.ts`. Links are relative so the
 * page works under any path prefix.
 */
export function Profile() {
  const { username = '' } = useParams<{ username: string }>();
  const currentUser = useAuthStore(state => state.currentUser);
  const authState = useAuthStore(state => state.authState);
  const queryClient = useQueryClient();

  const { data: profile, error } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username),
    retry: false,
  });

  // The axios interceptor normalizes failures to `{ ...body, status }`, so the
  // rejected value is not necessarily an `Error` instance.
  const apiError = error as unknown as { errors?: Errors['errors'] } | null;
  const errors: Errors | null = apiError ? { errors: apiError.errors ?? { error: 'Failed to load profile' } } : null;

  const isUser = !!profile && profile.username === currentUser?.username;

  const onToggleFollowing = (updated: ProfileModel) => {
    queryClient.setQueryData(['profile', username], updated);
  };

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
                  {!isUser && (
                    <FollowButton
                      profile={profile}
                      onToggle={onToggleFollowing}
                      isAuthenticated={authState === 'authenticated'}
                    />
                  )}
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
                      <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="." end>
                        My Posts
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                        to="favorites"
                        end
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
