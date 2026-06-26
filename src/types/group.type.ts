export type GroupListItemDto = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
};

export type GroupDto = GroupListItemDto & {
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type GroupMemberDto = {
  id: string;
  name: string;
  memberCount: number;
  members: Array<{
    id: string;
    fullName: string;
    email: string;
  }>;
};

export type CreatedGroupDto = {
  id: string;
};

export type CreateGroupPayload = {
  name: string;
  description?: string;
  permissions?: string[];
};

export type UpdateGroupPayload = Partial<CreateGroupPayload>;
