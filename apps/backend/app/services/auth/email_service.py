import logging

from app.core.config import settings
from app.core.email import send_email

logger = logging.getLogger(__name__)


async def send_verification(email: str, token: str) -> None:
    link = f"{settings.APP_BASE_URL}/verify-email?token={token}"

    if settings.EMAIL_PROVIDER == "console":
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("Console email provider must never be enabled in production")
        logger.warning("[DEVELOPMENT ONLY] Verification link: %s", link)
        return

    subject = "Verify your Veritas Legal account"
    html_body = f"""<!DOCTYPE html>
<html>
<body>
  <h2>Veritas Legal Verification</h2>
  <p>Please verify your email address by clicking the link below:</p>
  <p><a href="{link}">Verify Email</a></p>
  <p>This link expires in {settings.AUTH_TOKEN_TTL_SECONDS // 60} minutes.</p>
</body>
</html>"""
    await send_email(to=email, subject=subject, html_body=html_body)


async def send_password_reset(email: str, token: str) -> None:
    link = f"{settings.APP_BASE_URL}/reset-password?token={token}"

    if settings.EMAIL_PROVIDER == "console":
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("Console email provider must never be enabled in production")
        logger.warning("[DEVELOPMENT ONLY] Password reset link: %s", link)
        return

    subject = "Reset your Veritas Legal password"
    html_body = f"""<!DOCTYPE html>
<html>
<body>
  <h2>Veritas Legal Password Reset</h2>
  <p>You requested a password reset. Click the link below to set a new password:</p>
  <p><a href="{link}">Reset Password</a></p>
  <p>This link expires in {settings.AUTH_TOKEN_TTL_SECONDS // 60} minutes.</p>
</body>
</html>"""
    await send_email(to=email, subject=subject, html_body=html_body)
