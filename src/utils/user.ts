import type { User } from 'firebase/auth';
import type { UserProfile } from '../services/authService';

export const getUserDisplayInfo = (
  userProfile: UserProfile | null | undefined,
  user: User | null | undefined,
) => {
  const fallbackEmail = user?.email ? user.email.split('@')[0] : undefined;
  const name =
    userProfile?.displayName ||
    user?.displayName ||
    fallbackEmail ||
    'User';

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'U';

  return {
    name,
    initials,
  };
};
