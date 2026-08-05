import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArticleList } from '../../article/ArticleList';
import { ArticleListConfig } from '../../article/list-config';
import { getProfile } from '../api';

/**
 * Port of `profile-articles.component.ts`.
 *
 * The config is only built once the profile has loaded (Angular's
 * `@if (articlesConfig())`), and its identity is memoized so `ArticleList`
 * does not see a "config changed" update on every render.
 */
export function ProfileArticles() {
  const { username = '' } = useParams<{ username: string }>();

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username),
    retry: false,
  });

  const articlesConfig: ArticleListConfig | null = useMemo(
    () => (profile ? { type: 'all', filters: { author: profile.username } } : null),
    [profile],
  );

  return articlesConfig ? <ArticleList limit={10} config={articlesConfig} /> : null;
}
