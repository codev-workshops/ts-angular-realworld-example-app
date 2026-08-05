import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { Placeholder } from './pages/Placeholder';

/**
 * Route table mirroring src/app/app.routes.ts.
 *
 * Every element is a placeholder for now; phases 2-5 replace them page by page.
 * Auth guards (canActivate in the Angular routes) arrive with phase 2 as a
 * <RequireAuth> wrapper element.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Placeholder name="Home" /> },
      { path: 'tag/:tag', element: <Placeholder name="Home (tag feed)" /> },
      { path: 'login', element: <Placeholder name="Sign in" /> },
      { path: 'register', element: <Placeholder name="Sign up" /> },
      { path: 'settings', element: <Placeholder name="Settings" /> },
      { path: 'profile/:username', element: <Placeholder name="Profile" /> },
      { path: 'profile/:username/favorites', element: <Placeholder name="Profile (favorites)" /> },
      { path: 'editor', element: <Placeholder name="Editor" /> },
      { path: 'editor/:slug', element: <Placeholder name="Editor (edit)" /> },
      { path: 'article/:slug', element: <Placeholder name="Article" /> },
    ],
  },
]);
