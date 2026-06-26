import { api } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import type { ApiResponse } from '@/types/api.type';
import { handleServiceError } from './service-error.helper';
import type {
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
} from '@/types/auth.type';

export async function login(username: string, password: string): Promise<AuthUser> {
  return loginWithPayload({ username, password });
}

async function loginWithPayload(payload: LoginPayload): Promise<AuthUser> {
  try {
    const response = await api.post<ApiResponse<AuthUser>>('/auth/login', {
      username: payload.username,
      password: payload.password,
    });

    if (response.status !== 200 || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    const user = response.data.data!;

    if (user.accessToken) {
      localStorage.setItem('accessToken', user.accessToken);
      window.dispatchEvent(new Event('auth:changed'));
    }

    return user;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function register(fullName: string, email: string): Promise<boolean> {
  return registerWithPayload({ fullName, email });
}

async function registerWithPayload(payload: RegisterPayload): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<boolean>>(
      '/auth/register',
      payload,
      { skipAuth: true }
    );

    if (response.status !== 200 || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data ?? true;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getCurrentUserPermissions(): Promise<string[]> {
  try {
    const response = await api.get<ApiResponse<string[]>>('/auth/permissions');

    if (response.status !== 200 || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data ?? [];
  } catch (error) {
    handleServiceError(error);
  }
}

export async function changePassword(input: ChangePasswordPayload): Promise<null> {
  try {
    const response = await api.post<ApiResponse<null>>('/auth/change-password', input);

    if (response.status !== 200 || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function logout(): Promise<void> {
  try {
    const response = await api.post<ApiResponse<null>>('/auth/logout');

    if (response.status !== 200 || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authUser');
    window.dispatchEvent(new Event('auth:changed'));
  }
}
