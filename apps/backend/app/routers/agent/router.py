from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.schemas.agent import ChatRequest
from app.services.agent_service import stream_main_agent

router = APIRouter(prefix="/api/v1/agent", tags=["AI Agent"])


@router.post("/chat/stream", response_class=StreamingResponse)
async def stream_chat(payload: ChatRequest) -> StreamingResponse:
    if not settings.BEDROCK_AGENT_ENABLED and not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The agent is not configured.",
        )

    return StreamingResponse(
        stream_main_agent(payload.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
