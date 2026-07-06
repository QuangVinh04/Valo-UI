export type UserGroupSummary = {
  id: string;
  name: string;
  description: string | null;
};

export type UserDto = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  groups: UserGroupSummary[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserListItemDto = {
  id: string;
  fullName: string;
  email: string;
  groups: UserGroupSummary[];
  active: boolean;
};

export type UserProfileUpdate = {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
};

export type UserListFilters = {
  search?: string;
  groupId?: string;
  active?: boolean;
};

export type CreateUserPayload = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  address?: string;
};

export type UpdateUserPayload = {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
};

export type CreatedUserDto = {
  id: string;
};

export type UserProfileDto = {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber: string | null;
  address: string | null;
};
