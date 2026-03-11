"""Feed-specific Pydantic schemas."""

from __future__ import annotations

from pydantic import BaseModel

from schemas.post import PostOut


class FeedResponse(BaseModel):
    posts: list[PostOut]
    page: int
    has_more: bool
    diversity_score: float  # 0–100
    explore_picks: list[PostOut] = []  # "Explore Different Perspectives"
