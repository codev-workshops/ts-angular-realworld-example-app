import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { FollowButton } from './FollowButton';
import { Profile } from './model';

const profile: Profile = {
  username: 'johndoe',
  bio: null,
  image: null,
  following: false,
};

/** Mirrors the Angular parent: the parent owns the profile state. */
function Harness({ isAuthenticated = true }: { isAuthenticated?: boolean }) {
  const [current, setCurrent] = useState(profile);
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <FollowButton
              profile={current}
              isAuthenticated={isAuthenticated}
              onToggle={updated => setCurrent(updated)}
            />
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('FollowButton', () => {
  it('renders the outline variant and the Follow label', () => {
    render(<Harness />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-outline-secondary');
    expect(button).toHaveTextContent('Follow johndoe');
  });

  it('follows the user and switches to the Unfollow label', async () => {
    server.use(
      mswHttp.post(`${API_URL}/profiles/${profile.username}/follow`, () =>
        HttpResponse.json({ profile: { ...profile, following: true } }),
      ),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button'));

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Unfollow johndoe');
    expect(button).toHaveClass('btn-secondary');
  });

  it('unfollows the user and switches back to the Follow label', async () => {
    server.use(
      mswHttp.post(`${API_URL}/profiles/${profile.username}/follow`, () =>
        HttpResponse.json({ profile: { ...profile, following: true } }),
      ),
      mswHttp.delete(`${API_URL}/profiles/${profile.username}/follow`, () =>
        HttpResponse.json({ profile: { ...profile, following: false } }),
      ),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button'));

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Follow johndoe');
    expect(button).toHaveClass('btn-outline-secondary');
  });

  it('redirects anonymous users to /login without calling the API', async () => {
    render(<Harness isAuthenticated={false} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('leaves the profile untouched when the request fails', async () => {
    server.use(
      mswHttp.post(`${API_URL}/profiles/${profile.username}/follow`, () =>
        HttpResponse.json({ errors: { body: ['boom'] } }, { status: 422 }),
      ),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('Follow johndoe');
  });
});
