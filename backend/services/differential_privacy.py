"""Differential Privacy engine — Laplace & Gaussian mechanisms.

This module provides mathematically sound DP primitives that protect user
privacy in aggregate statistics and vector representations.

Theory
------
Laplace mechanism (for scalar/count outputs):
    M(f, D) = f(D) + Lap(sensitivity / epsilon)

Gaussian mechanism (for vector outputs):
    M(f, D) = f(D) + N(0, (sensitivity * sqrt(2*ln(1.25/delta)) / epsilon)^2)

Privacy budget
--------------
DP_EPSILON : float
    The privacy budget ε — lower means more privacy, less utility.
    Default 1.0 (moderate; industry standard for social platforms).

DP_DELTA : float
    The failure probability δ for the Gaussian mechanism.
    Default 1e-5 (cryptographically negligible).

Sensitivity guide
-----------------
- Screen-time minutes  → sensitivity = daily_limit (e.g. 90 min)
- Count (views/likes)  → sensitivity = 1 (adding/removing one record
                         changes the count by at most 1)
- Content breakdown    → sensitivity = 1 per category
- Embedding vector     → sensitivity = 1.0 (unit sphere, L2 norm ≤ 1)
"""

from __future__ import annotations

import logging
import math
import os
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ── Privacy budget (overridable via env) ─────────────────────────────────────
DP_EPSILON: float = float(os.getenv("DP_EPSILON", "1.0"))
DP_DELTA: float = float(os.getenv("DP_DELTA", "1e-5"))

# Minimum epsilon guard — never allow ε ≤ 0
if DP_EPSILON <= 0:
    logger.warning("DP_EPSILON must be > 0; resetting to 1.0")
    DP_EPSILON = 1.0


# ── Core mechanisms ──────────────────────────────────────────────────────────

def laplace_noise(sensitivity: float, epsilon: float) -> float:
    """Sample a single noise value from Lap(sensitivity/epsilon).

    Parameters
    ----------
    sensitivity:
        Global sensitivity of the function (Δf) in the *same units* as the
        output. E.g. for integer counts, sensitivity = 1.
    epsilon:
        Privacy budget ε > 0.

    Returns
    -------
    float
        A single Laplace noise sample.
    """
    if epsilon <= 0:
        raise ValueError(f"epsilon must be > 0, got {epsilon}")
    scale = sensitivity / epsilon
    return float(np.random.laplace(loc=0.0, scale=scale))


def gaussian_noise_scale(sensitivity: float, epsilon: float, delta: float) -> float:
    """Compute the σ for the Gaussian mechanism satisfying (ε, δ)-DP.

    Uses the standard formula: σ = sensitivity * sqrt(2 * ln(1.25/δ)) / ε
    """
    if epsilon <= 0 or delta <= 0 or delta >= 1:
        raise ValueError(f"Invalid ε={epsilon}, δ={delta}")
    sigma = sensitivity * math.sqrt(2 * math.log(1.25 / delta)) / epsilon
    return sigma


# ── Public API ───────────────────────────────────────────────────────────────

def privatise_float(
    value: float,
    sensitivity: float,
    epsilon: float = DP_EPSILON,
) -> float:
    """Add Laplace noise to a single floating-point value.

    Example: screen-time minutes, scores, ratios.
    """
    noisy = value + laplace_noise(sensitivity, epsilon)
    return float(noisy)


def privatise_count(
    value: int | float,
    epsilon: float = DP_EPSILON,
    sensitivity: float = 1.0,
    min_val: int = 0,
) -> int:
    """Add Laplace noise to an integer count and round back to int.

    Clamps to [min_val, ∞) to prevent negative counts.

    Example: views_count, likes_count, breakdown counts.
    """
    noisy = float(value) + laplace_noise(sensitivity, epsilon)
    return max(min_val, round(noisy))


def privatise_counts_dict(
    counts: dict[str, int | float],
    epsilon: float = DP_EPSILON,
    sensitivity: float = 1.0,
) -> dict[str, int]:
    """Add Laplace noise to every value in a counts dictionary.

    Uses **parallel composition**: since each key is an independent query
    over disjoint subsets of the data, each query consumes only ε (not k*ε).

    Example: content_breakdown = {"beneficial": 5, "neutral": 12, "harmful": 1}
    """
    return {
        key: privatise_count(val, epsilon=epsilon, sensitivity=sensitivity)
        for key, val in counts.items()
    }


