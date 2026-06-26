import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '@/services/user.service';
import type { UserProfileDto } from '@/types/user.type';
import type { UserProfile } from '@/types/settings.type';

export function useSettingsProfile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setError('');

      try {
        const user = await getCurrentUser();
        if (!ignore) {
          setProfile({
            id: user.id,
            phoneNumber: user.phoneNumber,
            address: user.address,
          });
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('settings.profileLoadFailed'));
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [t]);

  const updateProfileFromUser = (user: UserProfileDto) => {
    setProfile({
      id: user.id,
      phoneNumber: user.phoneNumber,
      address: user.address,
    });
  };

  return {
    profile,
    error,
    updateProfileFromUser,
  };
}
