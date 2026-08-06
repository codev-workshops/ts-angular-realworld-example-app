import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';
import { useAuthStore } from './store';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const renderAuth = (authType: 'login' | 'register') =>
  render(
    <MemoryRouter>
      <Auth authType={authType} />
    </MemoryRouter>,
  );

describe('Auth', () => {
  beforeEach(() => {
    navigate.mockReset();
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('renders the login title, the switch link and no username control', () => {
    renderAuth('login');

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Need an account?' })).toHaveAttribute('href', '/register');
    expect(document.querySelector('input[formControlName="username"]')).toBeNull();
    expect(document.querySelector('input[formControlName="email"]')).not.toBeNull();
    expect(document.querySelector('input[formControlName="password"]')).not.toBeNull();
  });

  it('adds the username control for register only', () => {
    renderAuth('register');

    expect(screen.getByRole('heading', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Have an account?' })).toHaveAttribute('href', '/login');
    expect(document.querySelector('input[formControlName="username"]')).not.toBeNull();
  });

  it('keeps submit disabled until every control is filled', async () => {
    renderAuth('register');
    const submit = screen.getByRole('button', { name: 'Sign up' });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.c');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Username'), 'jane');
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it('logs in with email and password, then navigates home', async () => {
    const login = vi.fn().mockResolvedValue({ username: 'jane' });
    useAuthStore.setState({ login });
    renderAuth('login');

    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.c');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret' }));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('registers with the dynamic username included', async () => {
    const registerUser = vi.fn().mockResolvedValue({ username: 'jane' });
    useAuthStore.setState({ register: registerUser });
    renderAuth('register');

    await userEvent.type(screen.getByPlaceholderText('Username'), 'jane');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.c');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() =>
      expect(registerUser).toHaveBeenCalledWith({ username: 'jane', email: 'a@b.c', password: 'secret' }),
    );
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('renders API errors and re-enables the form', async () => {
    const login = vi.fn().mockRejectedValue({ errors: { 'email or password': ['is invalid'] }, status: 403 });
    useAuthStore.setState({ login });
    renderAuth('login');

    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.c');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('email or password is invalid')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeEnabled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('renders the network fallback error', async () => {
    const login = vi
      .fn()
      .mockRejectedValue({ errors: { network: ['Unable to connect. Please check your internet connection.'] } });
    useAuthStore.setState({ login });
    renderAuth('login');

    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.c');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/Unable to connect/)).toBeInTheDocument();
  });
});