def privatise_screen_time_series(
    series: list[dict[str, Any]],
    daily_limit_minutes: float = 90.0,
    epsilon: float = DP_EPSILON,
) -> list[dict[str, Any]]:
    """Add Laplace noise to each day's `minutes` in a screen-time series.

    Uses **parallel composition** (each day is a disjoint partition of the
    dataset), so total ε = epsilon regardless of the number of days.

    The sensitivity is `daily_limit_minutes` because that is the maximum
    contribution any single user can make to the daily total (capped by design).

    Clamps result to [0, daily_limit_minutes * 3] to avoid nonsensical values.

    Parameters
    ----------
    series:
        List of ``{"date": "YYYY-MM-DD", "minutes": float}`` dicts.
    daily_limit_minutes:
        The user's configured daily screen-time cap (Δf upper bound).
    epsilon:
        Privacy budget for this query.
    """
    noised = []
    upper = daily_limit_minutes * 3  # reasonable ceiling
    for entry in series:
        raw = float(entry.get("minutes", 0.0))
        noisy = raw + laplace_noise(daily_limit_minutes, epsilon)
        noisy = max(0.0, min(upper, noisy))
        noised.append({**entry, "minutes": round(noisy, 2)})
    return noised


def privatise_vector(
    vector: list[float],
    sensitivity: float = 1.0,
    epsilon: float = DP_EPSILON,
    delta: float = DP_DELTA,
) -> list[float]:
    """Add Gaussian noise to a high-dimensional vector (e.g. user embedding).

    The Gaussian mechanism is preferred over Laplace for vectors because it
    achieves better utility in high dimensions (concentrated noise).

    After adding noise the vector is L2-normalised so it remains on the unit
    sphere (consistent with cosine-similarity based retrieval).

    Parameters
    ----------
    vector:
        The original embedding as a list of floats.
    sensitivity:
        L2 sensitivity of the vector (1.0 for unit-normalised embeddings).
    epsilon, delta:
        (ε, δ) privacy parameters.
    """
    sigma = gaussian_noise_scale(sensitivity, epsilon, delta)
    arr = np.array(vector, dtype=np.float64)
    noise = np.random.normal(loc=0.0, scale=sigma, size=arr.shape)
    noisy = arr + noise

    # Re-normalise to keep on unit sphere
    norm = np.linalg.norm(noisy)
    if norm > 0:
        noisy = noisy / norm

    return noisy.tolist()


def privatise_engagement_lists(
    views: list[float],
    likes: list[float],
    epsilon: float = DP_EPSILON,
    sensitivity: float = 1.0,
) -> tuple[list[float], list[float]]:
    """Add Laplace noise to parallel lists of engagement counts.

    Uses parallel composition: the views and likes lists are independent
    queries over disjoint attributes, so each costs ε (not 2ε).

    Used in bias audit before computing Pearson correlation.
    """
    noisy_views = [
        max(0.0, v + laplace_noise(sensitivity, epsilon)) for v in views
    ]
    noisy_likes = [
        max(0.0, lk + laplace_noise(sensitivity, epsilon)) for lk in likes
    ]
    return noisy_views, noisy_likes


# ── Utility: DP budget summary ────────────────────────────────────────────────

def budget_summary() -> dict:
    """Return the current DP configuration for logging/transparency."""
    return {
        "mechanism": "Laplace (scalars/counts) + Gaussian (vectors)",
        "epsilon": DP_EPSILON,
        "delta": DP_DELTA,
        "laplace_scale_per_unit_sensitivity": round(1.0 / DP_EPSILON, 4),
        "gaussian_sigma_per_unit_sensitivity": round(
            gaussian_noise_scale(1.0, DP_EPSILON, DP_DELTA), 4
        ),
        "note": (
            "Parallel composition used for disjoint partitions "
            "(screen-time days, content categories, engagement attributes). "
            "Total ε = DP_EPSILON per query regardless of partition size."
        ),
    }
