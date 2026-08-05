import { createBrowserRouter, Navigate } from 'react-router-dom';
import { FavoriteButtonHarness } from './harness/FavoriteButtonHarness';

/**
 * Orchestrator-owned route table.
 *
 * Waves 2-4 add TEMPORARY routes here (one per migrated page); Wave 5 replaces
 * the whole table with the real one from `app.routes.ts` plus `ProtectedRoute`
 * guards, and deletes every harness route.
 */
export const router = createBrowserRouter([
  { path: '/harness/favorite-button', element: <FavoriteButtonHarness /> },
  { path: '/', element: <Navigate to="/harness/favorite-button" replace /> },
]);
