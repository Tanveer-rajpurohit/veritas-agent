import hashlib
import os
import tempfile
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


class StorageService:
    """Local filesystem storage manager for raw source documents scoped by matter."""

    def __init__(self, base_path: str | Path | None = None) -> None:
        self.base_path = Path(base_path or settings.SOURCE_STORAGE_PATH).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        """Computes the cryptographic SHA-256 hex digest for document verification."""
        return hashlib.sha256(content).hexdigest()

    def get_destination_dir(
        self,
        matter_id: uuid.UUID | str | None,
        source_id: uuid.UUID | str,
    ) -> Path:
        """Returns the matter-scoped directory on disk for a source document."""
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
        """Atomically saves content to disk and returns (object_key, file_sha256)."""
        file_sha256 = self.compute_sha256(content)
        dest_dir = self.get_destination_dir(matter_id, source_id)

        safe_filename = Path(filename).name
        target_path = dest_dir / f"v{version_number}_{safe_filename}"

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

        object_key = str(target_path.relative_to(self.base_path)).replace("\\", "/")
        return object_key, file_sha256

    def read_file(self, object_key: str) -> bytes:
        """Reads raw bytes for a stored object key."""
        file_path = (self.base_path / object_key).resolve()
        if not file_path.is_relative_to(self.base_path):
            raise ValueError("Object key resolves outside source storage")
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"Source file not found at object_key: {object_key}")
        return file_path.read_bytes()

    def delete_file(self, object_key: str) -> None:
        """Remove a stored object created by an ingestion attempt."""
        file_path = (self.base_path / object_key).resolve()
        if not file_path.is_relative_to(self.base_path):
            raise ValueError("Object key resolves outside source storage")
        file_path.unlink(missing_ok=True)

    def get_absolute_path(self, object_key: str) -> Path:
        """Resolves the absolute path for an object key."""
        file_path = (self.base_path / object_key).resolve()
        if not file_path.is_relative_to(self.base_path):
            raise ValueError("Object key resolves outside source storage")
        if not file_path.exists():
            raise FileNotFoundError(f"Source file not found at object_key: {object_key}")
        return file_path


class S3StorageService(StorageService):
    def __init__(self, client=None) -> None:
        if not settings.MINIO_SECRET_KEY:
            raise ValueError("MINIO_SECRET_KEY is required for S3 source storage")
        self.client = client or boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name="us-east-1",
        )
        self.bucket = settings.MINIO_BUCKET
        self._bucket_ready = False

    def _ensure_bucket(self) -> None:
        if self._bucket_ready:
            return
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") not in {"404", "NoSuchBucket"}:
                raise
            self.client.create_bucket(Bucket=self.bucket)
        self._bucket_ready = True

    def save_file(
        self,
        content: bytes,
        filename: str,
        source_id: uuid.UUID | str,
        version_number: int,
        matter_id: uuid.UUID | str | None = None,
    ) -> tuple[str, str]:
        self._ensure_bucket()
        matter_segment = str(matter_id) if matter_id else "global"
        object_key = f"{matter_segment}/{source_id}/v{version_number}/{uuid.uuid4()}"
        self.client.put_object(Bucket=self.bucket, Key=object_key, Body=content)
        return object_key, self.compute_sha256(content)

    def read_file(self, object_key: str) -> bytes:
        self._validate_key(object_key)
        return self.client.get_object(Bucket=self.bucket, Key=object_key)["Body"].read()

    def delete_file(self, object_key: str) -> None:
        self._validate_key(object_key)
        self.client.delete_object(Bucket=self.bucket, Key=object_key)

    @staticmethod
    def _validate_key(object_key: str) -> None:
        parts = object_key.split("/")
        if len(parts) != 4 or not parts[2].startswith("v") or not parts[2][1:].isdigit():
            raise ValueError("Invalid source object key")
        try:
            if parts[0] != "global":
                uuid.UUID(parts[0])
            uuid.UUID(parts[1])
            uuid.UUID(parts[3])
        except ValueError:
            raise ValueError("Invalid source object key") from None


if settings.SOURCE_STORAGE_BACKEND == "s3":
    storage_service = S3StorageService()
elif settings.SOURCE_STORAGE_BACKEND == "local":
    storage_service = StorageService()
else:
    raise ValueError("SOURCE_STORAGE_BACKEND must be 'local' or 's3'")
