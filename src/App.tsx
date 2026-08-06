import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { Header } from '@/core/layout/Header';
import { Footer } from '@/core/layout/Footer';
import { RequireAnonymous, RequireAuth } from '@/core/routing/guards';
import { setNavigator } from '@/core/auth/store';

/** `loadComponent: () => import(...)` becomes React.lazy + <Suspense>. */
const AuthPlaceholder = lazy(() => import('@/core/auth/AuthPlaceholder'));
const placeholders = () => import('@/core/routing/Placeholders');
const Home = lazy(() => placeholders().then(m => ({ default: m.HomePlaceholder })));
const Profile = lazy(() => placeholders().then(m => ({ default: m.ProfilePlaceholder })));
const ProfileArticles = lazy(() => placeholders().then(m => ({ default: m.ProfileArticlesPlaceholder })));
const ProfileFavorites = lazy(() => placeholders().then(m => ({ default: m.ProfileFavoritesPlaceholder })));
const Article = lazy(() => placeholders().then(m => ({ default: m.ArticlePlaceholder })));
const Editor = lazy(() => placeholders().then(m => ({ default: m.EditorPlaceholder })));
const Settings = lazy(() => placeholders().then(m => ({ default: m.SettingsPlaceholder })));

/** Gives the store the router's navigate so `logout()` can do `router.navigate(['/'])`. */
function useStoreNavigator() {
  const navigate = useNavigate();
  useEffect(() => setNavigator(path => void navigate(path)), [navigate]);
}

/**
 * Port of `src/app/app.component.html` (header, router outlet, footer) plus
 * `src/app/app.routes.ts` and `src/app/features/profile/profile.routes.ts`.
 */
export function App() {
  useStoreNavigator();

  return (
    <>
      <Header />

      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tag/:tag" element={<Home />} />

          <Route element={<RequireAnonymous />}>
            <Route path="/login" element={<AuthPlaceholder authType="login" />} />
            <Route path="/register" element={<AuthPlaceholder authType="register" />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:slug" element={<Editor />} />
          </Route>

          <Route path="/profile/:username" element={<Profile />}>
            <Route index element={<ProfileArticles />} />
            <Route path="favorites" element={<ProfileFavorites />} />
          </Route>

          <Route path="/article/:slug" element={<Article />} />
        </Routes>
      </Suspense>

      <Footer />
    </>
  );
}
