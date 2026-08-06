import { Outlet } from 'react-router-dom';

/**
 * Placeholders for the pages later phases port. They all render inside the normal shell
 * (navbar + footer stay visible), and each export is deleted by the phase that replaces it:
 * Phase 3 home/profile, Phase 4 article, Phase 5 editor, Phase 6 settings.
 */
function Placeholder({ title }: { title: string }) {
  return (
    <div className="container page">
      <p>{title} — migration in progress.</p>
    </div>
  );
}

/** Phase 3: `/` and `/tag/:tag`. */
export function HomePlaceholder() {
  return <Placeholder title="Home" />;
}

/** Phase 3: `/profile/:username`, with the nested articles/favorites outlet. */
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

/** Phase 3: nested `''` under the profile. */
export function ProfileArticlesPlaceholder() {
  return <p>Profile articles — migration in progress.</p>;
}

/** Phase 3: nested `favorites` under the profile. */
export function ProfileFavoritesPlaceholder() {
  return <p>Favorited articles — migration in progress.</p>;
}

/** Phase 4: `/article/:slug`. */
export function ArticlePlaceholder() {
  return <Placeholder title="Article" />;
}

/** Phase 5: `/editor` and `/editor/:slug`. */
export function EditorPlaceholder() {
  return <Placeholder title="Editor" />;
}

/** Phase 6: `/settings`. */
export function SettingsPlaceholder() {
  return <Placeholder title="Settings" />;
}
