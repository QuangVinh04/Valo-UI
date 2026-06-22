import { apiRequest } from '@/lib/api';
import { normalizeUserSettings, type UserSettingsInput } from '@/context/PreferencesContext';
import { clearAuthState, storeAuthUser } from '@/lib/auth';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  mustChangePassword: boolean;
  accessToken: string | null;
  settings: UserSettingsInput;
};

export async function register(fullName: string, email: string): Promise<boolean> {
  return apiRequest<boolean>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ fullName, email }),
  });
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const user = await apiRequest<AuthUser>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });

  if (user.accessToken) {
    localStorage.setItem('accessToken', user.accessToken);
    storeAuthUser({ fullName: user.fullName, email: user.email });
    const settings = normalizeUserSettings(user.settings);
    localStorage.setItem('theme', settings.theme);
    localStorage.setItem('language', settings.language);
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.language;

    window.dispatchEvent(new Event('auth:changed'));
    window.dispatchEvent(new Event('preferences:changed'));
  }

  return user;
}

export async function getCurrentUserPermissions(): Promise<string[]> {
  return apiRequest<string[]>('/auth/permissions', {
    method: 'GET',
  });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<null> {
  return apiRequest<null>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<null>('/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearAuthState();
    window.dispatchEvent(new Event('auth:changed'));
  }
}
