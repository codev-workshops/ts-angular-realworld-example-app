import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_URL, server } from '../../../test/msw-server';
import { useAuthStore } from '../../../core/auth/store';
import { Article } from '../../article/model';
import { Profile as ProfileModel } from '../model';
import { Profile } from './Profile';
import { ProfileArticles } from './ProfileArticles';
import { ProfileFavorites } from './ProfileFavorites';

const profile: ProfileModel = {
  username: 'johndoe',
  bio: null,
  image: null,
  following: false,
};

function makeArticle(slug: string): Article {
  return {
    slug,
    title: `Title ${slug}`,
    description: `Description ${slug}`,
    body: 'body',
    tagList: [],
    createdAt: '2016-02-18T03:22:56.637Z',
    updatedAt: '2016-02-18T03:48:35.824Z',
    favorited: false,
    favoritesCount: 0,
    author: profile,
  };
}

function profileHandler(overrides: Partial<ProfileModel> = {}) {
  return mswHttp.get(`${API_URL}/profiles/${profile.username}`, () =>
    HttpResponse.json({ profile: { ...profile, ...overrides } }),
  );
}

/** Captures the query string the article list requested. */
let lastArticlesRequest: URL | null = null;

function articlesHandler(slug = 'a') {
  return mswHttp.get(`${API_URL}/articles`, ({ request }) => {
    lastArticlesRequest = new URL(request.url);
    return HttpResponse.json({ articles: [makeArticle(slug)], articlesCount: 1 });
  });
}

function renderProfile(initialPath = `/profile/${profile.username}`) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/profile/:username" element={<Profile />}>
            <Route index element={<ProfileArticles />} />
            <Route path="favorites" element={<ProfileFavorites />} />
          </Route>
          <Route path="/settings" element={<div>settings page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Profile page', () => {
  beforeEach(() => {
    lastArticlesRequest = null;
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('renders the user info banner with the follow button for another user', async () => {
    server.use(profileHandler(), articlesHandler());

    const { container } = renderProfile();

    expect(await screen.findByRole('heading', { level: 4 })).toHaveTextContent('johndoe');
    expect(container.querySelector('.profile-page')).toBeInTheDocument();
    expect(container.querySelector('.user-info')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Follow johndoe');
    expect(screen.queryByText('Edit Profile Settings')).not.toBeInTheDocument();
  });

  it('renders the default avatar and an empty bio for null fields', async () => {
    server.use(profileHandler(), articlesHandler());

    const { container } = renderProfile();

    await screen.findByRole('heading', { level: 4 });
    expect(container.querySelector('.user-img')).toHaveAttribute('src', '/assets/images/default-avatar.svg');
    expect(container.querySelector('.user-info p')?.textContent).toBe('');
  });

  it('renders the Edit Profile Settings link and no follow button on your own profile', async () => {
    useAuthStore.setState({
      currentUser: { email: 'john@doe.com', token: 'jwt', username: 'johndoe', bio: null, image: null },
      authState: 'authenticated',
    });
    server.use(profileHandler(), articlesHandler());

    renderProfile();

    expect(await screen.findByText('Edit Profile Settings')).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('button', { name: /Follow/ })).not.toBeInTheDocument();
  });

  it('lists the profile owner articles in the default child route', async () => {
    server.use(profileHandler(), articlesHandler());

    renderProfile();

    await waitFor(() => expect(lastArticlesRequest?.searchParams.get('author')).toBe('johndoe'));
    expect(await screen.findByText('Title a')).toBeInTheDocument();
  });

  it('navigates to the favorited tab and queries favorited articles', async () => {
    server.use(profileHandler(), articlesHandler());

    renderProfile();

    await screen.findByText('Favorited Posts');
    await userEvent.click(screen.getByText('Favorited Posts'));

    await waitFor(() => expect(lastArticlesRequest?.searchParams.get('favorited')).toBe('johndoe'));
    expect(lastArticlesRequest?.searchParams.get('author')).toBeNull();
  });

  it('renders favorited articles when landing directly on the favorites route', async () => {
    server.use(profileHandler(), articlesHandler());

    renderProfile(`/profile/${profile.username}/favorites`);

    await waitFor(() => expect(lastArticlesRequest?.searchParams.get('favorited')).toBe('johndoe'));
  });

  it('shows the API errors when the profile cannot be loaded', async () => {
    server.use(
      mswHttp.get(`${API_URL}/profiles/${profile.username}`, () =>
        HttpResponse.json({ errors: { profile: ['not found'] } }, { status: 404 }),
      ),
    );

    const { container } = renderProfile();

    expect(await screen.findByText('profile not found')).toBeInTheDocument();
    expect(container.querySelector('.user-info')).not.toBeInTheDocument();
  });

  it('shows the interceptor fallback body when the failure has no error payload', async () => {
    server.use(mswHttp.get(`${API_URL}/profiles/${profile.username}`, () => HttpResponse.json({}, { status: 500 })));

    renderProfile();

    expect(
      await screen.findByText('network Unable to connect. Please check your internet connection.'),
    ).toBeInTheDocument();
  });
});
