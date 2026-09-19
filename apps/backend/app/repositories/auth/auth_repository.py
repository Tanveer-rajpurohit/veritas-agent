from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.auth import ActionToken, User, UserSession


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user_by_id(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_user_by_email(self, normalized_email: str) -> User | None:
        stmt = select(User).where(User.email == normalized_email)
        return self.db.scalar(stmt)

    def create_user(
        self,
        email: str,
        password_hash: str | None,
        display_name: str | None = None,
        full_name: str | None = None,
        is_active: bool = True,
    ) -> User:
        user = User(
            email=email,
            password_hash=password_hash,
            display_name=display_name,
            full_name=full_name or display_name,
            is_active=is_active,
        )
        self.db.add(user)
        return user

    def update_user_password(self, user: User, password_hash: str) -> None:
        user.password_hash = password_hash
        user.updated_at = datetime.now(UTC)
        self.db.add(user)

    def mark_email_verified(self, user: User) -> None:
        user.email_verified_at = datetime.now(UTC)
        user.updated_at = datetime.now(UTC)
        self.db.add(user)

    def create_session(
        self,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
        ip_hash: str | None = None,
        user_agent_hash: str | None = None,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_hash=ip_hash,
            user_agent_hash=user_agent_hash,
        )
        self.db.add(session)
        return session

    def get_active_session_by_token_hash(self, token_hash: str) -> tuple[UserSession, User] | None:
        now = datetime.now(UTC)
        stmt = (
            select(UserSession, User)
            .join(User, UserSession.user_id == User.id)
            .where(
                UserSession.token_hash == token_hash,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
                User.is_active.is_(True),
            )
        )
        row = self.db.execute(stmt).first()
        if row is None:
            return None
        return row[0], row[1]

    def list_active_sessions_for_user(self, user_id: UUID) -> list[UserSession]:
        now = datetime.now(UTC)
        stmt = (
            select(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
            .order_by(UserSession.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def get_session_for_user(self, session_id: UUID, user_id: UUID) -> UserSession | None:
        stmt = select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
        )
        return self.db.scalar(stmt)

    def revoke_session(self, session: UserSession) -> None:
        session.revoked_at = datetime.now(UTC)
        self.db.add(session)

    def revoke_all_sessions_for_user(self, user_id: UUID) -> int:
        now = datetime.now(UTC)
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        result = self.db.execute(stmt)
        return int(result.rowcount or 0)

    def create_action_token(
        self,
        user_id: UUID,
        purpose: str,
        token_hash: str,
        expires_at: datetime,
    ) -> ActionToken:
        token = ActionToken(
            user_id=user_id,
            purpose=purpose,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        return token

    def revoke_action_tokens_for_user(self, user_id: UUID, purpose: str) -> None:
        now = datetime.now(UTC)
        stmt = (
            update(ActionToken)
            .where(
                ActionToken.user_id == user_id,
                ActionToken.purpose == purpose,
                ActionToken.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )
        self.db.execute(stmt)

    def get_valid_action_token_for_update(
        self, token_hash: str, purpose: str
    ) -> ActionToken | None:
        now = datetime.now(UTC)
        stmt = (
            select(ActionToken)
            .where(
                ActionToken.token_hash == token_hash,
                ActionToken.purpose == purpose,
                ActionToken.consumed_at.is_(None),
                ActionToken.expires_at > now,
            )
            .with_for_update()
        )
        return self.db.scalar(stmt)

    def consume_action_token(self, token: ActionToken) -> None:
        token.consumed_at = datetime.now(UTC)
        self.db.add(token)
