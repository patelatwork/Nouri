"""Post & Creator Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CreatorOut(BaseModel):
    id: uuid.UUID
    name: str
    bio: str | None = None
    profile_picture_url: str | None = None
    subscriber_count: int = 0
    platform: str = "youtube"

    model_config = {"from_attributes": True}


class PostOut(BaseModel):
    id: uuid.UUID
    source_api: str
    title: str
    description: str | None = None
    video_url: str
    thumbnail_url: str | None = None
    embed_url: str | None = None
    tags: list[str] = []
    category: str = "general"
    wellbeing_label: str = "neutral"
    duration_seconds: int = 0
    likes_count: int = 0
    views_count: int = 0
    created_at: datetime
    creator: CreatorOut | None = None

    model_config = {"from_attributes": True}


class PostUploadRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    category: str = "general"


class ExplainResponse(BaseModel):
    post_id: uuid.UUID
    reasons: list[str]
    wellbeing_label: str
    wellbeing_detail: str
    beauty_disclaimer: str = (
        "Your appearance or attractiveness of content creators does NOT affect your recommendations."
    )
