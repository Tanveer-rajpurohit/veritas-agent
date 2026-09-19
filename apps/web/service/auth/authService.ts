import { fetchClient } from "../fetch";
import { cookieStorage } from "../cookie";
import type { LoginRequest, RegisterRequest } from "../../types/auth/types";
import type { AuthTokens } from "../../types/api/type";

interface BackendAuthResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  async register(payload: RegisterRequest): Promise<AuthTokens> {
    const res = await fetchClient.post<BackendAuthResponse>(
      "/auth/register",
      {
        email: payload.email,
        password: payload.password,
      },
      { skipAuth: true }
    );
    const tokens: AuthTokens = {
      accessToken: res.access_token,
      tokenType: res.token_type,
    };
    cookieStorage.setAuthToken(tokens.accessToken);
    return tokens;
  },

  async login(payload: LoginRequest): Promise<AuthTokens> {
    const res = await fetchClient.post<BackendAuthResponse>(
      "/auth/login",
      {
        email: payload.email,
        password: payload.password,
      },
      { skipAuth: true }
    );
    const tokens: AuthTokens = {
      accessToken: res.access_token,
      tokenType: res.token_type,
    };
    cookieStorage.setAuthToken(tokens.accessToken);
    return tokens;
  },

  logout(): void {
    cookieStorage.removeAuthToken();
  },

  isAuthenticated(): boolean {
    return cookieStorage.hasAuthToken();
  },
};
