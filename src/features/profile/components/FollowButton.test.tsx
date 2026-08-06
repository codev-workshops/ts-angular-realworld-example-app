import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FollowButton } from './FollowButton';
import { useAuthStore } from '@/core/auth/store';
import type { Profile } from '../models/profile';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const follow = vi.fn();
const unfollow = vi.fn();
vi.mock('../services/profile', () => ({
  follow: (username: string) => follow(username),
  unfollow: (username: string) => unfollow(username),
}));

const profile = (following: boolean): Profile => ({
  username: 'johndoe',
  bio: null,
  image: null,
  following,
});

const authenticate = () =>
  useAuthStore.setState({
    currentUser: { email: 'a@b.c', token: 'jwt', username: 'me', bio: null, image: null },
    authState: 'authenticated',
  });

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('redirects anonymous users to login without calling the API', async () => {
    render(
      <MemoryRouter>
        <FollowButton profile={profile(false)} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(navigate).toHaveBeenCalledWith('/login');
    expect(follow).not.toHaveBeenCalled();
  });

  it('follows an unfollowed profile and reports the returned profile', async () => {
    authenticate();
    const returned = profile(true);
    follow.mockResolvedValue(returned);
    const onToggle = vi.fn();

    render(
      <MemoryRouter>
        <FollowButton profile={profile(false)} onToggle={onToggle} />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-outline-secondary');
    expect(button).toHaveTextContent('Follow johndoe');

    await userEvent.click(button);

    expect(follow).toHaveBeenCalledWith('johndoe');
    expect(onToggle).toHaveBeenCalledWith(returned);
  });

  it('unfollows a followed profile', async () => {
    authenticate();
    const returned = profile(false);
    unfollow.mockResolvedValue(returned);
    const onToggle = vi.fn();

    render(
      <MemoryRouter>
        <FollowButton profile={profile(true)} onToggle={onToggle} />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-secondary');
    expect(button).toHaveTextContent('Unfollow johndoe');

    await userEvent.click(button);

    expect(unfollow).toHaveBeenCalledWith('johndoe');
    expect(onToggle).toHaveBeenCalledWith(returned);
  });

  it('does not report a toggle when the request fails', async () => {
    authenticate();
    follow.mockRejectedValue({ errors: { network: ['nope'] }, status: 0 });
    const onToggle = vi.fn();

    render(
      <MemoryRouter>
        <FollowButton profile={profile(false)} onToggle={onToggle} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).not.toHaveClass('disabled');
  });
});
