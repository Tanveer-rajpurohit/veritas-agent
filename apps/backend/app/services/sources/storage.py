import hashlib
import os
import tempfile
import uuid
from pathlib import Path

from app.core.config import settings


class StorageService:
    """
    Local filesystem storage service for raw source files (PDFs, docs).
    Organized by: <base_path>/<matter_id>/<source_id>/v<version_number>_<filename>
    Provides deterministic SHA-256 hashing and atomic writes.
    """

    def __init__(self, base_path: str | Path | None = None) -> None:
        self.base_path = Path(base_path or settings.SOURCE_STORAGE_PATH).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        """
        Calculates cryptographic SHA-256 hex digest for document deduplication and verification.
        """
        return hashlib.sha256(content).hexdigest()

    def get_destination_dir(
        self,
        matter_id: uuid.UUID | str | None,
        source_id: uuid.UUID | str,
    ) -> Path:
        """
        Builds the target directory for a source document, scoped to its matter.
        Global legal sources without a matter_id are stored under 'global/'.
        """
        matter_segment = str(matter_id) if matter_id else "global"
        dest_dir = self.base_path / matter_segment / str(source_id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        return dest_dir

    def save_file(
        self,
        content: bytes,
        filename: str,
        source_id: uuid.UUID | str,
        version_number: int,
        matter_id: uuid.UUID | str | None = None,
    ) -> tuple[str, str]:
        """
        Atomically saves a raw source file to disk.
        Returns:
            tuple of (object_key, file_sha256)
        """
        file_sha256 = self.compute_sha256(content)
        dest_dir = self.get_destination_dir(matter_id, source_id)

        # Sanitize filename extension
        safe_filename = Path(filename).name
        target_file_name = f"v{version_number}_{safe_filename}"
        target_path = dest_dir / target_file_name

        # Atomic write: write to temp file on same filesystem first, then replace
        temp_fd, temp_path_str = tempfile.mkstemp(dir=dest_dir, prefix=".upload_tmp_")
        temp_path = Path(temp_path_str)
        try:
            with os.fdopen(temp_fd, "wb") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())
            temp_path.replace(target_path)
        except Exception:
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            raise

        # Return relative object_key for portable storage abstraction
        object_key = str(target_path.relative_to(self.base_path)).replace("\\", "/")
        return object_key, file_sha256

    def read_file(self, object_key: str) -> bytes:
        """
        Reads raw file bytes given a stored object_key.
        """
        file_path = (self.base_path / object_key).resolve()
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"Source file not found at object_key: {object_key}")
        return file_path.read_bytes()

    def get_absolute_path(self, object_key: str) -> Path:
        """
        Returns the resolved absolute Path for local extraction tools (like PyMuPDF).
        """
        file_path = (self.base_path / object_key).resolve()
        if not file_path.exists():
            raise FileNotFoundError(f"Source file not found at object_key: {object_key}")
        return file_path


storage_service = StorageService()
