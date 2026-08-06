import type { Profile } from '@/features/profile/models/profile';

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Profile;
}
