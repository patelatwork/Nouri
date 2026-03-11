"""Wellbeing Pydantic schemas."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class WellbeingFeedbackCreate(BaseModel):
    mood_score: int = Field(..., ge=1, le=5)
    felt_worse_about_body: bool = False
    felt_anxious: bool = False
    comments: str | None = None


class WellbeingStatsOut(BaseModel):
    screen_time_weekly: list[dict]  # [{date, minutes}]
    content_breakdown: dict  # {beneficial: n, neutral: n, harmful: n}
    mood_trend: list[dict]  # [{date, score}]
    diversity_score: float  # 0–100
