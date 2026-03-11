"""User-related Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──
class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    age: int = Field(..., ge=13, le=120)
    privacy_tier: str = Field(default="standard")
    interests: list[str] = Field(default_factory=list, min_length=3)
    daily_limit_minutes: int = Field(default=60, ge=10, le=480)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ── User ──
class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    age: int
    avatar_url: str | None = None
    bio: str | None = None
    privacy_tier: str
    daily_limit_minutes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserInterestOut(BaseModel):
    category: str
    score: float

    model_config = {"from_attributes": True}


class InterestUpdateRequest(BaseModel):
    interests: list[str]


class UserPreferenceOut(BaseModel):
    blocked_tags: list[str] = []
    blocked_creators: list[uuid.UUID] = []
    feed_mode: str = "recommended"
    show_content_warnings: bool = True

    model_config = {"from_attributes": True}


class UserPreferenceUpdate(BaseModel):
    blocked_tags: list[str] | None = None
    blocked_creators: list[uuid.UUID] | None = None
    feed_mode: str | None = None
    show_content_warnings: bool | None = None


class ScreenTimeSync(BaseModel):
    date: str  # YYYY-MM-DD
    minutes_spent: float


# Forward ref resolution
TokenResponse.model_rebuild()
