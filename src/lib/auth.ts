export type StoredAuthUser = {
  fullName: string;
  email: string;
};

export function getAuthUser(): StoredAuthUser | null {
  const storedUser = localStorage.getItem('authUser');
  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser) as Partial<StoredAuthUser>;
    if (typeof user.fullName !== 'string' || typeof user.email !== 'string') {
      return null;
    }

    return {
      fullName: user.fullName,
      email: user.email,
    };
  } catch {
    return null;
  }
}

export function storeAuthUser(user: StoredAuthUser): void {
  localStorage.setItem('authUser', JSON.stringify(user));
}

export function clearAuthState(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authUser');
}
