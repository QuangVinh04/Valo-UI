import type { GroupDto, GroupListItemDto, GroupMemberDto } from '@/services/group.service';

type GroupViewSource = (GroupDto | GroupListItemDto) & Partial<Pick<GroupMemberDto, 'members'>>;

export type GroupViewModel = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  memberCount: number;
  members: Array<{
    id: string;
    fullName: string;
    email: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export function toGroupViewModel(group: GroupViewSource): GroupViewModel {
  const detailGroup = group as Partial<GroupDto & GroupMemberDto>;

  return {
    id: group.id,
    name: group.name,
    description: group.description ?? 'No description provided.',
    permissions: detailGroup.permissions ?? [],
    memberCount: group.memberCount,
    members: detailGroup.members ?? [],
    createdAt: detailGroup.createdAt ?? '',
    updatedAt: detailGroup.updatedAt ?? '',
  };
}

export function formatGroupDate(value: string): string {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
