import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './Layout';
import { setNavigator, useAuthStore } from '@/core/auth/store';

vi.mock('@/core/auth/store', async () => {
  const actual = await vi.importActual<typeof import('@/core/auth/store')>('@/core/auth/store');
  return { ...actual, setNavigator: vi.fn() };
});

function renderLayout(page = <p>page</p>) {
  const router = createMemoryRouter([{ element: <Layout />, children: [{ index: true, element: page }] }]);
  render(<RouterProvider router={router} />);
  return router;
}

describe('Layout', () => {
  beforeEach(() => {
    vi.mocked(setNavigator).mockClear();
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('renders the header, the routed page and the footer', () => {
    renderLayout();

    expect(document.querySelector('nav.navbar')).not.toBeNull();
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(document.querySelector('footer')).not.toBeNull();
  });

  it('hands the router navigate to the auth store so logout can redirect', async () => {
    const router = renderLayout();

    expect(setNavigator).toHaveBeenCalledTimes(1);
    const navigate = vi.mocked(setNavigator).mock.calls[0][0];

    navigate('/login');
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
