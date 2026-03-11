"""Diversity ranker — enforces category / creator / serendipity constraints.

Hard constraint: every 10 posts must contain:
  - >= 3 different categories
  - >= 5 different creators
  - >= 1 serendipity post (outside user's top interests)
"""

from __future__ import annotations

import random


def diversity_bonus(
    post_category: str,
    post_creator_id: str,
    recently_seen_categories: list[str],
    recently_seen_creators: list[str],
) -> float:
    """Return a bonus ∈ [0, 1] rewarding novelty."""
    bonus = 0.0

    # Category novelty
    if post_category not in recently_seen_categories:
        bonus += 0.5
    elif recently_seen_categories.count(post_category) <= 1:
        bonus += 0.2

    # Creator novelty
    if post_creator_id not in recently_seen_creators:
        bonus += 0.5
    elif recently_seen_creators.count(post_creator_id) <= 1:
        bonus += 0.2

    return min(1.0, bonus)


def compute_diversity_score(categories: list[str], creators: list[str]) -> float:
    """0–100 score based on unique categories and creators in a feed page."""
    if not categories:
        return 0.0
    cat_unique = len(set(categories))
    creator_unique = len(set(creators))
    total = len(categories)
    # Ratio of unique to total, weighted
    cat_ratio = cat_unique / max(total, 1)
    creator_ratio = creator_unique / max(total, 1)
    return round(min(100.0, (cat_ratio * 50 + creator_ratio * 50) * 1.5), 1)


def enforce_diversity_constraints(
    ranked_posts: list[dict],
    user_top_interests: list[str],
) -> list[dict]:
    """Re-order posts to satisfy the hard diversity constraints.

    Each window of 10 posts will have:
    - >= 3 unique categories
    - >= 5 unique creators
    - >= 1 serendipity pick (category NOT in user_top_interests)
    """
    if len(ranked_posts) <= 10:
        return ranked_posts

    result: list[dict] = []
    remaining = list(ranked_posts)
    top_set = set(user_top_interests)

    while remaining:
        window_size = min(10, len(remaining))
        window = remaining[:window_size]
        rest = remaining[window_size:]

        # Check constraints
        cats_in_window = [p["category"] for p in window]
        creators_in_window = [p["creator_id"] for p in window]
        has_serendipity = any(p["category"] not in top_set for p in window)

        # If serendipity missing, try to swap one post from rest
        if not has_serendipity and rest:
            for i, p in enumerate(rest):
                if p["category"] not in top_set:
                    # Swap with lowest-scored post in window
                    window[-1], rest[i] = rest[i], window[-1]
                    break

        # If too few categories, swap from rest
        if len(set(cats_in_window)) < 3 and rest:
            needed_cats = 3 - len(set(cats_in_window))
            for i, p in enumerate(rest):
                if p["category"] not in set(c["category"] for c in window):
                    # Insert and remove last
                    window.insert(len(window) - 1, rest.pop(i))
                    if len(window) > window_size:
                        overflow = window.pop()
                        rest.insert(0, overflow)
                    needed_cats -= 1
                    if needed_cats <= 0:
                        break

        result.extend(window)
        remaining = rest

    return result


def pick_explore_posts(
    all_posts: list[dict],
    user_interests: list[str],
    limit: int = 5,
) -> list[dict]:
    """Select posts from categories the user has NEVER engaged with."""
    interest_set = set(user_interests)
    unexplored = [p for p in all_posts if p.get("category") not in interest_set]
    if len(unexplored) <= limit:
        return unexplored
    return random.sample(unexplored, limit)
