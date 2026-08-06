import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArticleList } from '@/features/article/components/ArticleList';
import { get as getProfile } from '../services/profile';
import type { ArticleListConfig } from '@/features/article/models/article-list-config';

/**
 * Port of `src/app/features/profile/components/profile-favorites.component.ts`.
 * The articles this user favorited: fetches the profile for the `:username` route param
 * (Angular read it from the parent route) and feeds a `favorited` filter to `ArticleList`.
 */
export default function ProfileFavorites() {
  const { username } = useParams<{ username: string }>();
  const [config, setConfig] = useState<ArticleListConfig | null>(null);

  useEffect(() => {
    if (!username) {
      return;
    }
    let active = true;
    getProfile(username)
      .then(profile => {
        if (active) {
          setConfig({ type: 'all', filters: { favorited: profile.username } });
        }
      })
      .catch(() => {
        // Angular's subscribe had no error handler.
      });
    return () => {
      active = false;
    };
  }, [username]);

  return config ? <ArticleList limit={10} config={config} /> : null;
}
