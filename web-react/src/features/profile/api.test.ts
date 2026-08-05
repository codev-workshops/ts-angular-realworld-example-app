import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { followUser, getProfile, unfollowUser } from './api';
import { Profile } from './model';

const mockProfile: Profile = {
  username: 'testuser',
  bio: 'Test bio',
  image: 'https://example.com/avatar.jpg',
  following: false,
};

describe('profile api', () => {
  describe('getProfile', () => {
    it('fetches a profile by username with GET', async () => {
      let method = '';
      server.use(
        mswHttp.get(`${API_URL}/profiles/testuser`, ({ request }) => {
          method = request.method;
          return HttpResponse.json({ profile: mockProfile });
        }),
      );

      const profile = await getProfile('testuser');

      expect(method).toBe('GET');
      expect(profile).toEqual(mockProfile);
    });

    it('extracts the profile from the response wrapper', async () => {
      server.use(mswHttp.get(`${API_URL}/profiles/testuser`, () => HttpResponse.json({ profile: mockProfile })));

      const profile = await getProfile('testuser');

      expect(profile).toEqual(mockProfile);
      expect('profile' in profile).toBe(false);
    });

    it('rejects with status 404 when the profile is not found', async () => {
      server.use(
        mswHttp.get(`${API_URL}/profiles/nonexistent`, () =>
          HttpResponse.json({ errors: { profile: ['not found'] } }, { status: 404 }),
        ),
      );

      await expect(getProfile('nonexistent')).rejects.toMatchObject({ status: 404 });
    });

    it('handles a username with special characters', async () => {
      const username = 'user-name_123';
      server.use(
        mswHttp.get(`${API_URL}/profiles/${username}`, () =>
          HttpResponse.json({ profile: { ...mockProfile, username } }),
        ),
      );

      await expect(getProfile(username)).resolves.toMatchObject({ username });
    });

    it('issues one request per call', async () => {
      let calls = 0;
      server.use(
        mswHttp.get(`${API_URL}/profiles/testuser`, () => {
          calls += 1;
          return HttpResponse.json({ profile: mockProfile });
        }),
      );

      await Promise.all([getProfile('testuser'), getProfile('testuser')]);

      expect(calls).toBe(2);
    });

    it('handles a profile with a null bio', async () => {
      server.use(
        mswHttp.get(`${API_URL}/profiles/testuser`, () =>
          HttpResponse.json({ profile: { ...mockProfile, bio: null } }),
        ),
      );

      await expect(getProfile('testuser')).resolves.toMatchObject({ bio: null });
    });

    it('handles a profile with an empty image', async () => {
      server.use(
        mswHttp.get(`${API_URL}/profiles/testuser`, () => HttpResponse.json({ profile: { ...mockProfile, image: '' } })),
      );

      await expect(getProfile('testuser')).resolves.toMatchObject({ image: '' });
    });

    it('handles a following status of true', async () => {
      const username = 'followeduser';
      server.use(
        mswHttp.get(`${API_URL}/profiles/${username}`, () =>
          HttpResponse.json({ profile: { ...mockProfile, username, following: true } }),
        ),
      );

      await expect(getProfile(username)).resolves.toMatchObject({ following: true });
    });

    it('rejects with status 401 on unauthorized access', async () => {
      server.use(
        mswHttp.get(`${API_URL}/profiles/privateuser`, () =>
          HttpResponse.json({ errors: { profile: ['unauthorized'] } }, { status: 401 }),
        ),
      );

      await expect(getProfile('privateuser')).rejects.toMatchObject({ status: 401 });
    });

    it('rejects with status 500 on a server error', async () => {
      server.use(
        mswHttp.get(`${API_URL}/profiles/testuser`, () =>
          HttpResponse.json({ errors: { profile: ['server error'] } }, { status: 500 }),
        ),
      );

      await expect(getProfile('testuser')).rejects.toMatchObject({ status: 500 });
    });

    it('handles a very long username', async () => {
      const username = 'a'.repeat(50);
      server.use(
        mswHttp.get(`${API_URL}/profiles/${username}`, () =>
          HttpResponse.json({ profile: { ...mockProfile, username } }),
        ),
      );

      await expect(getProfile(username)).resolves.toMatchObject({ username });
    });

    it('handles a profile with a very long bio', async () => {
      const bio = 'a'.repeat(1000);
      server.use(
        mswHttp.get(`${API_URL}/profiles/testuser`, () => HttpResponse.json({ profile: { ...mockProfile, bio } })),
      );

      await expect(getProfile('testuser')).resolves.toMatchObject({ bio });
    });
  });

  describe('followUser', () => {
    it('follows a user with POST and an empty body', async () => {
      const username = 'usertofollow';
      let method = '';
      let body: unknown;
      server.use(
        mswHttp.post(`${API_URL}/profiles/${username}/follow`, async ({ request }) => {
          method = request.method;
          body = await request.json();
          return HttpResponse.json({ profile: { ...mockProfile, username, following: true } });
        }),
      );

      const profile = await followUser(username);

      expect(method).toBe('POST');
      expect(body).toEqual({});
      expect(profile.following).toBe(true);
      expect(profile.username).toBe(username);
    });

    it('extracts the profile from the response wrapper', async () => {
      server.use(
        mswHttp.post(`${API_URL}/profiles/testuser/follow`, () =>
          HttpResponse.json({ profile: { ...mockProfile, following: true } }),
        ),
      );

      const profile = await followUser('testuser');

      expect('profile' in profile).toBe(false);
    });

    it('handles already following', async () => {
      const username = 'alreadyfollowed';
      server.use(
        mswHttp.post(`${API_URL}/profiles/${username}/follow`, () =>
          HttpResponse.json({ profile: { ...mockProfile, username, following: true } }),
        ),
      );

      await expect(followUser(username)).resolves.toMatchObject({ following: true });
    });

    it('rejects with status 403 when following is forbidden', async () => {
      server.use(
        mswHttp.post(`${API_URL}/profiles/cannotfollow/follow`, () =>
          HttpResponse.json({ errors: { profile: ['cannot follow'] } }, { status: 403 }),
        ),
      );

      await expect(followUser('cannotfollow')).rejects.toMatchObject({ status: 403 });
    });

    it('rejects with status 401 when unauthenticated', async () => {
      server.use(
        mswHttp.post(`${API_URL}/profiles/someuser/follow`, () =>
          HttpResponse.json({ errors: { profile: ['must be logged in'] } }, { status: 401 }),
        ),
      );

      await expect(followUser('someuser')).rejects.toMatchObject({ status: 401 });
    });

    it('rejects with status 404 when the user does not exist', async () => {
      server.use(
        mswHttp.post(`${API_URL}/profiles/nonexistent/follow`, () =>
          HttpResponse.json({ errors: { profile: ['not found'] } }, { status: 404 }),
        ),
      );

      await expect(followUser('nonexistent')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('unfollowUser', () => {
    it('unfollows a user with DELETE', async () => {
      const username = 'usertounfollow';
      let method = '';
      server.use(
        mswHttp.delete(`${API_URL}/profiles/${username}/follow`, ({ request }) => {
          method = request.method;
          return HttpResponse.json({ profile: { ...mockProfile, username, following: false } });
        }),
      );

      const profile = await unfollowUser(username);

      expect(method).toBe('DELETE');
      expect(profile.following).toBe(false);
      expect(profile.username).toBe(username);
    });

    it('extracts the profile from the response wrapper', async () => {
      server.use(
        mswHttp.delete(`${API_URL}/profiles/testuser/follow`, () =>
          HttpResponse.json({ profile: { ...mockProfile, following: false } }),
        ),
      );

      const profile = await unfollowUser('testuser');

      expect('profile' in profile).toBe(false);
    });

    it('handles already not following', async () => {
      const username = 'notfollowed';
      server.use(
        mswHttp.delete(`${API_URL}/profiles/${username}/follow`, () =>
          HttpResponse.json({ profile: { ...mockProfile, username, following: false } }),
        ),
      );

      await expect(unfollowUser(username)).resolves.toMatchObject({ following: false });
    });

    it('rejects with status 403 when unfollowing is forbidden', async () => {
      server.use(
        mswHttp.delete(`${API_URL}/profiles/cannotunfollow/follow`, () =>
          HttpResponse.json({ errors: { profile: ['cannot unfollow'] } }, { status: 403 }),
        ),
      );

      await expect(unfollowUser('cannotunfollow')).rejects.toMatchObject({ status: 403 });
    });

    it('rejects with status 401 when unauthenticated', async () => {
      server.use(
        mswHttp.delete(`${API_URL}/profiles/someuser/follow`, () =>
          HttpResponse.json({ errors: { profile: ['must be logged in'] } }, { status: 401 }),
        ),
      );

      await expect(unfollowUser('someuser')).rejects.toMatchObject({ status: 401 });
    });

    it('rejects with status 404 when the user does not exist', async () => {
      server.use(
        mswHttp.delete(`${API_URL}/profiles/nonexistent/follow`, () =>
          HttpResponse.json({ errors: { profile: ['not found'] } }, { status: 404 }),
        ),
      );

      await expect(unfollowUser('nonexistent')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('integration scenarios', () => {
    it('handles a follow then unfollow sequence', async () => {
      const username = 'testuser';
      server.use(
        mswHttp.post(`${API_URL}/profiles/${username}/follow`, () =>
          HttpResponse.json({ profile: { ...mockProfile, following: true } }),
        ),
        mswHttp.delete(`${API_URL}/profiles/${username}/follow`, () =>
          HttpResponse.json({ profile: { ...mockProfile, following: false } }),
        ),
      );

      await expect(followUser(username)).resolves.toMatchObject({ following: true });
      await expect(unfollowUser(username)).resolves.toMatchObject({ following: false });
    });

    it('handles a get then follow sequence', async () => {
      const username = 'testuser';
      server.use(
        mswHttp.get(`${API_URL}/profiles/${username}`, () => HttpResponse.json({ profile: mockProfile })),
        mswHttp.post(`${API_URL}/profiles/${username}/follow`, () =>
          HttpResponse.json({ profile: { ...mockProfile, following: true } }),
        ),
      );

      await expect(getProfile(username)).resolves.toMatchObject({ following: false });
      await expect(followUser(username)).resolves.toMatchObject({ following: true });
    });
  });
});
