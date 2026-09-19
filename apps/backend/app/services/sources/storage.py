import hashlib
import uuid
from pathlib import Path

from app.services.storage import ObjectStore, object_store


class StorageService:
    """Matter-scoped source storage backed by S3-compatible object storage."""

    def __init__(self, store: ObjectStore | None = None) -> None:
        self.store = store or object_store

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def save_file(
        self,
        content: bytes,
        filename: str,
        source_id: uuid.UUID | str,
        version_number: int,
        matter_id: uuid.UUID | str | None = None,
    ) -> tuple[str, str]:
        matter_segment = str(matter_id) if matter_id else "global"
        suffix = Path(filename).suffix.lower()
        object_key = (
            f"sources/{matter_segment}/{source_id}/v{version_number}/{uuid.uuid4()}{suffix}"
        )
        self.store.put(object_key, content, self._content_type(suffix))
        return object_key, self.compute_sha256(content)

    def read_file(self, object_key: str) -> bytes:
        self._validate_key(object_key)
        return self.store.get(object_key)

    def delete_file(self, object_key: str) -> None:
        self._validate_key(object_key)
        self.store.delete(object_key)

    @staticmethod
    def _validate_key(object_key: str) -> None:
        parts = object_key.split("/")
        if (
            len(parts) != 5
            or parts[0] != "sources"
            or not parts[3].startswith("v")
            or not parts[3][1:].isdigit()
        ):
            raise ValueError("Invalid source object key")
        try:
            if parts[1] != "global":
                uuid.UUID(parts[1])
            uuid.UUID(parts[2])
            uuid.UUID(Path(parts[4]).stem)
        except ValueError:
            raise ValueError("Invalid source object key") from None

    @staticmethod
    def _content_type(suffix: str) -> str:
        return {
            ".pdf": "application/pdf",
            ".txt": "text/plain; charset=utf-8",
            ".md": "text/markdown; charset=utf-8",
        }.get(suffix, "application/octet-stream")


S3StorageService = StorageService
storage_service = StorageService()
