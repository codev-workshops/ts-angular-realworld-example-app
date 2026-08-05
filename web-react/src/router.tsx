import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './core/layout/AppShell';
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
      { path: '/', element: <Navigate to="/harness/favorite-button" replace /> },
      // TEMPORARY: keeps the shell (and its navbar) mounted on routes later
      // waves still have to land, instead of React Router's default 404 page.
      { path: '*', element: <div className="container page" /> },
    ],
  },
]);
