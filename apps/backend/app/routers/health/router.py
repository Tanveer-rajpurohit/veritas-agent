from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
@router.get("/")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
