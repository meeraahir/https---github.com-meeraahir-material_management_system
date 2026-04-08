import {
  createContext,
  startTransition,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

import { registerAuthCallbacks } from "../api/client";
import { authService } from "../services/authService";
import type { AuthContextValue, AuthUser } from "../types/auth.types";
import { clearTokens, getRefreshToken } from "../utils/tokenStorage";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    registerAuthCallbacks({
      onAccessTokenUpdate: (nextAccessToken) => {
        startTransition(() => {
          setAccessToken(nextAccessToken);
        });
      },
      onAuthFailure: () => {
        clearTokens();
        startTransition(() => {
          setAccessToken(null);
          setUser(null);
        });
      },
    });

    return () => {
      registerAuthCallbacks({});
    };
  }, []);

  useEffect(() => {
    async function initializeAuth() {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const nextAccessToken = await authService.refreshToken();

        if (!nextAccessToken) {
          setIsInitializing(false);
          return;
        }

        setAccessToken(nextAccessToken);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        authService.logout();
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    }

    void initializeAuth();
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    const session = await authService.login(email, password);

    startTransition(() => {
      setAccessToken(session.access);
      setUser(session.user);
    });

    return session.user;
  }

  function logout(): void {
    authService.logout();

    startTransition(() => {
      setAccessToken(null);
      setUser(null);
    });
  }

  async function register(
    username: string,
    email: string,
    password: string,
  ): Promise<void> {
    await authService.register(username, email, password);
  }

  async function refresh(): Promise<string | null> {
    const nextAccessToken = await authService.refreshToken();

    startTransition(() => {
      setAccessToken(nextAccessToken);
    });

    if (!nextAccessToken) {
      startTransition(() => {
        setUser(null);
      });
    }

    return nextAccessToken;
  }

  async function loadUser(): Promise<AuthUser | null> {
    try {
      const currentUser = await authService.getCurrentUser();
      startTransition(() => {
        setUser(currentUser);
      });
      return currentUser;
    } catch {
      return null;
    }
  }

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isInitializing,
    login,
    logout,
    register,
    refresh,
    loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
