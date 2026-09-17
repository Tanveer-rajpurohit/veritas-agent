export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export type AuthFieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;
