import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToken, saveToken } from '../../core/auth/jwt';
import { User } from '../../core/auth/model';
import { setNavigate, useAuthStore } from '../../core/auth/store';
import { API_URL, server } from '../../test/msw-server';
import { Settings } from './Settings';

const user: User = {
  email: 'test@example.com',
  token: 'test-jwt-token',
  username: 'testuser',
  bio: 'Test bio',
  image: 'https://example.com/avatar.jpg',
};

const navigate = vi.fn();

function signIn(overrides: Partial<User> = {}): User {
  const signedIn = { ...user, ...overrides };
  saveToken(signedIn.token);
  useAuthStore.setState({ currentUser: signedIn, authState: 'authenticated' });
  return signedIn;
}

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile/:username" element={<div>profile page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const imageInput = () => screen.getByPlaceholderText('URL of profile picture');
const usernameInput = () => screen.getByPlaceholderText('Username');
const bioInput = () => screen.getByPlaceholderText('Short bio about you');
const emailInput = () => screen.getByPlaceholderText('Email');
const passwordInput = () => screen.getByPlaceholderText('New Password');

beforeEach(() => {
  navigate.mockClear();
  setNavigate(navigate);
  useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
});

afterEach(() => {
  useAuthStore.getState().purgeAuth();
});

describe('Settings', () => {
  it('prefills the form from the current user', () => {
    signIn();
    renderSettings();

    expect(imageInput()).toHaveValue(user.image);
    expect(usernameInput()).toHaveValue(user.username);
    expect(bioInput()).toHaveValue(user.bio);
    expect(emailInput()).toHaveValue(user.email);
    expect(passwordInput()).toHaveValue('');
  });

  it('prefills a null bio and image as empty strings, never "null"', () => {
    signIn({ bio: null, image: null });
    renderSettings();

    expect(imageInput()).toHaveValue('');
    expect(bioInput()).toHaveValue('');
  });

  it('submits the form and navigates to the profile page', async () => {
    let body: unknown;
    server.use(
      mswHttp.put(`${API_URL}/user`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ user: { ...user, bio: 'Updated bio' } });
      }),
    );

    signIn();
    renderSettings();

    await userEvent.clear(bioInput());
    await userEvent.type(bioInput(), 'Updated bio');
    await userEvent.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(await screen.findByText('profile page')).toBeInTheDocument();
    expect(body).toEqual({
      user: {
        image: user.image,
        username: user.username,
        bio: 'Updated bio',
        email: user.email,
        password: '',
      },
    });
  });

  it('updates the cached user without touching the token or the auth state', async () => {
    server.use(mswHttp.put(`${API_URL}/user`, () => HttpResponse.json({ user: { ...user, bio: 'Updated bio' } })));

    signIn();
    renderSettings();

    await userEvent.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(await screen.findByText('profile page')).toBeInTheDocument();
    expect(useAuthStore.getState().currentUser?.bio).toBe('Updated bio');
    expect(useAuthStore.getState().currentUser?.username).toBe(user.username);
    expect(useAuthStore.getState().authState).toBe('authenticated');
    expect(getToken()).toBe(user.token);
  });

  it('renders API errors and stays on the page', async () => {
    server.use(
      mswHttp.put(`${API_URL}/user`, () => HttpResponse.json({ errors: { email: ['is invalid'] } }, { status: 422 })),
    );

    signIn();
    renderSettings();

    await userEvent.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(await screen.findByText('email is invalid')).toBeInTheDocument();
    expect(screen.queryByText('profile page')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Settings' })).toBeEnabled();
  });

  it('logs out and navigates home', async () => {
    signIn();
    renderSettings();

    await userEvent.click(screen.getByRole('button', { name: 'Or click here to logout.' }));

    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().authState).toBe('unauthenticated');
    expect(getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
