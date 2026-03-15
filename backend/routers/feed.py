"""Feed router — personalised and chronological feeds."""

import json

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models.user import User
from schemas.feed import FeedResponse
from schemas.post import PostOut
from services.recommendation_engine import get_chronological_feed, get_personalized_feed

router = APIRouter(tags=["feed"])

FEED_CACHE_TTL = 300  # 5 minutes


@router.get("/feed", response_model=FeedResponse)
async def personalized_feed(
    request: Request,
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    redis = request.app.state.redis
    cache_key = f"feed:{user.id}:page:{page}"

    # Check Redis cache
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    result = await get_personalized_feed(db, user, page)

    response = FeedResponse(
        posts=[PostOut.model_validate(p) for p in result["posts"]],
        page=result["page"],
        has_more=result["has_more"],
        diversity_score=result["diversity_score"],
        explore_picks=[PostOut.model_validate(p) for p in result["explore_posts"]],
    )

    # Cache for 5 min
    await redis.set(cache_key, response.model_dump_json(), ex=FEED_CACHE_TTL)
    return response


@router.get("/feed/chronological", response_model=FeedResponse)
async def chronological_feed(
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await get_chronological_feed(db, page)
    return FeedResponse(
        posts=[PostOut.model_validate(p) for p in result["posts"]],
        page=result["page"],
        has_more=result["has_more"],
        diversity_score=result["diversity_score"],
        explore_picks=[],
    )
