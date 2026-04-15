export type UserRole = "admin" | "manager" | "staff" | "viewer";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password2: string;
}

export interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
  new_password: string;
  confirm_password: string;
}

export interface ForgotPasswordFormValues {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RegisterResponse extends AuthTokens {
  user: AuthUser;
}

export interface RefreshTokenResponse {
  access: string;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}

export interface DecodedAccessToken {
  exp?: number;
  iat?: number;
  jti?: string;
  token_type?: string;
  user_id?: number;
}

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  forgotPassword?: (email: string, newPassword: string, confirmPassword: string) => Promise<void>;
  refresh: () => Promise<string | null>;
  loadUser: () => Promise<AuthUser | null>;
}
