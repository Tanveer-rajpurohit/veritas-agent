import { fetchClient } from "../fetch";
import type {
  ForgotPasswordPayload,
  LoginRequest,
  RegisterRequest,
  ResetPasswordPayload,
  UpdateProfilePayload,
  UserProfile,
  VerifyEmailPayload,
} from "../../types/auth/types";

export const authService = {
  register(payload: RegisterRequest): Promise<UserProfile> {
    return fetchClient.post<UserProfile>("/auth/register", {
      email: payload.email,
      password: payload.password,
      display_name: payload.name,
      full_name: payload.name,
    });
  },

  async login(payload: LoginRequest): Promise<void> {
    const tokens = await fetchClient.post<{ access_token: string; refresh_token: string }>("/auth/login", {
      email: payload.email,
      password: payload.password,
    });
    try {
      localStorage.setItem("veritas_access_token", tokens.access_token);
      localStorage.setItem("veritas_refresh_token", tokens.refresh_token);
    } catch {
      void 0;
    }
  },

  getMe(): Promise<UserProfile> {
    return fetchClient.get<UserProfile>("/auth/me");
  },

  updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    return fetchClient.patch<UserProfile>("/auth/me", payload);
  },

  forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return fetchClient.post<{ message: string }>(
      "/auth/password/forgot",
      payload,
    );
  },

  verifyEmail(payload: VerifyEmailPayload): Promise<void> {
    return fetchClient.post<void>("/auth/email/verify", payload);
  },

  resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return fetchClient.post<{ message: string }>(
      "/auth/password/reset",
      payload,
    );
  },

  async logout(): Promise<void> {
    try {
      await fetchClient.post<void>("/auth/logout");
    } catch {
      void 0;
    } finally {
      try {
        localStorage.removeItem("veritas_access_token");
        localStorage.removeItem("veritas_refresh_token");
      } catch {
        void 0;
      }
    }
  },
};
