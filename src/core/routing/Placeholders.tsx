import { Outlet } from 'react-router-dom';

/**
 * Placeholders for the pages later phases port. They render inside the normal shell
 * (navbar + footer stay visible). The profile page is the last route still on a
 * placeholder; the phase that ports it deletes this file.
 */
export function ProfilePlaceholder() {
  return (
    <div className="profile-page">
      <div className="container page">
        <p>Profile — migration in progress.</p>
        <Outlet />
      </div>
    </div>
  );
}

/** Nested `''` under the profile. */
export function ProfileArticlesPlaceholder() {
  return <p>Profile articles — migration in progress.</p>;
}

/** Nested `favorites` under the profile. */
export function ProfileFavoritesPlaceholder() {
  return <p>Favorited articles — migration in progress.</p>;
}
