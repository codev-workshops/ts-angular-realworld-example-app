import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RouteObject } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { routes } from './routes';

/** Flattens the tree into `path -> route`, joining nested segments like the router does. */
function flatten(tree: RouteObject[], prefix = ''): Array<[string, RouteObject]> {
  return tree.flatMap(route => {
    const path = route.index ? prefix || '/' : route.path ? `${prefix}/${route.path}` : prefix;
    const self: Array<[string, RouteObject]> = route.index || route.path ? [[path, route]] : [];
    return [...self, ...flatten(route.children ?? [], path)];
  });
}

const flat = flatten(routes);
const byPath = new Map(flat);

describe('routes', () => {
  it('declares exactly the Conduit route table', () => {
    expect(flat.map(([path]) => path).sort()).toEqual(
      [
        '/',
        '/tag/:tag',
        '/login',
        '/register',
        '/settings',
        '/editor',
        '/editor/:slug',
        '/profile/:username',
        '/profile/:username',
        '/profile/:username/favorites',
        '/article/:slug',
      ].sort(),
    );
  });

  it('code splits every page: no route ships an eager element', () => {
    for (const [path, route] of flat) {
      expect(route.element, `${path} should be lazy, not eager`).toBeUndefined();
      expect(typeof route.lazy, `${path} should have a lazy loader`).toBe('function');
    }
  });

  it('resolves every lazy route to a component', async () => {
    for (const [path, route] of flat) {
      const resolved = await (route.lazy as () => Promise<{ Component?: unknown }>)();
      expect(typeof resolved.Component, `${path} should resolve to a component`).toBe('function');
    }
  });

  it('passes the auth mode down so /login and /register share one component', async () => {
    for (const [path, heading] of [
      ['/login', 'Sign in'],
      ['/register', 'Sign up'],
    ] as const) {
      const { Component } = (await (byPath.get(path)!.lazy as () => Promise<{ Component: React.FC }>)()) as {
        Component: React.FC;
      };

      const { unmount } = render(
        <MemoryRouter>
          <Component />
        </MemoryRouter>,
      );
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
      unmount();
    }
  });

  it('guards /settings and the editor, and keeps authenticated users off /login', () => {
    const guarded = (routes[0].children ?? []).filter(child => !child.path && !child.index);
    const guardNames = guarded.map(child => (child.element as { type: { name: string } }).type.name);

    expect(guardNames).toEqual(['RequireAnonymous', 'RequireAuth']);
    expect((guarded[0].children ?? []).map(c => c.path)).toEqual(['login', 'register']);
    expect((guarded[1].children ?? []).map(c => c.path)).toEqual(['settings', 'editor', 'editor/:slug']);
  });

  it('nests the profile feeds under /profile/:username', () => {
    const profile = (routes[0].children ?? []).find(child => child.path === 'profile/:username')!;

    expect((profile.children ?? []).map(child => child.path ?? (child.index ? '(index)' : ''))).toEqual([
      '(index)',
      'favorites',
    ]);
  });
});
