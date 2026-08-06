import { useOutletContext } from 'react-router-dom';
import { ArticleList } from '../../article/components/ArticleList';
import type { Profile } from '../models/profile';

export default function ProfileArticles() {
  const profile = useOutletContext<Profile>();

  return (
    <app-profile-articles>
      <ArticleList limit={10} config={{ type: 'all', filters: { author: profile.username } }} />
    </app-profile-articles>
  );
}
