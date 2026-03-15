"""User router — profile, interests, preferences, watch history, screen time."""

from datetime import date, datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models.interaction import WatchHistory
from models.post import Creator, Post
from models.user import ScreenTime, User, UserEmbedding, UserInterest, UserPreference
from schemas.user import (
    InterestUpdateRequest,
    ScreenTimeSync,
    UserInterestOut,
    UserPreferenceOut,
    UserPreferenceUpdate,
    UserPublic,
)
from schemas.interaction import WatchHistoryOut
from services.embedding_service import get_embedding, get_user_embedding_text

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)):
    return UserPublic.model_validate(user)


@router.get("/interests", response_model=list[UserInterestOut])
async def get_interests(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserInterest)
        .where(UserInterest.user_id == user.id)
        .order_by(UserInterest.score.desc())
    )
    return [UserInterestOut.model_validate(r) for r in result.scalars().all()]


@router.post("/interests/update", response_model=list[UserInterestOut])
async def update_interests(
    body: InterestUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Delete old interests
    await db.execute(
        delete(UserInterest).where(UserInterest.user_id == user.id)
    )

    new_interests = []
    for cat in body.interests:
        interest = UserInterest(user_id=user.id, category=cat, score=1.0)
        db.add(interest)
        new_interests.append(interest)

    # Regenerate user embedding
    emb_text = await get_user_embedding_text(body.interests, user.bio)
    emb_vector = await get_embedding(emb_text)

    existing_emb = await db.execute(
        select(UserEmbedding).where(UserEmbedding.user_id == user.id)
    )
    emb_record = existing_emb.scalar_one_or_none()
    if emb_record:
        emb_record.embedding = emb_vector
        emb_record.updated_at = datetime.now(timezone.utc)
    else:
        db.add(UserEmbedding(user_id=user.id, embedding=emb_vector))

    await db.commit()

    # Invalidate feed cache so new interests take effect immediately
    try:
        redis = request.app.state.redis
        keys = await redis.keys(f"feed:{user.id}:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass  # Redis unavailable is non-fatal

    return [UserInterestOut.model_validate(i) for i in new_interests]


@router.get("/preferences", response_model=UserPreferenceOut)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return UserPreferenceOut.model_validate(pref)


@router.put("/preferences", response_model=UserPreferenceOut)
async def update_preferences(
    body: UserPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)

    if body.blocked_tags is not None:
        pref.blocked_tags = body.blocked_tags
    if body.blocked_creators is not None:
        pref.blocked_creators = body.blocked_creators
    if body.feed_mode is not None:
        pref.feed_mode = body.feed_mode
    if body.show_content_warnings is not None:
        pref.show_content_warnings = body.show_content_warnings

    await db.commit()
    await db.refresh(pref)
    return UserPreferenceOut.model_validate(pref)


@router.get("/watch-history", response_model=list[WatchHistoryOut])
async def get_watch_history(
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    offset = (page - 1) * 20
    result = await db.execute(
        select(WatchHistory, Post.title, Post.thumbnail_url, Post.category, Creator.name)
        .join(Post, WatchHistory.post_id == Post.id)
        .outerjoin(Creator, Post.creator_id == Creator.id)
        .where(WatchHistory.user_id == user.id)
        .order_by(WatchHistory.watched_at.desc())
        .offset(offset)
        .limit(20)
    )
    rows = result.all()
    return [
        WatchHistoryOut(
            id=wh.id,
            post_id=wh.post_id,
            watched_at=wh.watched_at,
            completion_rate=wh.completion_rate,
            post_title=title,
            thumbnail_url=thumb,
            category=category,
            creator_name=creator_name,
        )
        for wh, title, thumb, category, creator_name in rows
    ]


@router.post("/screen-time/sync")
async def sync_screen_time(
    body: ScreenTimeSync,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    target_date = date.fromisoformat(body.date)
    result = await db.execute(
        select(ScreenTime).where(
            ScreenTime.user_id == user.id,
            ScreenTime.date == target_date,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.minutes_spent = body.minutes_spent
    else:
        db.add(ScreenTime(user_id=user.id, date=target_date, minutes_spent=body.minutes_spent))

    await db.commit()
    return {"status": "synced"}


@router.post("/reset-algorithm")
async def reset_algorithm(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete all interactions and re-generate embedding from base interests."""
    from models.interaction import Interaction, WatchHistory as WH

    await db.execute(delete(Interaction).where(Interaction.user_id == user.id))
    await db.execute(delete(WH).where(WH.user_id == user.id))

    interests_result = await db.execute(
        select(UserInterest.category).where(UserInterest.user_id == user.id)
    )
    cats = [r[0] for r in interests_result.all()]

    emb_text = await get_user_embedding_text(cats, user.bio)
    emb_vector = await get_embedding(emb_text)

    existing_emb = await db.execute(
        select(UserEmbedding).where(UserEmbedding.user_id == user.id)
    )
    emb_record = existing_emb.scalar_one_or_none()
    if emb_record:
        emb_record.embedding = emb_vector
    else:
        db.add(UserEmbedding(user_id=user.id, embedding=emb_vector))

    await db.commit()
    return {"status": "algorithm_reset"}
