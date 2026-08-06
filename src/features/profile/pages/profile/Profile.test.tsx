import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Profile } from './Profile';
import { useAuthStore } from '@/core/auth/store';
import type { Profile as ProfileModel } from '../../models/profile';

const get = vi.fn();
vi.mock('../../services/profile', () => ({
  get: (username: string) => get(username),
  follow: vi.fn(),
  unfollow: vi.fn(),
}));

const profile: ProfileModel = { username: 'johndoe', bio: 'the bio', image: null, following: false };

const renderAt = (path = '/profile/johndoe') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profile/:username" element={<Profile />}>
          <Route index element={<div>articles outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('Profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('loads and renders the profile for the :username route param', async () => {
    get.mockResolvedValue(profile);
    renderAt();

    expect(get).toHaveBeenCalledWith('johndoe');
    expect(await screen.findByRole('heading', { level: 4 })).toHaveTextContent('johndoe');
    expect(screen.getByText('the bio')).toBeInTheDocument();
  });

  it('shows the follow button (not the edit link) for another user', async () => {
    useAuthStore.setState({
      currentUser: { email: 'a@b.c', token: 'jwt', username: 'me', bio: null, image: null },
      authState: 'authenticated',
    });
    get.mockResolvedValue(profile);
    renderAt();

    expect(await screen.findByRole('button')).toHaveTextContent('Follow johndoe');
    expect(screen.queryByText('Edit Profile Settings')).not.toBeInTheDocument();
  });

  it('shows the edit-settings link (not a follow button) for the current user', async () => {
    useAuthStore.setState({
      currentUser: { email: 'a@b.c', token: 'jwt', username: 'johndoe', bio: null, image: null },
      authState: 'authenticated',
    });
    get.mockResolvedValue(profile);
    renderAt();

    const link = await screen.findByRole('link', { name: /Edit Profile Settings/ });
    expect(link).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the tab nav pointing at articles and favorites', async () => {
    get.mockResolvedValue(profile);
    renderAt();

    expect(await screen.findByRole('link', { name: 'My Posts' })).toHaveAttribute('href', '/profile/johndoe');
    expect(screen.getByRole('link', { name: 'Favorited Posts' })).toHaveAttribute('href', '/profile/johndoe/favorites');
  });

  it('renders a fallback error when the profile fails to load', async () => {
    get.mockRejectedValue({ status: 404 });
    renderAt();

    await waitFor(() => expect(screen.getByText(/Failed to load profile/)).toBeInTheDocument());
    expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
  });

  it('surfaces the API error body when present', async () => {
    get.mockRejectedValue({ status: 422, errors: { profile: ['not found'] } });
    renderAt();

    await waitFor(() => expect(screen.getByText(/profile not found/)).toBeInTheDocument());
  });
});
