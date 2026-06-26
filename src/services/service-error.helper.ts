import { AxiosError } from 'axios';
import { AppError } from '@/errors/app-error';

export function getApiErrorMessage(error: AxiosError<any>): string {
  const data = error.response?.data;

  return (
    data?.errors?.map((e: any) => e.message).filter(Boolean).join(', ') ||
    data?.message ||
    error.message ||
    'Có lỗi xảy ra'
  );
}

export function handleServiceError(error: unknown): never {
  if (error instanceof AxiosError) {
    throw new AppError(
      getApiErrorMessage(error),
      error.response?.status,
      error.response?.data?.errors
    );
  }

  throw error;
}
