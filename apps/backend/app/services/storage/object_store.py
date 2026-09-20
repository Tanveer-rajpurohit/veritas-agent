from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class ObjectStore:
    """Private AWS S3 or MinIO object storage selected by configuration."""

    def __init__(self, client: Any | None = None) -> None:
        self.backend = settings.OBJECT_STORAGE_BACKEND
        self.bucket = settings.BUCKET_NAME
        if self.backend not in {"s3", "minio"}:
            raise ValueError("OBJECT_STORAGE_BACKEND must be 's3' or 'minio'")
        if not self.bucket:
            raise ValueError("BUCKET_NAME is required for object storage")
        self.client = client or self._build_client()
        self._bucket_ready = False

    def _build_client(self):
        if self.backend == "minio":
            if not settings.MINIO_ACCESS_KEY or not settings.MINIO_SECRET_KEY:
                raise ValueError("MinIO credentials are required for local object storage")
            return boto3.client(
                "s3",
                endpoint_url=settings.MINIO_ENDPOINT,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                region_name=settings.AWS_REGION,
                config=Config(s3={"addressing_style": "path"}),
            )

        options: dict[str, Any] = {"region_name": settings.AWS_REGION}
        if bool(settings.AWS_ACCESS_KEY_ID) != bool(settings.AWS_SECRET_ACCESS_KEY):
            raise ValueError("Both AWS access key fields are required when either is configured")
        if settings.AWS_ACCESS_KEY_ID:
            options.update(
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return boto3.client("s3", **options)

    def _ensure_bucket(self) -> None:
        if self._bucket_ready or self.backend == "s3":
            return
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") not in {"404", "NoSuchBucket"}:
                raise
            self.client.create_bucket(Bucket=self.bucket)
        self._bucket_ready = True

    def put(self, key: str, content: bytes, content_type: str) -> None:
        self._ensure_bucket()
        request = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": content,
            "ContentType": content_type,
        }
        if self.backend == "s3":
            request["ServerSideEncryption"] = "AES256"
        self.client.put_object(**request)

    def get(self, key: str) -> bytes:
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def presigned_url(
        self,
        key: str,
        *,
        expires_in: int = 300,
        content_type: str | None = None,
        disposition: str = "inline",
    ) -> str:
        self._ensure_bucket()
        params: dict[str, str] = {
            "Bucket": self.bucket,
            "Key": key,
            "ResponseContentDisposition": disposition,
        }
        if content_type:
            params["ResponseContentType"] = content_type
        return self.client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires_in,
        )


object_store = ObjectStore()
