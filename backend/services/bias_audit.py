"""Bias audit service — detects and reports beauty-score correlation.

Computes Pearson correlation between beauty_score and reach/impressions
across all posts.  If correlation exceeds 0.1, recommendations are
flagged for adversarial debiasing.

beauty_score is stored for audit only — it is NEVER used in ranking.
"""

from __future__ import annotations

import logging
import math

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.post import Post

logger = logging.getLogger(__name__)


async def generate_bias_report(db: AsyncSession) -> dict:
    """Return a JSON-serialisable bias audit report."""

    # Fetch posts that have a beauty_score
    result = await db.execute(
        select(
            Post.id,
            Post.beauty_score,
            Post.views_count,
            Post.likes_count,
            Post.category,
        ).where(Post.beauty_score.isnot(None))
    )
    rows = result.all()

    if len(rows) < 5:
        return {
            "status": "insufficient_data",
            "message": "Need at least 5 posts with beauty scores to run audit",
            "total_scored_posts": len(rows),
            "correlation_beauty_views": None,
            "correlation_beauty_likes": None,
            "recommendation": None,
            "debiasing_triggered": False,
        }

    beauty_scores = [r.beauty_score for r in rows]
    views = [float(r.views_count or 0) for r in rows]
    likes = [float(r.likes_count or 0) for r in rows]

    corr_views = _pearson(beauty_scores, views)
    corr_likes = _pearson(beauty_scores, likes)

    debiasing_needed = abs(corr_views) > 0.1 or abs(corr_likes) > 0.1

    # Category breakdown
    cat_counts: dict[str, int] = {}
    for r in rows:
        cat_counts[r.category] = cat_counts.get(r.category, 0) + 1

    recommendation = None
    if debiasing_needed:
        recommendation = (
            "Beauty score shows correlation with reach above the 0.1 threshold. "
            "Adversarial debiasing is recommended: reduce visual-feature weight "
            "in the scoring model and increase diversity bonus."
        )
    else:
        recommendation = (
            "Beauty score correlation is below the 0.1 threshold. "
            "No debiasing action needed — the platform is operating fairly."
        )

    return {
        "status": "complete",
        "total_scored_posts": len(rows),
        "correlation_beauty_views": round(corr_views, 4),
        "correlation_beauty_likes": round(corr_likes, 4),
        "category_breakdown": cat_counts,
        "debiasing_triggered": debiasing_needed,
        "recommendation": recommendation,
        "note": "beauty_score is stored for audit purposes ONLY and is never used in recommendation ranking.",
    }


def _pearson(x: list[float], y: list[float]) -> float:
    """Compute Pearson correlation coefficient."""
    n = len(x)
    if n == 0:
        return 0.0
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    den_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x))
    den_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y))
    if den_x * den_y == 0:
        return 0.0
    return num / (den_x * den_y)
