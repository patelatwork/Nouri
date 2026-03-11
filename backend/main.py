import logging
import os
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import get_db, init_db  # noqa: E402
from routers import auth, feed, posts, user, wellbeing  # noqa: E402

REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
logger = logging.getLogger(__name__)


async def _seed_content_if_empty():
    """Ingest a few categories of content on first startup if DB has no posts."""
    from sqlalchemy import func, select
    from models.post import Post
    from services.youtube_ingestion import CATEGORIES, ingest_pexels_videos, ingest_youtube_shorts

    async for db in get_db():
        count_result = await db.execute(select(func.count()).select_from(Post))
        count = count_result.scalar()
        if count and count > 0:
            logger.info("DB already has %d posts — skipping seed", count)
            return
        logger.info("No posts found — seeding content from YouTube & Pexels...")
        for cat in CATEGORIES[:5]:  # seed 5 categories to stay within API quotas
            try:
                await ingest_youtube_shorts(db, category=cat, max_results=5)
            except Exception as exc:
                logger.warning("YouTube seed failed for %s: %s", cat, exc)
            try:
                await ingest_pexels_videos(db, category=cat, max_results=5)
            except Exception as exc:
                logger.warning("Pexels seed failed for %s: %s", cat, exc)
        logger.info("Content seeding complete")
        break


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup
    await init_db()
    application.state.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    await _seed_content_if_empty()
    yield
    # Shutdown
    await application.state.redis.aclose()


app = FastAPI(
    title="Nouri API",
    description="Ethical social media recommendation platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(feed.router)
app.include_router(posts.router)
app.include_router(user.router)
app.include_router(wellbeing.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": "Nouri"}
