import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthState, User } from './model';
import { useAuthStore } from './store';

const user: User = {
  email: 'test@example.com',
  token: 'test-jwt-token',
  username: 'testuser',
  bio: null,
  image: null,
};

function setAuth(authState: AuthState, currentUser: User | null = null) {
  useAuthStore.setState({ authState, currentUser });
}

function renderAt(path: string, requireAuth: boolean) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute requireAuth={requireAuth} />}>
          <Route path={path} element={<h1>{path === '/login' ? 'auth page' : 'settings page'}</h1>} />
        </Route>
        <Route path="/login" element={<h1>login page</h1>} />
        <Route path="/" element={<h1>home page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => setAuth('loading', null));

describe('ProtectedRoute', () => {
  it('renders the guarded route when authenticated', () => {
    setAuth('authenticated', user);
    renderAt('/settings', true);

    expect(screen.getByText('settings page')).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', () => {
    setAuth('unauthenticated');
    renderAt('/settings', true);

    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('settings page')).not.toBeInTheDocument();
  });

  it('redirects to /login in the unavailable state', () => {
    setAuth('unavailable');
    renderAt('/settings', true);

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders nothing while auth is loading instead of redirecting', () => {
    setAuth('loading');
    renderAt('/settings', true);

    expect(screen.queryByText('settings page')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('renders /login for anonymous users with the inverse guard', () => {
    setAuth('unauthenticated');
    renderAt('/login', false);

    expect(screen.getByText('auth page')).toBeInTheDocument();
  });

  it('redirects authenticated users away from /login', () => {
    setAuth('authenticated', user);
    renderAt('/login', false);

    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('keeps rendering the page when the session is lost after activation', () => {
    setAuth('authenticated', user);
    renderAt('/settings', true);

    act(() => setAuth('unauthenticated'));

    expect(screen.getByText('settings page')).toBeInTheDocument();
  });

  it('renders explicit children instead of an outlet', () => {
    setAuth('authenticated', user);
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route
            path="/settings"
            element={
              <ProtectedRoute requireAuth={true}>
                <h1>child content</h1>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
