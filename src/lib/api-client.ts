import Axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4001/api/v1';

const ACCESS_TOKEN_KEY = 'accessToken';
const DEFAULT_LANGUAGE = 'vi';

type RetryRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuth?: boolean;
};

type AuthFetchInit = RequestInit & {
  skipAuth?: boolean;
  _retry?: boolean;
};

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    _retry?: boolean;
  }
}

export const api = Axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem('authUser');

  delete api.defaults.headers.common.Authorization;

  window.dispatchEvent(new Event('auth:changed'));
}

function applyAuthFetchHeaders(init: AuthFetchInit = {}, accessToken?: string): Headers {
  const headers = new Headers(init.headers);

  headers.set('Accept-Language', getRequestLanguage() || DEFAULT_LANGUAGE);

  if (!init.skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  } else {
    headers.delete('Authorization');
  }

  return headers;
}

function getRequestLanguage() {
  const language = localStorage.getItem('language');

  return language === 'en' ? 'en-US' : 'vi-VN';
}

function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false;

  const publicAuthPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/verify-otp',
    '/auth/resend-otp',
    '/auth/forgot-password',
    '/auth/set-password',
  ];

  return publicAuthPaths.some((path) => url.endsWith(path));
}

async function refreshAccessToken(): Promise<string> {
  const response = await Axios.post(
    `${API_BASE_URL}/auth/refresh-token`,
    undefined,
    {
      withCredentials: true,
      headers: {
        'Accept-Language': getRequestLanguage(),
      },
    }
  );

  const accessToken = response.data?.data?.accessToken;

  if (!accessToken) {
    throw new Error('Cannot refresh access token');
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

  return accessToken;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: AuthFetchInit = {}
): Promise<Response> {
  const { skipAuth, _retry, ...fetchInit } = init;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
  const requestInit: RequestInit = {
    ...fetchInit,
    credentials: init.credentials ?? 'include',
    headers: applyAuthFetchHeaders(init, token),
  };

  const response = await fetch(input, requestInit);

  if (
    response.status !== 401
    || _retry
    || skipAuth
    || isPublicAuthRequest(typeof input === 'string' ? input : input.toString())
  ) {
    return response;
  }

  try {
    const accessToken = await refreshAccessToken();

    return fetch(input, {
      ...fetchInit,
      credentials: init.credentials ?? 'include',
      headers: applyAuthFetchHeaders({ ...init, _retry: true }, accessToken),
    });
  } catch (refreshError) {
    clearAuth();
    throw refreshError;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const request = config as RetryRequestConfig;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  request.headers['Accept-Language'] = getRequestLanguage() || DEFAULT_LANGUAGE;

  if (request.data instanceof FormData) {
    delete request.headers['Content-Type'];
  }

  if (!request.skipAuth && token) {
    request.headers.Authorization = `Bearer ${token}`;
  } else {
    delete request.headers.Authorization;
  }

  return request;
});

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuth &&
      !isPublicAuthRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
