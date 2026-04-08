const REFRESH_TOKEN_KEY = "mms.refresh_token";

let accessToken: string | null = null;

export function setTokens(
  nextAccessToken: string | null,
  nextRefreshToken?: string | null,
): void {
  accessToken = nextAccessToken;

  if (nextRefreshToken === undefined) {
    return;
  }

  if (nextRefreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  accessToken = null;
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
