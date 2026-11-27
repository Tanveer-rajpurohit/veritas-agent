from io import BytesIO
from uuid import uuid4

from botocore.exceptions import ClientError

from app.core.config import settings
from app.services.exports.draft import S3ExportStorage
from app.services.sources.storage import StorageService
from app.services.storage import ObjectStore


class FakeS3:
    def __init__(self) -> None:
        self.buckets = set()
        self.objects = {}
        self.put_requests = []

    def head_bucket(self, Bucket: str) -> None:
        if Bucket not in self.buckets:
            raise ClientError({"Error": {"Code": "404"}}, "HeadBucket")

    def create_bucket(self, Bucket: str) -> None:
        self.buckets.add(Bucket)

    def put_object(self, Bucket: str, Key: str, Body: bytes, **kwargs) -> None:
        self.objects[(Bucket, Key)] = Body
        self.put_requests.append({"Bucket": Bucket, "Key": Key, **kwargs})

    def get_object(self, Bucket: str, Key: str) -> dict:
        return {"Body": BytesIO(self.objects[(Bucket, Key)])}

    def delete_object(self, Bucket: str, Key: str) -> None:
        del self.objects[(Bucket, Key)]


def test_minio_stores_sources_and_exports_without_local_files(monkeypatch) -> None:
    monkeypatch.setattr(settings, "OBJECT_STORAGE_BACKEND", "minio")
    monkeypatch.setattr(settings, "BUCKET_NAME", "veritas-test")
    monkeypatch.setattr(settings, "MINIO_SECRET_KEY", "local-test-secret")
    client = FakeS3()
    store = ObjectStore(client=client)
    source_store = StorageService(store=store)
    matter_id = uuid4()
    source_id = uuid4()
    key, digest = source_store.save_file(b"record", "record.txt", source_id, 1, matter_id)
    assert key.startswith(f"sources/{matter_id}/{source_id}/v1/")
    assert source_store.read_file(key) == b"record"
    assert len(digest) == 64

    export_store = S3ExportStorage(store=store)
    export_key = export_store.save(uuid4(), "json", b"{}")
    assert export_key.startswith("exports/")
    assert export_store.read(export_key) == b"{}"
    export_store.delete(export_key)
    source_store.delete_file(key)
    assert not client.objects


def test_aws_s3_upload_requests_server_side_encryption(monkeypatch) -> None:
    monkeypatch.setattr(settings, "OBJECT_STORAGE_BACKEND", "s3")
    monkeypatch.setattr(settings, "BUCKET_NAME", "veritas-test")
    client = FakeS3()
    store = ObjectStore(client=client)

    StorageService(store=store).save_file(b"pdf", "record.pdf", uuid4(), 1, uuid4())

    assert client.put_requests[0]["ServerSideEncryption"] == "AES256"
    assert client.put_requests[0]["ContentType"] == "application/pdf"
