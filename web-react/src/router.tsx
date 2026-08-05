import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './core/layout/AppShell';
import { AuthPage } from './core/auth/AuthPage';
import { ArticlePage } from './features/article/pages/ArticlePage';
import { Editor } from './features/article/pages/Editor';
import { Home } from './features/article/pages/Home';
import { Profile } from './features/profile/pages/Profile';
import { ProfileArticles } from './features/profile/pages/ProfileArticles';
import { ProfileFavorites } from './features/profile/pages/ProfileFavorites';
import { Settings } from './features/settings/Settings';
import { ArticleComponentsHarness } from './harness/ArticleComponentsHarness';
import { FavoriteButtonHarness } from './harness/FavoriteButtonHarness';
import { FollowButtonHarness } from './harness/FollowButtonHarness';

/**
 * Orchestrator-owned route table.
 *
 * Waves 2-4 add TEMPORARY routes here (one per migrated page); Wave 5 replaces
 * the whole table with the real one from `app.routes.ts` plus `ProtectedRoute`
 * guards, and deletes every harness route.
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/harness/favorite-button', element: <FavoriteButtonHarness /> },
      { path: '/harness/follow-button', element: <FollowButtonHarness /> },
      { path: '/harness/article-components', element: <ArticleComponentsHarness /> },
      { path: '/tmp/home', element: <Home /> },
      { path: '/tmp/home/tag/:tag', element: <Home /> },
      { path: '/tmp/article/:slug', element: <ArticlePage /> },
      { path: '/tmp/editor', element: <Editor /> },
      { path: '/tmp/editor/:slug', element: <Editor /> },
      {
        path: '/tmp/profile/:username',
        element: <Profile />,
        children: [
          { index: true, element: <ProfileArticles /> },
          { path: 'favorites', element: <ProfileFavorites /> },
        ],
      },
      { path: '/tmp/settings', element: <Settings /> },
      { path: '/tmp/login', element: <AuthPage /> },
      { path: '/tmp/register', element: <AuthPage /> },
      { path: '/', element: <Navigate to="/harness/favorite-button" replace /> },
      // TEMPORARY: keeps the shell (and its navbar) mounted on routes later
      // waves still have to land, instead of React Router's default 404 page.
      { path: '*', element: <div className="container page" /> },
    ],
  },
]);
