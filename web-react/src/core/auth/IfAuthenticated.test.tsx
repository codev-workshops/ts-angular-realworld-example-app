import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IfAuthenticated } from './IfAuthenticated';
import { User } from './model';
import { useAuthStore } from './store';

const user: User = {
  email: 'test@example.com',
  token: 'test-jwt-token',
  username: 'testuser',
  bio: null,
  image: null,
};

function setUser(currentUser: User | null) {
  useAuthStore.setState({ currentUser, authState: currentUser ? 'authenticated' : 'unauthenticated' });
}

beforeEach(() => setUser(null));
afterEach(() => useAuthStore.setState({ currentUser: null, authState: 'loading' }));

describe('IfAuthenticated', () => {
  it('renders children for condition=true when authenticated', () => {
    setUser(user);
    render(<IfAuthenticated condition={true}>authed content</IfAuthenticated>);

    expect(screen.getByText('authed content')).toBeInTheDocument();
  });

  it('renders nothing for condition=true when unauthenticated', () => {
    render(<IfAuthenticated condition={true}>authed content</IfAuthenticated>);

    expect(screen.queryByText('authed content')).not.toBeInTheDocument();
  });

  it('renders children for condition=false when unauthenticated', () => {
    render(<IfAuthenticated condition={false}>anonymous content</IfAuthenticated>);

    expect(screen.getByText('anonymous content')).toBeInTheDocument();
  });

  it('renders nothing for condition=false when authenticated', () => {
    setUser(user);
    render(<IfAuthenticated condition={false}>anonymous content</IfAuthenticated>);

    expect(screen.queryByText('anonymous content')).not.toBeInTheDocument();
  });

  it('reacts to auth store changes', () => {
    const { queryByText } = render(<IfAuthenticated condition={true}>authed content</IfAuthenticated>);
    expect(queryByText('authed content')).not.toBeInTheDocument();

    act(() => setUser(user));
    expect(queryByText('authed content')).toBeInTheDocument();

    act(() => setUser(null));
    expect(queryByText('authed content')).not.toBeInTheDocument();
  });
});
