import os
from collections.abc import Generator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.auth import User
from app.models.matters import Matter, MatterMember
from app.services.exports.draft import export_storage
from app.services.sources.storage import storage_service

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


class MemoryObjectStore:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    def put(self, key: str, content: bytes, content_type: str) -> None:
        self.objects[key] = content

    def get(self, key: str) -> bytes:
        return self.objects[key]

    def delete(self, key: str) -> None:
        self.objects.pop(key, None)


@pytest.fixture(autouse=True)
def setup_test_db(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    Base.metadata.create_all(bind=test_engine)
    object_store = MemoryObjectStore()
    monkeypatch.setattr(storage_service, "store", object_store)
    monkeypatch.setattr(export_storage, "store", object_store)
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


def create_user_client(email: str, password: str = "password-12345") -> tuple[TestClient, User]:
    client = TestClient(app)
    reg = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 201, reg.text

    db = TestingSessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user.email_verified_at = datetime.now(UTC)
        db.commit()
        db.refresh(user)
    finally:
        db.close()

    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 204
    assert settings.SESSION_COOKIE_NAME in client.cookies
    return client, user


def test_matter_creation_sets_created_by_and_owner_membership() -> None:
    owner_client, owner_user = create_user_client("creator@example.com")

    resp = owner_client.post(
        "/api/v1/matters/",
        json={
            "title": "Corporate Dispute Matter",
            "matter_type": "Commercial Dispute",
            "stage": "Drafting",
            "court": "Delhi High Court",
            "case_number": "CS(COMM) 101/2026",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["created_by"] == str(owner_user.id)
    assert data["role"] == "owner"

    matter_id = data["id"]
    # Check members list
    members_resp = owner_client.get(f"/api/v1/matters/{matter_id}/members")
    assert members_resp.status_code == 200
    members = members_resp.json()
    assert len(members) == 1
    assert members[0]["user_id"] == str(owner_user.id)
    assert members[0]["role"] == "owner"
    assert members[0]["created_by"] == str(owner_user.id)


def test_member_management_owner_only_and_last_owner_protection() -> None:
    owner_client, owner_user = create_user_client("owner1@example.com")
    editor_client, editor_user = create_user_client("editor1@example.com")
    viewer_client, viewer_user = create_user_client("viewer1@example.com")

    # Owner creates matter
    resp = owner_client.post("/api/v1/matters/", json={"title": "Member Mgmt Matter"})
    assert resp.status_code == 201
    matter_id = resp.json()["id"]

    assert (
        owner_client.post(
            f"/api/v1/matters/{matter_id}/members", json={"role": "viewer"}
        ).status_code
        == 422
    )
    assert (
        owner_client.post(
            f"/api/v1/matters/{matter_id}/members",
            json={
                "user_id": str(viewer_user.id),
                "email": viewer_user.email,
                "role": "viewer",
            },
        ).status_code
        == 422
    )

    # Non-owner cannot add members
    add_resp = editor_client.post(
        f"/api/v1/matters/{matter_id}/members",
        json={"user_id": str(viewer_user.id), "role": "viewer"},
    )
    # Editor is not yet a member -> 404 (safe scoping)
    assert add_resp.status_code == 404

    # Owner adds editor
    add_resp = owner_client.post(
        f"/api/v1/matters/{matter_id}/members",
        json={"user_id": str(editor_user.id), "role": "editor"},
    )
    assert add_resp.status_code == 201
    assert add_resp.json()["role"] == "editor"

    # Now editor IS a member, but editor is NOT owner -> 403
    editor_add_resp = editor_client.post(
        f"/api/v1/matters/{matter_id}/members",
        json={"user_id": str(viewer_user.id), "role": "viewer"},
    )
    assert editor_add_resp.status_code == 403
    assert editor_client.get(f"/api/v1/matters/{matter_id}/members").status_code == 403

    # Editor cannot modify member role
    patch_resp = editor_client.patch(
        f"/api/v1/matters/{matter_id}/members/{editor_user.id}",
        json={"role": "owner"},
    )
    assert patch_resp.status_code == 403

    # Editor cannot remove member
    del_resp = editor_client.delete(f"/api/v1/matters/{matter_id}/members/{editor_user.id}")
    assert del_resp.status_code == 403

    # Last owner protection: Owner cannot remove themselves
    owner_del_self = owner_client.delete(f"/api/v1/matters/{matter_id}/members/{owner_user.id}")
    assert owner_del_self.status_code == 400
    assert "last owner" in owner_del_self.json()["detail"].lower()

    # Last owner protection: Owner cannot demote themselves
    owner_demote_self = owner_client.patch(
        f"/api/v1/matters/{matter_id}/members/{owner_user.id}",
        json={"role": "editor"},
    )
    assert owner_demote_self.status_code == 400
    assert "last owner" in owner_demote_self.json()["detail"].lower()

    # Owner adds a second owner
    owner_client.post(
        f"/api/v1/matters/{matter_id}/members",
        json={"user_id": str(viewer_user.id), "role": "owner"},
    )
    # Now owner1 CAN demote or remove themselves
    demote_res = owner_client.patch(
        f"/api/v1/matters/{matter_id}/members/{owner_user.id}",
        json={"role": "editor"},
    )
    assert demote_res.status_code == 200
    assert demote_res.json()["role"] == "editor"


def test_cross_matter_isolation_and_safe_404() -> None:
    owner_client, owner_user = create_user_client("alice@example.com")
    stranger_client, stranger_user = create_user_client("bob@example.com")

    # Alice creates a matter with resources
    m_resp = owner_client.post("/api/v1/matters/", json={"title": "Alice Private Matter"})
    assert m_resp.status_code == 201
    matter_id = m_resp.json()["id"]

    # Alice creates a document
    d_resp = owner_client.post(
        f"/api/v1/matters/{matter_id}/documents", json={"title": "Private Brief"}
    )
    assert d_resp.status_code == 201
    doc_id = d_resp.json()["id"]
    version_id = d_resp.json()["current_version_id"]

    # Alice creates a thread
    t_resp = owner_client.post(
        f"/api/v1/matters/{matter_id}/threads", json={"title": "Alice Thread"}
    )
    assert t_resp.status_code == 201
    thread_id = t_resp.json()["id"]

    # Bob lists matters -> must not see Alice's matter
    bob_matters = stranger_client.get("/api/v1/matters/").json()
    assert len(bob_matters) == 0

    # Bob directly accessing Alice's matter -> safe 404
    assert stranger_client.get(f"/api/v1/matters/{matter_id}").status_code == 404
    assert (
        stranger_client.patch(f"/api/v1/matters/{matter_id}", json={"title": "Hacked"}).status_code
        == 404
    )
    assert stranger_client.delete(f"/api/v1/matters/{matter_id}").status_code == 404
    assert stranger_client.get(f"/api/v1/matters/{matter_id}/members").status_code == 404

    # Bob directly accessing Alice's nested UUIDs -> safe 404 (never 403 or data leak)
    assert stranger_client.get(f"/api/v1/documents/{doc_id}").status_code == 404
    assert stranger_client.get(f"/api/v1/document-versions/{version_id}").status_code == 404
    assert stranger_client.get(f"/api/v1/threads/{thread_id}").status_code == 404
    assert stranger_client.get(f"/api/v1/matters/{matter_id}/sources").status_code == 404
    assert (
        stranger_client.get(f"/api/v1/document-versions/{version_id}/findings").status_code == 404
    )
    assert (
        stranger_client.post(
            f"/api/v1/document-versions/{version_id}/checks",
            json={"checks": ["fact"], "mode": "review_only"},
        ).status_code
        == 404
    )


def test_agent_run_rejects_cross_matter_nested_resources_for_same_user() -> None:
    client, _ = create_user_client("nested-scope@example.com")
    matter_a = client.post("/api/v1/matters/", json={"title": "Matter A"}).json()["id"]
    matter_b = client.post("/api/v1/matters/", json={"title": "Matter B"}).json()["id"]

    thread_a = client.post(
        f"/api/v1/matters/{matter_a}/threads", json={"title": "Thread A"}
    ).json()["id"]
    message_a = client.post(
        f"/api/v1/threads/{thread_a}/messages", json={"content": "Message A"}
    ).json()["id"]
    thread_b = client.post(
        f"/api/v1/matters/{matter_b}/threads", json={"title": "Thread B"}
    ).json()["id"]
    message_b = client.post(
        f"/api/v1/threads/{thread_b}/messages", json={"content": "Message B"}
    ).json()["id"]
    document_b = client.post(
        f"/api/v1/matters/{matter_b}/documents", json={"title": "Document B"}
    ).json()

    base_payload = {
        "agent": "main",
        "requested_action": "answer",
        "document_id": None,
        "document_version_id": None,
    }
    foreign_thread = client.post(
        f"/api/v1/matters/{matter_a}/agent-runs",
        json={**base_payload, "thread_id": thread_b, "message_id": message_b},
        headers={"Idempotency-Key": "cross-thread"},
    )
    assert foreign_thread.status_code == 404

    foreign_message = client.post(
        f"/api/v1/matters/{matter_a}/agent-runs",
        json={**base_payload, "thread_id": thread_a, "message_id": message_b},
        headers={"Idempotency-Key": "cross-message"},
    )
    assert foreign_message.status_code == 404

    foreign_document = client.post(
        f"/api/v1/matters/{matter_a}/agent-runs",
        json={
            "thread_id": thread_a,
            "message_id": message_a,
            "agent": "writer",
            "requested_action": "revise_working_brief",
            "document_id": document_b["id"],
            "document_version_id": document_b["current_version_id"],
        },
        headers={"Idempotency-Key": "cross-document"},
    )
    assert foreign_document.status_code == 404


def test_complete_role_matrix_enforcement() -> None:
    # Setup users
    owner_client, owner = create_user_client("role_owner@example.com")
    editor_client, editor = create_user_client("role_editor@example.com")
    reviewer_client, reviewer = create_user_client("role_reviewer@example.com")
    viewer_client, viewer = create_user_client("role_viewer@example.com")
    stranger_client, _ = create_user_client("role_stranger@example.com")

    # 1. Owner creates matter
    resp = owner_client.post("/api/v1/matters/", json={"title": "Matrix Test Matter"})
    assert resp.status_code == 201
    matter_id = resp.json()["id"]

    # Owner adds editor, reviewer, viewer
    owner_client.post(
        f"/api/v1/matters/{matter_id}/members",
        json={"user_id": str(editor.id), "role": "editor"},
    )
    owner_client.post(
        f"/api/v1/matters/{matter_id}/members",
        json={"user_id": str(reviewer.id), "role": "reviewer"},
    )
    owner_client.post(
        f"/api/v1/matters/{matter_id}/members",
        json={"user_id": str(viewer.id), "role": "viewer"},
    )

    # 2. Matter update/delete permissions:
    # Viewer cannot update
    assert (
        viewer_client.patch(f"/api/v1/matters/{matter_id}", json={"title": "V"}).status_code == 403
    )
    # Reviewer cannot update
    assert (
        reviewer_client.patch(f"/api/v1/matters/{matter_id}", json={"title": "R"}).status_code
        == 403
    )
    # Editor CAN update
    assert (
        editor_client.patch(
            f"/api/v1/matters/{matter_id}", json={"title": "Updated Title"}
        ).status_code
        == 200
    )
    # Viewer, Reviewer, Editor CANNOT delete
    assert viewer_client.delete(f"/api/v1/matters/{matter_id}").status_code == 403
    assert reviewer_client.delete(f"/api/v1/matters/{matter_id}").status_code == 403
    assert editor_client.delete(f"/api/v1/matters/{matter_id}").status_code == 403

    # 3. Sources:
    # Viewer & Reviewer cannot upload
    upload_data = {
        "file": ("test.txt", b"Sample legal content", "text/plain"),
    }
    assert (
        viewer_client.post(f"/api/v1/matters/{matter_id}/uploads", files=upload_data).status_code
        == 403
    )
    assert (
        reviewer_client.post(f"/api/v1/matters/{matter_id}/uploads", files=upload_data).status_code
        == 403
    )
    # Editor CAN upload
    upload_res = editor_client.post(
        f"/api/v1/matters/{matter_id}/uploads",
        files={"file": ("contract.txt", b"Agreement between Party A and B", "text/plain")},
    )
    assert upload_res.status_code == 201
    source_id = upload_res.json()["id"]

    # Viewer & Reviewer CAN list, read, and download source
    assert viewer_client.get(f"/api/v1/matters/{matter_id}/sources").status_code == 200
    assert reviewer_client.get(f"/api/v1/matters/{matter_id}/sources").status_code == 200
    assert viewer_client.get(f"/api/v1/sources/{source_id}").status_code == 200
    assert viewer_client.get(f"/api/v1/sources/{source_id}/download").status_code == 200

    # 4. Drafts / Documents & Versions:
    # Viewer & Reviewer cannot create document
    assert (
        viewer_client.post(
            f"/api/v1/matters/{matter_id}/documents", json={"title": "D"}
        ).status_code
        == 403
    )
    assert (
        reviewer_client.post(
            f"/api/v1/matters/{matter_id}/documents", json={"title": "D"}
        ).status_code
        == 403
    )
    # Editor CAN create document
    doc_res = editor_client.post(
        f"/api/v1/matters/{matter_id}/documents", json={"title": "Editor Brief"}
    )
    assert doc_res.status_code == 201
    doc_id = doc_res.json()["id"]
    version_id = doc_res.json()["current_version_id"]

    # Viewer & Reviewer CAN read document and versions
    assert viewer_client.get(f"/api/v1/documents/{doc_id}").status_code == 200
    assert reviewer_client.get(f"/api/v1/documents/{doc_id}").status_code == 200
    assert viewer_client.get(f"/api/v1/document-versions/{version_id}").status_code == 200

    # Mutating draft version:
    version_payload = {
        "base_version_id": str(version_id),
        "schema_version": 1,
        "content": {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Clause 1 text"}],
                }
            ],
        },
        "change_summary": "Add clause 1",
    }
    # Viewer & Reviewer CANNOT update draft title
    assert (
        viewer_client.patch(f"/api/v1/documents/{doc_id}", json={"title": "V"}).status_code == 403
    )
    assert (
        reviewer_client.patch(f"/api/v1/documents/{doc_id}", json={"title": "R"}).status_code == 403
    )
    # Editor CAN update draft title
    assert (
        editor_client.patch(
            f"/api/v1/documents/{doc_id}", json={"title": "Edited Title"}
        ).status_code
        == 200
    )

    # Viewer & Reviewer CANNOT create new version
    assert (
        viewer_client.post(
            f"/api/v1/documents/{doc_id}/versions",
            json=version_payload,
            headers={"Idempotency-Key": "key-viewer-ver"},
        ).status_code
        == 403
    )
    assert (
        reviewer_client.post(
            f"/api/v1/documents/{doc_id}/versions",
            json=version_payload,
            headers={"Idempotency-Key": "key-rev-ver"},
        ).status_code
        == 403
    )
    # Editor CAN create new version
    ver_res = editor_client.post(
        f"/api/v1/documents/{doc_id}/versions",
        json=version_payload,
        headers={"Idempotency-Key": "key-ed-ver"},
    )
    assert ver_res.status_code == 201
    version_v2_id = ver_res.json()["id"]

    # 5. Conversations:
    # Viewer & Reviewer CANNOT create thread
    assert (
        viewer_client.post(f"/api/v1/matters/{matter_id}/threads", json={"title": "T"}).status_code
        == 403
    )
    assert (
        reviewer_client.post(
            f"/api/v1/matters/{matter_id}/threads", json={"title": "T"}
        ).status_code
        == 403
    )
    # Editor CAN create thread
    thread_res = editor_client.post(
        f"/api/v1/matters/{matter_id}/threads", json={"title": "Collaboration"}
    )
    assert thread_res.status_code == 201
    thread_id = thread_res.json()["id"]

    # Viewer & Reviewer CANNOT post message
    assert (
        viewer_client.post(
            f"/api/v1/threads/{thread_id}/messages", json={"content": "Hi"}
        ).status_code
        == 403
    )
    assert (
        reviewer_client.post(
            f"/api/v1/threads/{thread_id}/messages", json={"content": "Hi"}
        ).status_code
        == 403
    )
    # Editor CAN post message
    msg_res = editor_client.post(
        f"/api/v1/threads/{thread_id}/messages", json={"content": "Please review clause 1"}
    )
    assert msg_res.status_code == 201
    message_id = msg_res.json()["id"]

    # Viewer & Reviewer CAN read thread and messages
    assert viewer_client.get(f"/api/v1/threads/{thread_id}").status_code == 200
    assert reviewer_client.get(f"/api/v1/threads/{thread_id}/messages").status_code == 200

    # 6. Checks and Findings:
    # Viewer CANNOT run checks
    assert (
        viewer_client.post(
            f"/api/v1/document-versions/{version_v2_id}/checks",
            json={"checks": ["fact"], "mode": "review_only"},
        ).status_code
        == 403
    )
    # Reviewer CAN run checks
    check_res = reviewer_client.post(
        f"/api/v1/document-versions/{version_v2_id}/checks",
        json={"checks": ["fact"], "mode": "review_only"},
    )
    assert check_res.status_code == 200

    # Viewer CAN read findings
    findings_res = viewer_client.get(f"/api/v1/document-versions/{version_v2_id}/findings")
    assert findings_res.status_code == 200

    # 7. Agent Runs:
    # Viewer CANNOT create agent runs
    run_payload = {
        "thread_id": thread_id,
        "message_id": message_id,
        "agent": "citation_reviewer",
        "requested_action": "review_citations",
        "document_id": doc_id,
        "document_version_id": version_v2_id,
    }
    assert (
        viewer_client.post(
            f"/api/v1/matters/{matter_id}/agent-runs",
            json=run_payload,
            headers={"Idempotency-Key": "key-viewer-run"},
        ).status_code
        == 403
    )

    # Reviewer CAN trigger review agent run
    rev_run_res = reviewer_client.post(
        f"/api/v1/matters/{matter_id}/agent-runs",
        json=run_payload,
        headers={"Idempotency-Key": "key-rev-run"},
    )
    assert rev_run_res.status_code == 202
    run_id = rev_run_res.json()["run_id"]

    # Reviewer CANNOT trigger editor-only agent run (e.g. writer revise_working_brief)
    writer_payload = {
        "thread_id": thread_id,
        "message_id": message_id,
        "agent": "writer",
        "requested_action": "revise_working_brief",
        "document_id": doc_id,
        "document_version_id": version_v2_id,
    }
    assert (
        reviewer_client.post(
            f"/api/v1/matters/{matter_id}/agent-runs",
            json=writer_payload,
            headers={"Idempotency-Key": "key-rev-writer"},
        ).status_code
        == 403
    )

    # Editor CAN trigger writer agent run
    ed_run_res = editor_client.post(
        f"/api/v1/matters/{matter_id}/agent-runs",
        json=writer_payload,
        headers={"Idempotency-Key": "key-ed-writer"},
    )
    assert ed_run_res.status_code == 202

    # Viewer & Reviewer CAN read run status and events
    assert viewer_client.get(f"/api/v1/agent-runs/{run_id}").status_code == 200
    assert reviewer_client.get(f"/api/v1/agent-runs/{run_id}").status_code == 200
    assert viewer_client.get(f"/api/v1/agent-runs/{run_id}/events").status_code == 200

    # 8. Exports:
    # Viewer CAN create draft export (pdf or json)
    exp_res = viewer_client.post(
        f"/api/v1/document-versions/{version_v2_id}/exports",
        json={"format": "pdf", "mode": "draft"},
        headers={"Idempotency-Key": "key-viewer-exp"},
    )
    assert exp_res.status_code == 201
    export_id = exp_res.json()["id"]

    # Viewer CAN download export
    assert viewer_client.get(f"/api/v1/exports/{export_id}/download").status_code == 200

    # Non-member (stranger) CANNOT export or download -> safe 404
    assert (
        stranger_client.post(
            f"/api/v1/document-versions/{version_v2_id}/exports",
            json={"format": "pdf", "mode": "draft"},
            headers={"Idempotency-Key": "key-stranger-exp"},
        ).status_code
        == 404
    )
    assert stranger_client.get(f"/api/v1/exports/{export_id}/download").status_code == 404


def test_database_constraints_against_postgresql() -> None:
    test_db_url = os.getenv("TEST_DATABASE_URL")
    if not test_db_url:
        pytest.skip("TEST_DATABASE_URL not set; skipping real PostgreSQL constraint tests")

    engine = create_engine(test_db_url)
    with Session(engine) as session:
        # Create user
        user = User(
            id=uuid4(),
            email=f"pg_constraint_{uuid4().hex[:8]}@example.com",
            password_hash="pw",
        )
        session.add(user)
        session.commit()

        # Create matter
        matter = Matter(
            id=uuid4(),
            title="PG Constraint Matter",
            created_by=user.id,
        )
        session.add(matter)
        session.commit()

        # 1. Test role check constraint ck_matter_members_role
        invalid_member = MatterMember(
            matter_id=matter.id,
            user_id=user.id,
            role="superadmin",  # Invalid role
        )
        session.add(invalid_member)
        with pytest.raises(IntegrityError) as exc_info:
            session.commit()
        session.rollback()
        assert "ck_matter_members_role" in str(exc_info.value)

        # 2. Add valid member and test CASCADE deletion of Matter -> MatterMembers
        valid_member = MatterMember(
            matter_id=matter.id,
            user_id=user.id,
            role="owner",
        )
        session.add(valid_member)
        session.commit()

        # Verify member exists
        retrieved = session.scalar(
            select(MatterMember).where(
                MatterMember.matter_id == matter.id,
                MatterMember.user_id == user.id,
            )
        )
        assert retrieved is not None

        member_user = User(
            id=uuid4(),
            email=f"member_{uuid4().hex[:8]}@example.com",
            password_hash="pw",
        )
        session.add(member_user)
        session.commit()
        session.add(MatterMember(matter_id=matter.id, user_id=member_user.id, role="viewer"))
        session.commit()
        session.delete(member_user)
        session.commit()
        assert session.get(MatterMember, (matter.id, member_user.id)) is None

        # Delete Matter -> Should cascade delete MatterMember
        session.delete(matter)
        session.commit()

        # Member should now be gone
        cascaded_member = session.scalar(
            select(MatterMember).where(
                MatterMember.matter_id == matter.id,
                MatterMember.user_id == user.id,
            )
        )
        assert cascaded_member is None
        session.delete(user)
        session.commit()

        # 3. Test RESTRICT on Matter.created_by
        creator_user = User(
            id=uuid4(),
            email=f"creator_{uuid4().hex[:8]}@example.com",
            password_hash="pw",
        )
        session.add(creator_user)
        session.commit()

        matter2 = Matter(
            id=uuid4(),
            title="Matter for RESTRICT test",
            created_by=creator_user.id,
        )
        session.add(matter2)
        session.commit()

        # Attempt to delete creator_user while matter2 exists -> RESTRICT error
        session.delete(creator_user)
        with pytest.raises(IntegrityError) as exc_info:
            session.commit()
        session.rollback()
        assert "matters" in str(exc_info.value).lower() or "restrict" in str(exc_info.value).lower()

        # Cleanup matter2 and creator_user
        session.delete(matter2)
        session.commit()
        session.delete(creator_user)
        session.commit()
