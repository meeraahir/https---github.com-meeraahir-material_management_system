import axios, { AxiosHeaders } from "axios";
import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { jwtDecode } from "jwt-decode";

import type {
  DecodedAccessToken,
  RefreshTokenResponse,
} from "../types/auth.types";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../utils/tokenStorage";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const REFRESH_ENDPOINT = "/accounts/token/refresh/";

interface AuthCallbacks {
  onAuthFailure?: () => void;
  onAccessTokenUpdate?: (accessToken: string | null) => void;
}

type RequestConfigWithAuth = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

type RequestOptionsWithAuth = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const rawClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;
let authCallbacks: AuthCallbacks = {};

function isAccessTokenExpired(token: string): boolean {
  try {
    const decodedToken = jwtDecode<DecodedAccessToken>(token);

    if (!decodedToken.exp) {
      return false;
    }

    const currentUnixTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp <= currentUnixTime + 15;
  } catch {
    return true;
  }
}

function shouldSkipRefresh(config: RequestConfigWithAuth): boolean {
  const requestUrl = config.url ?? "";

  return (
    config.skipAuthRefresh === true ||
    requestUrl.includes("/accounts/login/") ||
    requestUrl.includes("/accounts/register/") ||
    requestUrl.includes(REFRESH_ENDPOINT) ||
    requestUrl.includes("/core/token/") ||
    requestUrl.includes("/core/token/refresh/")
  );
}

export function registerAuthCallbacks(callbacks: AuthCallbacks): void {
  authCallbacks = callbacks;
}

export async function requestAccessTokenRefresh(): Promise<string | null> {
  const storedRefreshToken = getRefreshToken();

  if (!storedRefreshToken) {
    clearTokens();
    authCallbacks.onAccessTokenUpdate?.(null);
    authCallbacks.onAuthFailure?.();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = rawClient
      .post<RefreshTokenResponse>(
        REFRESH_ENDPOINT,
        { refresh: storedRefreshToken },
        { skipAuthRefresh: true } as RequestOptionsWithAuth,
      )
      .then((response: AxiosResponse<RefreshTokenResponse>) => {
        setTokens(response.data.access, storedRefreshToken);
        authCallbacks.onAccessTokenUpdate?.(response.data.access);
        return response.data.access;
      })
      .catch(() => {
        clearTokens();
        authCallbacks.onAccessTokenUpdate?.(null);
        authCallbacks.onAuthFailure?.();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use(
  async (config) => {
    let accessToken = getAccessToken();

    if (accessToken && isAccessTokenExpired(accessToken)) {
      accessToken = await requestAccessTokenRefresh();
    }

    if (accessToken) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      config.headers = headers;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.response || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RequestConfigWithAuth;

    if (
      error.response.status !== 401 ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshedAccessToken = await requestAccessTokenRefresh();

    if (!refreshedAccessToken) {
      return Promise.reject(error);
    }

    const headers = AxiosHeaders.from(originalRequest.headers);
    headers.set("Authorization", `Bearer ${refreshedAccessToken}`);
    originalRequest.headers = headers;

    return apiClient(originalRequest);
  },
);

export { apiClient };
