from io import BytesIO
from uuid import uuid4

import pytest
from botocore.exceptions import ClientError

from app.core.config import settings
from app.services.exports.draft import S3ExportStorage
from app.services.sources.storage import S3StorageService, StorageService


class FakeS3:
    def __init__(self) -> None:
        self.buckets = set()
        self.objects = {}

    def head_bucket(self, Bucket: str) -> None:
        if Bucket not in self.buckets:
            raise ClientError({"Error": {"Code": "404"}}, "HeadBucket")

    def create_bucket(self, Bucket: str) -> None:
        self.buckets.add(Bucket)

    def put_object(self, Bucket: str, Key: str, Body: bytes) -> None:
        self.objects[(Bucket, Key)] = Body

    def get_object(self, Bucket: str, Key: str) -> dict:
        return {"Body": BytesIO(self.objects[(Bucket, Key)])}

    def delete_object(self, Bucket: str, Key: str) -> None:
        del self.objects[(Bucket, Key)]


def test_minio_stores_sources_and_exports_without_public_urls(monkeypatch) -> None:
    monkeypatch.setattr(settings, "MINIO_SECRET_KEY", "local-test-secret")
    client = FakeS3()
    source_store = S3StorageService(client=client)
    matter_id = uuid4()
    source_id = uuid4()
    key, digest = source_store.save_file(b"record", "record.txt", source_id, 1, matter_id)
    assert key.startswith(f"{matter_id}/{source_id}/v1/")
    assert source_store.read_file(key) == b"record"
    assert len(digest) == 64

    export_store = S3ExportStorage(client=client)
    export_key = export_store.save(uuid4(), "json", b"{}")
    assert export_store.read(export_key) == b"{}"
    assert source_store.bucket != export_store.bucket
    export_store.delete(export_key)
    source_store.delete_file(key)
    assert not client.objects
    with pytest.raises(ValueError):
        source_store.read_file("../outside")
    with pytest.raises(ValueError):
        export_store.read("../outside.json")


def test_local_storage_rejects_parent_paths(tmp_path) -> None:
    store = StorageService(tmp_path)
    with pytest.raises(ValueError):
        store.read_file("../outside")
