import { apiClient, requestAccessTokenRefresh } from "../api/client";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import type {
  ForgotPasswordRequest,
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from "../types/auth.types";
import { clearTokens, setTokens } from "../utils/tokenStorage";

const AUTH_ENDPOINTS = {
  forgotPassword: "/accounts/forgot-password/",
  login: "/accounts/login/",
  register: "/accounts/register/",
  profile: "/accounts/profile/",
} as const;

type RequestOptionsWithAuth = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
};

async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>(AUTH_ENDPOINTS.profile);
  return response.data;
}

async function login(email: string, password: string): Promise<AuthSession> {
  const payload: LoginRequest = {
    username: email.trim(),
    password,
  };

  const response = await apiClient.post<AuthTokens, AxiosResponse<AuthTokens>>(
    AUTH_ENDPOINTS.login,
    payload,
    { skipAuthRefresh: true } as RequestOptionsWithAuth,
  );

  setTokens(response.data.access, response.data.refresh);
  const user = await getCurrentUser();

  return {
    access: response.data.access,
    refresh: response.data.refresh,
    user,
  };
}

async function register(
  username: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const payload: RegisterRequest = {
    username: username.trim(),
    email: email.trim(),
    first_name: "",
    last_name: "",
    password,
    password2: password,
  };

  const response = await apiClient.post<
    RegisterResponse,
    AxiosResponse<RegisterResponse>
  >(
    AUTH_ENDPOINTS.register,
    payload,
    { skipAuthRefresh: true } as RequestOptionsWithAuth,
  );

  return response.data;
}

async function refreshToken(): Promise<string | null> {
  return requestAccessTokenRefresh();
}

async function forgotPassword(
  email: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  const payload: ForgotPasswordRequest = {
    confirm_password: confirmPassword,
    email: email.trim(),
    new_password: newPassword,
  };

  await apiClient.post(
    AUTH_ENDPOINTS.forgotPassword,
    payload,
    { skipAuthRefresh: true } as RequestOptionsWithAuth,
  );
}

function logout(): void {
  clearTokens();
}

export const authService = {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  refreshToken,
  register,
};
