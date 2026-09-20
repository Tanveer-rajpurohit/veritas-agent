import logging
from collections.abc import Callable
from typing import Any

from strands import Agent

from app.agents.main_agent import build_agent_model, build_bedrock_model, build_groq_model
from app.core.config import settings

logger = logging.getLogger(__name__)

__all__ = ["build_agent_model", "build_fallback_agent_model", "invoke_with_fallback"]


def build_fallback_agent_model() -> Any | None:
    try:
        if settings.BEDROCK_AGENT_ENABLED:
            return build_groq_model()
        return build_bedrock_model()
    except Exception as exc:
        logger.warning("Fallback model is unavailable: %s", type(exc).__name__)
        return None


def invoke_with_fallback(
    build: Callable[[Any | None], Agent],
    prompt: str,
    role: str,
) -> Any:
    try:
        return build(None)(prompt)
    except Exception as exc:
        logger.warning(
            "%s failed on provider %s: %s",
            role,
            settings.active_agent_provider,
            type(exc).__name__,
        )
        fallback = build_fallback_agent_model()
        if fallback is None:
            raise
        logger.info("Retrying %s on the fallback provider", role)
        return build(fallback)(prompt)
