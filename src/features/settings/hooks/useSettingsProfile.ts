import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUser, type UserProfileDto } from '@/services/user.service';
import type { UserProfile } from '../types';

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
