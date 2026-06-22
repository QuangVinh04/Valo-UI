export type SettingsFormModal = 'phone' | 'address' | 'password';

export type ConfirmAction = 'clearChat' | 'deleteAccount' | 'signOut';

export type UserProfile = {
  phoneNumber?: string | null;
  address?: string | null;
};
