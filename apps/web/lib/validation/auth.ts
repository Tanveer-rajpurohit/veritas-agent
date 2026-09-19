import type {
  AuthFieldErrors,
  LoginRequest,
  PasswordResetRequest,
  RegisterRequest,
} from "../../types/auth/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email.length === 0) return "Enter your email address";
  if (email.length > MAX_EMAIL_LENGTH) return "Enter a shorter email address";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address";
  return null;
}

export function validateLoginPassword(value: string): string | null {
  if (value.length === 0) return "Enter your password";
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (value.length < 12) return "Password must be at least 12 characters";
  if (value.length > 256) return "Password must be 256 characters or fewer";
  if (!/[a-z]/.test(value)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter";
  if (!/\d/.test(value)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include a special character";
  return null;
}

export function validateLoginForm(values: LoginRequest): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  const passwordError = validateLoginPassword(values.password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function validateRegisterForm(
  values: RegisterRequest & { confirmPassword?: string },
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (values.name.trim().length === 0) errors.name = "Enter your full name";
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  const passwordError = validateNewPassword(values.password);
  if (passwordError) errors.password = passwordError;
  if (
    values.confirmPassword !== undefined &&
    values.confirmPassword !== values.password
  ) {
    errors.confirmPassword = "Passwords do not match";
  }
  return errors;
}

export function validatePasswordResetForm(
  values: PasswordResetRequest,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  return errors;
}

export function safeInternalPath(value: string | null): string {
  if (!value) return "/";
  let url: URL;
  try {
    url = new URL(value, "http://localhost");
  } catch {
    return "/";
  }
  if (url.origin !== "http://localhost") return "/";
  if (!url.pathname.startsWith("/")) return "/";
  if (url.pathname.startsWith("//")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
