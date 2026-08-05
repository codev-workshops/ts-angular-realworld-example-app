import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './core/layout/AppShell';
import { AuthPage } from './core/auth/AuthPage';
import { ProtectedRoute } from './core/auth/ProtectedRoute';
import { ArticlePage } from './features/article/pages/ArticlePage';
import { Editor } from './features/article/pages/Editor';
import { Home } from './features/article/pages/Home';
import { Profile } from './features/profile/pages/Profile';
import { ProfileArticles } from './features/profile/pages/ProfileArticles';
import { ProfileFavorites } from './features/profile/pages/ProfileFavorites';
import { Settings } from './features/settings/Settings';

/** Port of `app.routes.ts` + `profile.routes.ts`, guards included. */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/tag/:tag', element: <Home /> },
      {
        element: <ProtectedRoute requireAuth={false} />,
        children: [
          { path: '/login', element: <AuthPage /> },
          { path: '/register', element: <AuthPage /> },
        ],
      },
      {
        element: <ProtectedRoute requireAuth={true} />,
        children: [
          { path: '/settings', element: <Settings /> },
          { path: '/editor', element: <Editor /> },
          { path: '/editor/:slug', element: <Editor /> },
        ],
      },
      { path: '/article/:slug', element: <ArticlePage /> },
      {
        path: '/profile/:username',
        element: <Profile />,
        children: [
          { index: true, element: <ProfileArticles /> },
          { path: 'favorites', element: <ProfileFavorites /> },
        ],
      },
      // Angular's router leaves unmatched URLs on a blank page with the shell
      // still mounted; React Router would otherwise show its own error page.
      { path: '*', element: <div className="container page" /> },
    ],
  },
]);
