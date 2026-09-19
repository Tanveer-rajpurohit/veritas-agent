from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401
from app.core.config import settings
from app.db.init_db import init_db
from app.routers.agent.router import router as agent_router
from app.routers.agent_runs.router import router as agent_runs_router
from app.routers.auth.router import router as auth_router
from app.routers.conversations.router import router as conversations_router
from app.routers.documents.router import router as documents_router
from app.routers.exports.router import router as exports_router
from app.routers.health.router import router as health_router
from app.routers.matters.router import router as matter_router
from app.routers.reviews.router import router as reviews_router
from app.routers.sources.router import router as sources_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Evidence-first legal drafting and review API for Veritas.",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(agent_router)
app.include_router(matter_router)
app.include_router(sources_router)
app.include_router(documents_router)
app.include_router(reviews_router)
app.include_router(exports_router)
app.include_router(conversations_router)
app.include_router(agent_runs_router)


@app.get("/", tags=["Health"])
async def root() -> dict[str, str]:
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
