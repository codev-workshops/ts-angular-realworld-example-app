import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { useAuthStore } from '@/core/auth/store';
import type { User } from '@/core/auth/user';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const user = (overrides: Partial<User> = {}): User => ({
  email: 'jane@example.com',
  token: 'jwt',
  username: 'jane',
  bio: 'a bio',
  image: 'https://example.com/jane.png',
  ...overrides,
});

const renderSettings = () =>
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );

const input = (name: string) => document.querySelector(`[formControlName="${name}"]`) as HTMLInputElement;

describe('Settings', () => {
  beforeEach(() => {
    navigate.mockReset();
    useAuthStore.setState({ currentUser: user(), authState: 'authenticated' });
  });

  it('seeds the form from the cached current user', async () => {
    renderSettings();

    await waitFor(() => expect(input('username').value).toBe('jane'));
    expect(input('email').value).toBe('jane@example.com');
    expect(input('bio').value).toBe('a bio');
    expect(input('image').value).toBe('https://example.com/jane.png');
    expect(input('password').value).toBe('');
  });

  it('maps a null bio and image to empty strings', async () => {
    useAuthStore.setState({ currentUser: user({ bio: null, image: null }) });
    renderSettings();

    await waitFor(() => expect(input('username').value).toBe('jane'));
    expect(input('bio').value).toBe('');
    expect(input('image').value).toBe('');
  });

  it('omits the empty password and navigates to the updated profile', async () => {
    const update = vi.fn().mockResolvedValue(user({ username: 'jane2' }));
    useAuthStore.setState({ update });
    renderSettings();

    await waitFor(() => expect(input('username').value).toBe('jane'));
    await userEvent.clear(input('bio'));
    await userEvent.type(input('bio'), 'new bio');
    await userEvent.click(screen.getByRole('button', { name: 'Update Settings' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        image: 'https://example.com/jane.png',
        username: 'jane',
        bio: 'new bio',
        email: 'jane@example.com',
      }),
    );
    expect(navigate).toHaveBeenCalledWith('/profile/jane2');
  });

  it('sends a password that was actually typed', async () => {
    const update = vi.fn().mockResolvedValue(user());
    useAuthStore.setState({ update });
    renderSettings();

    await waitFor(() => expect(input('username').value).toBe('jane'));
    await userEvent.type(input('password'), 'newpassword');
    await userEvent.click(screen.getByRole('button', { name: 'Update Settings' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ password: 'newpassword' })));
  });

  it('renders errors and keeps the form usable when the update fails', async () => {
    const update = vi.fn().mockRejectedValue({ errors: { server: ['Failed to save settings'] }, status: 500 });
    useAuthStore.setState({ update });
    renderSettings();

    await waitFor(() => expect(input('username').value).toBe('jane'));
    await userEvent.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(await screen.findByText('server Failed to save settings')).toBeInTheDocument();
    expect(input('email')).toBeEnabled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('renders the network fallback error', async () => {
    const update = vi
      .fn()
      .mockRejectedValue({ errors: { network: ['Unable to connect. Please check your internet connection.'] } });
    useAuthStore.setState({ update });
    renderSettings();

    await waitFor(() => expect(input('username').value).toBe('jane'));
    await userEvent.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(await screen.findByText(/Unable to connect/)).toBeInTheDocument();
  });

  it('logs out through the store', async () => {
    const logout = vi.fn();
    useAuthStore.setState({ logout });
    renderSettings();

    await userEvent.click(screen.getByRole('button', { name: 'Or click here to logout.' }));

    expect(logout).toHaveBeenCalled();
  });
});
