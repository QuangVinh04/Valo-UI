export type SettingsFormModal = 'name' | 'phone' | 'address' | 'password';

export type ConfirmAction = 'clearChat' | 'deleteAccount';

export type UserProfile = {
  id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string | null;
  address?: string | null;
};
