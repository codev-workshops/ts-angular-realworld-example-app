import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { AuthPage } from './AuthPage';
import { useAuthStore } from './store';

const user = {
  email: 'jake@jake.jake',
  token: 'jwt.token.here',
  username: 'jake',
  bio: 'I work at statefarm',
  image: null,
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/tmp/login" element={<AuthPage />} />
        <Route path="/tmp/register" element={<AuthPage />} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const emailInput = () => screen.getByPlaceholderText('Email');
const passwordInput = () => screen.getByPlaceholderText('Password');

beforeEach(() => {
  useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
});

describe('AuthPage', () => {
  it('renders the login variant', () => {
    renderAt('/login');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign in');
    expect(screen.getByRole('link', { name: 'Need an account?' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Username')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders the register variant with a username field', () => {
    renderAt('/register');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign up');
    expect(screen.getByRole('link', { name: 'Have an account?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('derives the mode from the last path segment under a temporary prefix', () => {
    renderAt('/tmp/register');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign up');
    expect(screen.getByRole('link', { name: 'Have an account?' })).toHaveAttribute('href', '/tmp/login');
  });

  it('keeps the inputs selectable by the Angular formControlName selectors', () => {
    const { container } = renderAt('/register');

    expect(container.querySelector('input[formControlName="username"]')).toBeInTheDocument();
    expect(container.querySelector('input[formControlName="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[formControlName="password"]')).toBeInTheDocument();
  });

  it('disables submit until every required field is filled', async () => {
    renderAt('/register');
    const button = screen.getByRole('button', { name: 'Sign up' });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Username'), 'jake');
    await userEvent.type(emailInput(), 'jake@jake.jake');
    expect(button).toBeDisabled();

    await userEvent.type(passwordInput(), 'jakejake');
    expect(button).toBeEnabled();
  });

  it('logs in and navigates home', async () => {
    server.use(mswHttp.post(`${API_URL}/users/login`, () => HttpResponse.json({ user })));

    renderAt('/login');
    await userEvent.type(emailInput(), 'jake@jake.jake');
    await userEvent.type(passwordInput(), 'jakejake');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(useAuthStore.getState().authState).toBe('authenticated');
    expect(useAuthStore.getState().currentUser).toEqual(user);
  });

  it('registers and navigates home', async () => {
    server.use(mswHttp.post(`${API_URL}/users`, () => HttpResponse.json({ user })));

    renderAt('/register');
    await userEvent.type(screen.getByPlaceholderText('Username'), 'jake');
    await userEvent.type(emailInput(), 'jake@jake.jake');
    await userEvent.type(passwordInput(), 'jakejake');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(useAuthStore.getState().authState).toBe('authenticated');
  });

  it('renders API validation errors and stays on the page', async () => {
    server.use(
      mswHttp.post(`${API_URL}/users`, () =>
        HttpResponse.json({ errors: { email: ['has already been taken'] } }, { status: 422 }),
      ),
    );

    renderAt('/register');
    await userEvent.type(screen.getByPlaceholderText('Username'), 'jake');
    await userEvent.type(emailInput(), 'jake@jake.jake');
    await userEvent.type(passwordInput(), 'jakejake');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('email has already been taken')).toBeInTheDocument();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
    expect(useAuthStore.getState().authState).toBe('unauthenticated');
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
  });

  it('renders the network fallback error when the request fails outright', async () => {
    server.use(mswHttp.post(`${API_URL}/users/login`, () => HttpResponse.error()));

    renderAt('/login');
    await userEvent.type(emailInput(), 'jake@jake.jake');
    await userEvent.type(passwordInput(), 'jakejake');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/Unable to connect/)).toBeInTheDocument();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });
});
