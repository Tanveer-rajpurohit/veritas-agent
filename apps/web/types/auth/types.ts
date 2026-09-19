export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  email_verified: boolean;
  full_name: string | null;
  phone_number: string | null;
  law_firm: string | null;
  bar_council_number: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  full_name?: string | null;
  phone_number?: string | null;
  law_firm?: string | null;
  bar_council_number?: string | null;
  avatar_url?: string | null;
  city?: string | null;
}

export type AuthFieldErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;
