import type { UserSettingsInput } from '@/context/PreferencesContext';

export type AuthUser = {
  id: string;
  fullName: string;
  email?: string;
  mustChangePassword: boolean;
  accessToken: string | null;
  settings: UserSettingsInput;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
