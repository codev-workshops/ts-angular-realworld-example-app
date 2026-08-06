import { useOutletContext } from 'react-router-dom';
import { ArticleList } from '../../article/components/ArticleList';
import type { Profile } from '../models/profile';

export default function ProfileFavorites() {
  const profile = useOutletContext<Profile>();

  return (
    <app-profile-favorites>
      <ArticleList limit={10} config={{ type: 'all', filters: { favorited: profile.username } }} />
    </app-profile-favorites>
  );
}
