"""Posts router — interactions, explainability, upload, ingestion."""

import os
import uuid

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile, File, Form, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_user
from database import get_db
from models.interaction import Interaction, WatchHistory
from models.post import Creator, Post
from models.user import User, UserEmbedding, UserInterest
from schemas.interaction import InteractionCreate, InteractionOut
from schemas.post import ExplainResponse, PostOut
from services.embedding_service import (
    get_content_embedding_text,
    get_embedding,
    get_user_embedding_text,
    privatise_user_embedding,
)
from services.recommendation_engine import explain_recommendation
from services.wellbeing_scorer import score_post
from services.youtube_ingestion import CATEGORIES, ingest_pexels_videos, ingest_youtube_shorts

router = APIRouter(tags=["posts"])

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
)


@router.post("/interactions/{post_id}", response_model=InteractionOut)
async def log_interaction(
    post_id: uuid.UUID,
    body: InteractionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify post exists
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    interaction = Interaction(
        user_id=user.id,
        post_id=post_id,
        action=body.action,
        watch_duration_seconds=body.watch_duration_seconds,
        completion_rate=body.completion_rate,
    )
    db.add(interaction)

    # Also log to watch_history for 'view' actions
    if body.action == "view":
        wh = WatchHistory(
            user_id=user.id,
            post_id=post_id,
            completion_rate=body.completion_rate or 0.0,
        )
        db.add(wh)

    # Update view/like counts
    if body.action == "view":
        post.views_count = (post.views_count or 0) + 1
    elif body.action == "like":
        post.likes_count = (post.likes_count or 0) + 1

    # Update user interest scores based on interaction
    if body.action in ("like", "save"):
        await _boost_interest(db, user.id, post.category, 0.1)
        await _update_user_embedding(db, user)
    elif body.action == "dislike":
        await _boost_interest(db, user.id, post.category, -0.2)
        await _update_user_embedding(db, user)

    await db.commit()
    await db.refresh(interaction)

    # Invalidate feed cache so interactions take effect on next feed load
    if body.action in ("like", "save", "dislike"):
        try:
            redis = request.app.state.redis
            keys = await redis.keys(f"feed:{user.id}:*")
            if keys:
                await redis.delete(*keys)
        except Exception:
            pass

    return InteractionOut.model_validate(interaction)


@router.get("/explain/{post_id}", response_model=ExplainResponse)
async def explain_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    data = await explain_recommendation(db, user, post)
    return ExplainResponse(**data)


@router.post("/posts/upload", response_model=PostOut, status_code=201)
async def upload_post(
    title: str = Form(...),
    description: str = Form(None),
    tags: str = Form(""),  # comma-separated
    category: str = Form("general"),
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate file
    if video.size and video.size > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Video must be under 100MB")

    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Upload to Cloudinary
    contents = await video.read()
    upload_result = cloudinary.uploader.upload(
        contents,
        resource_type="video",
        folder="nouri_uploads",
        eager=[{"format": "mp4", "transformation": [{"quality": "auto"}]}],
    )

    video_url = upload_result.get("secure_url", "")
    thumbnail_url = video_url.replace(".mp4", ".jpg") if video_url else ""
    duration = int(upload_result.get("duration", 0))

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Get or create creator profile for user
    creator = await _get_or_create_user_creator(db, user)

    # Wellbeing scoring
    label, score_val, detail = score_post(tag_list, title, description)

    # Generate embedding
    emb_text = await get_content_embedding_text(title, description, tag_list, category, user.bio)
    embedding = await get_embedding(emb_text)

    post = Post(
        source_api="upload",
        creator_id=creator.id,
        title=title,
        description=description,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        tags=tag_list,
        category=category,
        wellbeing_label=label,
        duration_seconds=duration,
        embedding=embedding,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return PostOut.model_validate(post)


@router.get("/posts/ingest-youtube")
async def trigger_youtube_ingestion(
    background_tasks: BackgroundTasks,
    category: str = Query("education", enum=CATEGORIES),
    max_results: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Trigger background ingestion of YouTube Shorts for a given category."""
    background_tasks.add_task(_run_ingestion, category, max_results)
    return {"status": "ingestion_started", "category": category, "max_results": max_results}


@router.get("/bias-audit")
async def bias_audit(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from services.bias_audit import generate_bias_report
    return await generate_bias_report(db)


@router.get("/posts/user/{user_id}", response_model=list[PostOut])
async def get_user_posts(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return all posts uploaded by a specific user."""
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.creator))
        .join(Creator, Post.creator_id == Creator.id)
        .where(Creator.user_id == user_id)
        .order_by(Post.created_at.desc())
    )
    posts = result.scalars().all()
    return [PostOut.model_validate(p) for p in posts]


# ── Helpers ──

async def _boost_interest(db: AsyncSession, user_id: uuid.UUID, category: str, delta: float):
    """Adjust a user's interest score for a category."""
    result = await db.execute(
        select(UserInterest).where(
            UserInterest.user_id == user_id,
            UserInterest.category == category,
        )
    )
    interest = result.scalar_one_or_none()
    if interest:
        interest.score = max(0.0, min(5.0, interest.score + delta))
    elif delta > 0:
        db.add(UserInterest(user_id=user_id, category=category, score=max(0.0, 1.0 + delta)))


async def _update_user_embedding(db: AsyncSession, user: User):
    """Regenerate user embedding from current interest scores.

    The raw embedding from HuggingFace is passed through
    privatise_user_embedding() which adds calibrated Gaussian noise
    before the vector is written to the database. This prevents
    membership inference attacks on the stored embedding.
    """
    from datetime import datetime, timezone

    interests_result = await db.execute(
        select(UserInterest.category)
        .where(UserInterest.user_id == user.id)
        .order_by(UserInterest.score.desc())
    )
    cats = [r[0] for r in interests_result.all()]
    if not cats:
        return

    emb_text = await get_user_embedding_text(cats, user.bio)
    raw_vector = await get_embedding(emb_text)

    # ── Differential Privacy: add Gaussian noise before storing ─────────────
    # Protects against membership inference. Content embeddings (posts)
    # are NOT noised — only user profile embeddings.
    emb_vector = await privatise_user_embedding(raw_vector)

    existing_emb = await db.execute(
        select(UserEmbedding).where(UserEmbedding.user_id == user.id)
    )
    emb_record = existing_emb.scalar_one_or_none()
    if emb_record:
        emb_record.embedding = emb_vector
        emb_record.updated_at = datetime.now(timezone.utc)
    else:
        db.add(UserEmbedding(user_id=user.id, embedding=emb_vector))


async def _get_or_create_user_creator(db: AsyncSession, user: User) -> Creator:
    """Get or create a Creator record linked to a Nouri user."""
    result = await db.execute(
        select(Creator).where(Creator.user_id == user.id)
    )
    creator = result.scalar_one_or_none()
    if creator:
        return creator

    creator = Creator(
        name=user.username,
        bio=user.bio or "",
        profile_picture_url=user.avatar_url or "",
        platform="nouri",
        user_id=user.id,
    )
    db.add(creator)
    await db.flush()
    return creator


async def _run_ingestion(category: str, max_results: int):
    """Background task: ingest YouTube + Pexels content."""
    import logging
    from database import async_session

    logger = logging.getLogger("nouri.ingestion")
    try:
        async with async_session() as db:
            await ingest_youtube_shorts(db, category, max_results)
            await ingest_pexels_videos(db, category, max_results)
    except Exception as e:
        logger.error(f"Ingestion failed for {category}: {e}")
