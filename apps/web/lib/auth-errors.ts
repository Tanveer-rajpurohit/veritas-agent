/** Maps auth API errors to calm, specific copy. Never reveals whether an email is registered. */
export function authErrorMessage(error: { status?: number; code?: string; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Email or password is incorrect.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "We couldn't create an account with those details. If you already have one, sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters for your password.";
    case "PASSWORD_TOO_LONG":
      return "Use 128 characters or fewer for your password.";
    case "INVALID_EMAIL":
      return "Enter a valid email address, like name@company.com.";
    case "INVALID_TOKEN":
      return "This link has expired or was already used. Request a new one.";
    default:
      return "Something went wrong on our side. Please try again.";
  }
}
