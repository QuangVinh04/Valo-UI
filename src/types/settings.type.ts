export type SettingsFormModal = 'phone' | 'address' | 'password';

export type ConfirmAction = 'clearChat' | 'deleteAccount';

export type UserProfile = {
  id?: string;
  phoneNumber?: string | null;
  address?: string | null;
};
