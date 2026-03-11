"""Responsible recommendation engine — Two-Tower retrieval + ethical re-ranking.

Pipeline:
1. Retrieve top-200 candidates via pgvector cosine similarity (the "two towers")
2. Re-rank using the responsible scoring formula:
      final = (0.4*relevance + 0.4*wellbeing + 0.2*diversity) * screen_time_penalty
3. Enforce hard diversity constraints
4. Return paginated results
"""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.interaction import Interaction
from models.post import Post
from models.user import ScreenTime, User, UserEmbedding, UserInterest
from services.diversity_ranker import (
    compute_diversity_score,
    diversity_bonus,
    enforce_diversity_constraints,
    pick_explore_posts,
)
from services.embedding_service import cosine_similarity
from services.wellbeing_scorer import wellbeing_score_for_ranking

CANDIDATES_LIMIT = 200
PAGE_SIZE = 10


async def get_personalized_feed(
    db: AsyncSession,
    user: User,
    page: int = 1,
) -> dict:
    """Full recommendation pipeline returning a feed page."""

    # 1 — Fetch user embedding
    emb_row = await db.execute(
        select(UserEmbedding).where(UserEmbedding.user_id == user.id)
    )
    user_emb_record = emb_row.scalar_one_or_none()

    if user_emb_record is None or user_emb_record.embedding is None:
        # Fallback: return recent posts sorted by created_at
        return await _fallback_feed(db, user, page)

    user_embedding = list(user_emb_record.embedding)

    # 2 — pgvector retrieval: top-200 by cosine similarity
    embedding_literal = "[" + ",".join(str(v) for v in user_embedding) + "]"
    stmt = (
        select(Post)
        .options(selectinload(Post.creator))
        .where(Post.embedding.isnot(None))
        .order_by(Post.embedding.cosine_distance(user_emb_record.embedding))
        .limit(CANDIDATES_LIMIT)
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()

    if not candidates:
        return await _fallback_feed(db, user, page)

    # 3 — Get recently seen categories/creators for diversity
    recent_interactions = await db.execute(
        select(Interaction.post_id)
        .where(Interaction.user_id == user.id)
        .order_by(Interaction.created_at.desc())
        .limit(50)
    )
    recent_post_ids = [r[0] for r in recent_interactions.all()]
    recently_seen_categories: list[str] = []
    recently_seen_creators: list[str] = []

    if recent_post_ids:
        recent_posts = await db.execute(
            select(Post.category, Post.creator_id).where(Post.id.in_(recent_post_ids))
        )
        for cat, cid in recent_posts.all():
            recently_seen_categories.append(cat)
            recently_seen_creators.append(str(cid))

    # 4 — Get user interests for serendipity
    interests_result = await db.execute(
        select(UserInterest.category)
        .where(UserInterest.user_id == user.id)
        .order_by(UserInterest.score.desc())
    )
    user_top_interests = [r[0] for r in interests_result.all()]

    # 5 — Screen time penalty
    penalty = await _screen_time_penalty(db, user)

    # 6 — Score & re-rank each candidate
    scored: list[dict] = []
    for post in candidates:
        post_embedding = list(post.embedding) if post.embedding is not None else [0.0] * 384

        relevance = cosine_similarity(user_embedding, post_embedding)
        wellbeing = wellbeing_score_for_ranking(
            post.tags or [], post.title, post.description, user.age
        )
        div_bonus = diversity_bonus(
            post.category,
            str(post.creator_id),
            recently_seen_categories,
            recently_seen_creators,
        )

        # NOTE: beauty_score is NEVER included in this formula
        final_score = (
            0.4 * relevance
            + 0.4 * wellbeing
            + 0.2 * div_bonus
        ) * penalty

        scored.append({
            "post": post,
            "score": final_score,
            "category": post.category,
            "creator_id": str(post.creator_id),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)

    # 7 — Enforce hard diversity constraints
    scored = enforce_diversity_constraints(scored, user_top_interests)

    # 8 — Paginate
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE
    page_items = scored[start:end]
    has_more = end < len(scored)

    # 9 — Compute feed diversity score
    page_cats = [p["category"] for p in page_items]
    page_creators = [p["creator_id"] for p in page_items]
    feed_diversity = compute_diversity_score(page_cats, page_creators)

    # 10 — "Explore Different Perspectives"
    all_post_dicts = [{"category": p["category"], "post": p["post"]} for p in scored]
    explore_picks = pick_explore_posts(all_post_dicts, user_top_interests, limit=5)

    return {
        "posts": [p["post"] for p in page_items],
        "page": page,
        "has_more": has_more,
        "diversity_score": feed_diversity,
        "explore_posts": [p["post"] for p in explore_picks],
    }


async def get_chronological_feed(
    db: AsyncSession,
    page: int = 1,
) -> dict:
    """Simple time-ordered feed — no ranking, full transparency."""
    offset = (page - 1) * PAGE_SIZE
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.creator))
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(PAGE_SIZE + 1)
    )
    posts = result.scalars().all()
    has_more = len(posts) > PAGE_SIZE
    posts = posts[:PAGE_SIZE]

    cats = [p.category for p in posts]
    creators = [str(p.creator_id) for p in posts]

    return {
        "posts": posts,
        "page": page,
        "has_more": has_more,
        "diversity_score": compute_diversity_score(cats, creators),
        "explore_posts": [],
    }


async def explain_recommendation(
    db: AsyncSession,
    user: User,
    post: Post,
) -> dict:
    """Generate explainability data for a single post."""
    reasons: list[str] = []

    # Check interest match
    interests = await db.execute(
        select(UserInterest.category)
        .where(UserInterest.user_id == user.id)
    )
    user_cats = {r[0] for r in interests.all()}
    if post.category in user_cats:
        reasons.append(f"Matches your interest in {post.category}")

    # Check if trending
    if (post.views_count or 0) > 1000:
        reasons.append("Trending content with high engagement")

    # Check diversity pick
    if post.category not in user_cats:
        reasons.append("Diversity pick — exploring new perspectives for you")

    # Check recency
    if not reasons:
        reasons.append("Recently published content in your region")

    # Wellbeing info
    from services.wellbeing_scorer import score_post
    label, score, detail = score_post(
        post.tags or [], post.title, post.description, user.age
    )

    return {
        "post_id": str(post.id),
        "reasons": reasons[:3],
        "wellbeing_label": label,
        "wellbeing_detail": detail,
        "beauty_disclaimer": (
            "Your appearance or attractiveness of content creators "
            "does NOT affect your recommendations."
        ),
    }


async def _screen_time_penalty(db: AsyncSession, user: User) -> float:
    """Reduce recommendation strength as user approaches daily limit."""
    today = date.today()
    result = await db.execute(
        select(ScreenTime.minutes_spent)
        .where(ScreenTime.user_id == user.id, ScreenTime.date == today)
    )
    row = result.scalar_one_or_none()
    minutes_today = row or 0.0

    limit = user.daily_limit_minutes or 60
    ratio = minutes_today / limit

    if ratio < 0.5:
        return 1.0
    elif ratio < 0.8:
        return 0.9
    elif ratio < 1.0:
        return 0.7
    else:
        return 0.4  # Beyond limit — heavily penalise engagement bait


async def _fallback_feed(db: AsyncSession, user: User, page: int) -> dict:
    """When no user embedding exists yet, return recent diverse posts."""
    return await get_chronological_feed(db, page)
