import type { ApiFieldError } from '@/types/api.type';

export class AppError extends Error {
  constructor(
    message: string,
    public status?: number,
    public errors?: ApiFieldError[] | null
  ) {
    super(message);
    this.name = 'AppError';
  }
}