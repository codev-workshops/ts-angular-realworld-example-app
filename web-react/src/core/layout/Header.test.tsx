import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthState, User } from '../auth/model';
import { useAuthStore } from '../auth/store';
import { Header } from './Header';

const user: User = {
  email: 'test@example.com',
  token: 'test-jwt-token',
  username: 'testuser',
  bio: null,
  image: 'https://example.com/avatar.jpg',
};

function renderHeader(authState: AuthState, currentUser: User | null = null, path = '/') {
  useAuthStore.setState({ authState, currentUser });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ authState: 'loading', currentUser: null });
});

afterEach(() => {
  useAuthStore.setState({ authState: 'loading', currentUser: null });
});

describe('Header', () => {
  it('always renders the brand inside nav.navbar.navbar-light', () => {
    const { container } = renderHeader('unauthenticated');

    expect(container.querySelector('nav.navbar.navbar-light')).not.toBeNull();
    const brand = container.querySelector('a.navbar-brand');
    expect(brand).toHaveTextContent('conduit');
    expect(brand).toHaveAttribute('href', '/');
  });

  it('renders Home / Sign in / Sign up when unauthenticated', () => {
    const { container } = renderHeader('unauthenticated');

    expect(container.querySelectorAll('ul.nav.navbar-nav.pull-xs-right')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: /New Article/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders Home / New Article / Settings / the profile link when authenticated', () => {
    const { container } = renderHeader('authenticated', user);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /New Article/ })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: /testuser/ })).toHaveAttribute('href', '/profile/testuser');

    expect(container.querySelector('i.ion-compose')).not.toBeNull();
    expect(container.querySelector('i.ion-gear-a')).not.toBeNull();
    const avatar = container.querySelector('img.user-pic');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');

    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('falls back to the default avatar when the user has no image', () => {
    const { container } = renderHeader('authenticated', { ...user, image: null });

    expect(container.querySelector('img.user-pic')).toHaveAttribute('src', '/assets/images/default-avatar.svg');
  });

  it('renders Home / New Article / Settings / Connecting... when auth is unavailable', () => {
    const { container } = renderHeader('unavailable');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /New Article/ })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings');

    const connecting = container.querySelector('span.nav-link');
    expect(connecting).toHaveTextContent('Connecting...');
    expect(connecting).toHaveAttribute('title', 'Auth unavailable - retrying automatically');
    expect(connecting?.querySelector('i.ion-load-c')).not.toBeNull();

    expect(container.querySelector('img.user-pic')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('renders only Home / Loading... while loading', () => {
    const { container } = renderHeader('loading');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(container.querySelector('span.nav-link')).toHaveTextContent('Loading...');
    expect(screen.queryByRole('link', { name: /New Article/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
  });

  it('marks the active route with the active class', () => {
    renderHeader('unauthenticated', null, '/login');

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass('nav-link', 'active');
    expect(screen.getByRole('link', { name: 'Sign up' })).not.toHaveClass('active');
  });

  it('matches the authenticated Home link exactly (routerLinkActiveOptions exact)', () => {
    renderHeader('authenticated', user, '/settings');

    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('active');
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveClass('nav-link', 'active');
  });
});
