import type { RouteObject } from 'react-router-dom';
import { Layout } from '@/core/layout/Layout';
import { RequireAnonymous, RequireAuth } from '@/core/routing/guards';

/**
 * Route table for the whole app.
 *
 * Every page is code split with route-level `lazy`, which a data router awaits *before* it
 * commits the URL: navigation never leaves the previous page on screen once the new URL is in
 * the address bar.
 */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/features/article/pages/home/Home')).default }) },
      {
        path: 'tag/:tag',
        lazy: async () => ({ Component: (await import('@/features/article/pages/home/Home')).default }),
      },
      {
        element: <RequireAnonymous />,
        children: [
          {
            path: 'login',
            lazy: async () => {
              const { default: Auth } = await import('@/core/auth/Auth');
              return { Component: () => <Auth authType="login" /> };
            },
          },
          {
            path: 'register',
            lazy: async () => {
              const { default: Auth } = await import('@/core/auth/Auth');
              return { Component: () => <Auth authType="register" /> };
            },
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'settings',
            lazy: async () => ({ Component: (await import('@/features/settings/Settings')).default }),
          },
          {
            path: 'editor',
            lazy: async () => ({ Component: (await import('@/features/article/pages/editor/Editor')).default }),
          },
          {
            path: 'editor/:slug',
            lazy: async () => ({ Component: (await import('@/features/article/pages/editor/Editor')).default }),
          },
        ],
      },
      {
        path: 'profile/:username',
        lazy: async () => ({ Component: (await import('@/features/profile/pages/profile/Profile')).Profile }),
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/features/profile/components/ProfileArticles')).default }),
          },
          {
            path: 'favorites',
            lazy: async () => ({ Component: (await import('@/features/profile/components/ProfileFavorites')).default }),
          },
        ],
      },
      {
        path: 'article/:slug',
        lazy: async () => ({ Component: (await import('@/features/article/pages/article/Article')).default }),
      },
    ],
  },
];
