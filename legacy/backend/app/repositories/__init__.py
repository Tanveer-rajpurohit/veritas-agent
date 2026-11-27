"""Database access repositories grouped by domain."""

from app.repositories.drafts import DraftRepository, draft_repository
from app.repositories.matters import MatterRepository
from app.repositories.sources import SourceRepository, source_repository

__all__ = [
    "DraftRepository",
    "MatterRepository",
    "SourceRepository",
    "draft_repository",
    "source_repository",
]
