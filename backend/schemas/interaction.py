"""Interaction Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class InteractionCreate(BaseModel):
    action: str = Field(..., pattern="^(view|like|save|share|skip|dislike)$")
    watch_duration_seconds: int | None = None
    completion_rate: float | None = Field(None, ge=0.0, le=1.0)


class InteractionOut(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    action: str
    watch_duration_seconds: int | None = None
    completion_rate: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WatchHistoryOut(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    watched_at: datetime
    completion_rate: float
    post_title: str | None = None
    thumbnail_url: str | None = None
    creator_name: str | None = None
    category: str | None = None

    model_config = {"from_attributes": True}
