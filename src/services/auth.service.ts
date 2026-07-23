import { api } from '@/lib/api-client';
import { clearAuthState } from '@/lib/auth';
import { AppError } from '@/errors/app-error';
import type { ApiResponse } from '@/types/api.type';
import { isPermissionKey, type PermissionKey } from '@/constants/permission.constant';
import { handleServiceError } from './service-error.helper';
import type {
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  ResendOtpPayload,
  RegisterPayload,
  SetPasswordPayload,
  VerifyOtpPayload,
} from '@/types/auth.type';

function isSuccessfulStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function clearClientSession(): void {
  clearAuthState();
  window.dispatchEvent(new Event('auth:changed'));
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return loginWithPayload({ username, password });
}

async function loginWithPayload(payload: LoginPayload): Promise<AuthUser> {
  try {
    const response = await api.post<ApiResponse<AuthUser>>(
      '/auth/login',
      {
        username: payload.username,
        password: payload.password,
      },
      { skipAuth: true }
    );

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
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

export async function register(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string
): Promise<boolean> {
  return registerWithPayload({ fullName, email, password, confirmPassword });
}

async function registerWithPayload(payload: RegisterPayload): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<boolean>>(
      '/auth/register',
      payload,
      { skipAuth: true }
    );

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data ?? true;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function verifyOtp(input: VerifyOtpPayload): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<boolean>>(
      '/auth/verify-otp',
      input,
      { skipAuth: true }
    );

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data ?? true;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function resendOtp(input: ResendOtpPayload): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<boolean>>(
      '/auth/resend-otp',
      input,
      { skipAuth: true }
    );

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data ?? true;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getCurrentUserPermissions(): Promise<PermissionKey[]> {
  try {
    const response = await api.get<ApiResponse<string[]>>('/auth/permissions');

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return (response.data.data ?? []).filter(isPermissionKey);
  } catch (error) {
    handleServiceError(error);
  }
}

export async function changePassword(input: ChangePasswordPayload): Promise<null> {
  try {
    const response = await api.post<ApiResponse<null>>('/auth/change-password', input);

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function requestPasswordReset(input: ForgotPasswordPayload): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<boolean>>(
      '/auth/forgot-password',
      input,
      { skipAuth: true }
    );

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data ?? true;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function setPassword(input: SetPasswordPayload): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<boolean>>(
      '/auth/set-password',
      input,
      { skipAuth: true }
    );

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    // INVITE và RESET đều yêu cầu đăng nhập lại bằng mật khẩu mới.
    clearClientSession();

    return response.data.data ?? true;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function logout(): Promise<void> {
  try {
    const response = await api.post<ApiResponse<null>>('/auth/logout');

    if (!isSuccessfulStatus(response.status) || !response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } finally {
    clearClientSession();
  }
}
