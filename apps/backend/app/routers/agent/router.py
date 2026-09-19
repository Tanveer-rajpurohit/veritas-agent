from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.auth import current_user
from app.core.config import settings
from app.models.matters import User
from app.schemas.agents import ChatRequest
from app.services.agents import stream_main_agent

router = APIRouter(prefix="/api/v1/agent", tags=["AI Agent"])


@router.post("/chat/stream", response_class=StreamingResponse)
async def stream_chat(
    payload: ChatRequest,
    _user: Annotated[User, Depends(current_user)],
) -> StreamingResponse:
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
