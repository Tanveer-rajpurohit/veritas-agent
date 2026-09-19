const AUTH_TOKEN_COOKIE = "veritas_access_token";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match && match[3] ? decodeURIComponent(match[3]) : null;
}

export function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === "undefined") {
    return;
  }
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

export function removeCookie(name: string): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

export const cookieStorage = {
  getAuthToken(): string | null {
    return getCookie(AUTH_TOKEN_COOKIE);
  },
  setAuthToken(token: string): void {
    setCookie(AUTH_TOKEN_COOKIE, token, 7);
  },
  removeAuthToken(): void {
    removeCookie(AUTH_TOKEN_COOKIE);
  },
  hasAuthToken(): boolean {
    return Boolean(this.getAuthToken());
  },
};
