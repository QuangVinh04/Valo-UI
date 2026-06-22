import type { UserListItemDto } from '@/services/user.service';

export type UserTableItem = UserListItemDto & {
  initials: string;
  role: string;
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatUserDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function toUserTableItem(user: UserListItemDto): UserTableItem {
  return {
    ...user,
    initials: getInitials(user.fullName),
    role: user.groups.map((group) => group.name).join(', ') || 'No Group',
  };
}
