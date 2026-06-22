const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4001/api/v1';

export type ApiMeta = {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T | null;
  meta?: ApiMeta | null;
  errors?: Array<{ field?: string; message: string }> | null;
};

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
};

type RefreshTokenResponse = {
  accessToken: string | null;
};

let refreshPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  status: number;
  errors: ApiEnvelope<unknown>['errors'];

  constructor(message: string, status: number, errors: ApiEnvelope<unknown>['errors'] = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function getApiErrorMessage(envelope: ApiEnvelope<unknown> | null): string {
  const detailMessages = envelope?.errors
    ?.map((error) => error.message)
    .filter(Boolean);

  if (detailMessages?.length) {
    return detailMessages.join(', ');
  }

  return envelope?.message ?? 'API request failed';
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        const envelope = (await response.json().catch(() => null)) as ApiEnvelope<RefreshTokenResponse> | null;

        if (!response.ok || !envelope?.success || !envelope.data?.accessToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('authUser');
          window.dispatchEvent(new Event('auth:changed'));
          return null;
        }

        localStorage.setItem('accessToken', envelope.data.accessToken);
        return envelope.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function fetchApi<T>(path: string, options: ApiRequestOptions): Promise<{
  envelope: ApiEnvelope<T> | null;
  response: Response;
  hadAuthToken: boolean;
}> {
  const { auth = true, skipRefresh: _skipRefresh, headers, ...fetchOptions } = options;
  const token = localStorage.getItem('accessToken');
  const hadAuthToken = Boolean(auth && token);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(hadAuthToken ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  return { envelope, response, hadAuthToken };
}

async function requestWithRefresh<T>(path: string, options: ApiRequestOptions): Promise<ApiEnvelope<T>> {
  const { envelope, response, hadAuthToken } = await fetchApi<T>(path, options);

  if (response.status === 401 && hadAuthToken && !options.skipRefresh) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      const retry = await fetchApi<T>(path, { ...options, skipRefresh: true });
      if (retry.response.ok && retry.envelope?.success) {
        return retry.envelope;
      }

      throw new ApiError(
        getApiErrorMessage(retry.envelope),
        retry.response.status,
        retry.envelope?.errors ?? null
      );
    }
  }

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      getApiErrorMessage(envelope),
      response.status,
      envelope?.errors ?? null
    );
  }

  return envelope;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const envelope = await requestWithRefresh<T>(path, options);

  return envelope.data as T;
}

export async function apiRequestWithMeta<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; meta: ApiMeta | null }> {
  const envelope = await requestWithRefresh<T>(path, options);

  return {
    data: envelope.data as T,
    meta: envelope.meta ?? null,
  };
}
