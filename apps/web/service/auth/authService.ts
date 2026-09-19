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
    });
  },

  login(payload: LoginRequest): Promise<void> {
    return fetchClient.post<void>("/auth/login", {
      email: payload.email,
      password: payload.password,
    });
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

  logout(): Promise<void> {
    return fetchClient.post<void>("/auth/logout");
  },
};
