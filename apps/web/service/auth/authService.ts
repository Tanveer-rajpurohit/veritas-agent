import { fetchClient } from "../fetch";
import { cookieStorage } from "../cookie";
import type {
  ForgotPasswordPayload,
  LoginRequest,
  RegisterRequest,
  ResetPasswordPayload,
  UpdateProfilePayload,
  UserProfile,
} from "../../types/auth/types";
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

  getMe(): Promise<UserProfile> {
    return fetchClient.get<UserProfile>("/auth/me");
  },

  updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    return fetchClient.patch<UserProfile>("/auth/me", payload);
  },

  forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return fetchClient.post<{ message: string }>("/auth/forgot-password", payload, {
      skipAuth: true,
    });
  },

  resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return fetchClient.post<{ message: string }>("/auth/reset-password", payload, {
      skipAuth: true,
    });
  },

  logout(): void {
    cookieStorage.removeAuthToken();
  },

  isAuthenticated(): boolean {
    return cookieStorage.hasAuthToken();
  },
};
