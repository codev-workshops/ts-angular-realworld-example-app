import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArticleList } from '../../article/ArticleList';
import { ArticleListConfig } from '../../article/list-config';
import { getProfile } from '../api';

/**
 * Port of `profile-favorites.component.ts`.
 *
 * Angular read `route.parent?.snapshot.params['username']`; React Router
 * exposes the parent route's params to nested routes through `useParams`.
 */
export function ProfileFavorites() {
  const { username = '' } = useParams<{ username: string }>();

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username),
    retry: false,
  });

  const favoritesConfig: ArticleListConfig | null = useMemo(
    () => (profile ? { type: 'all', filters: { favorited: profile.username } } : null),
    [profile],
  );

  return favoritesConfig ? <ArticleList limit={10} config={favoritesConfig} /> : null;
}
