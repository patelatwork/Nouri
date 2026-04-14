"""Wellbeing router — stats, feedback, and mood check-ins."""

from datetime import date, datetime, timedelta, timezone
import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models.interaction import Interaction
from models.post import Post
from models.user import ScreenTime, User
from models.wellbeing import WellbeingFeedback
from schemas.wellbeing import WellbeingFeedbackCreate, WellbeingStatsOut

router = APIRouter(prefix="/wellbeing", tags=["wellbeing"])


@router.get("/stats", response_model=WellbeingStatsOut)
async def get_wellbeing_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.now(timezone.utc)
    week_ago = today - timedelta(days=7)

    # Screen time (last 7 days)
    st_result = await db.execute(
        select(ScreenTime.date, ScreenTime.minutes_spent)
        .where(ScreenTime.user_id == user.id, ScreenTime.date >= week_ago.date())
        .order_by(ScreenTime.date)
    )
    screen_time_weekly = [
        {"date": str(r.date), "minutes": r.minutes_spent}
        for r in st_result.all()
    ]

    # Content breakdown (last 7 days)
    content_result = await db.execute(
        select(Post.wellbeing_label, func.count())
        .join(Interaction, Interaction.post_id == Post.id)
        .where(
            Interaction.user_id == user.id,
            Interaction.action == "view",
            Interaction.created_at >= week_ago,
        )
        .group_by(Post.wellbeing_label)
    )
    breakdown = {"beneficial": 0, "neutral": 0, "harmful": 0}
    for label, count in content_result.all():
        if label in breakdown:
            breakdown[label] = count

    # Mood trend (last 7 days)
    mood_result = await db.execute(
        select(WellbeingFeedback.session_date, WellbeingFeedback.mood_score)
        .where(
            WellbeingFeedback.user_id == user.id,
            WellbeingFeedback.session_date >= week_ago.date(),
        )
        .order_by(WellbeingFeedback.session_date)
    )
    mood_trend = [
        {"date": str(r.session_date), "score": r.mood_score}
        for r in mood_result.all()
    ]

    # Diversity score (from feed page 1 cache or recommendation engine fallback)
    diversity_score = 0.0
    try:
        redis = request.app.state.redis
        cached = await redis.get(f"feed:{user.id}:page:1")
        if cached:
            diversity_score = json.loads(cached).get("diversity_score", 0.0)
        else:
            from services.recommendation_engine import get_personalized_feed
            feed_result = await get_personalized_feed(db, user, 1)
            diversity_score = feed_result.get("diversity_score", 0.0)
    except Exception:
        # If redis fails or anything else, try to calculate from old interactions fallback
        pass

    return WellbeingStatsOut(
        screen_time_weekly=screen_time_weekly,
        content_breakdown=breakdown,
        mood_trend=mood_trend,
        diversity_score=diversity_score,
    )


@router.post("/feedback", status_code=201)
async def submit_feedback(
    body: WellbeingFeedbackCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    feedback = WellbeingFeedback(
        user_id=user.id,
        session_date=date.today(),
        mood_score=body.mood_score,
        felt_worse_about_body=body.felt_worse_about_body,
        felt_anxious=body.felt_anxious,
        comments=body.comments,
    )
    db.add(feedback)
    await db.commit()
    return {"status": "recorded"}
