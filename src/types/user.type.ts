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
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserListItemDto = {
  id: string;
  fullName: string;
  email: string;
  groups: UserGroupSummary[];
};

export type UserProfileUpdate = {
  phoneNumber?: string;
  address?: string;
};

export type UserListFilters = {
  search?: string;
  groupId?: string;
  mustChangePassword?: boolean;
};

export type CreateUserPayload = {
  fullName: string;
  email: string;
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
  phoneNumber: string | null;
  address: string | null;
};
