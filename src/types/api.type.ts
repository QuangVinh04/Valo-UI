export type ApiMeta = {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
};

export type ApiFieldError = {
  field?: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  meta?: ApiMeta | null;
  errors?: ApiFieldError[] | null;
};