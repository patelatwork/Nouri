"""Hugging Face Inference API wrapper for sentence embeddings.

Uses sentence-transformers/all-MiniLM-L6-v2 via the HF Inference router
to produce 384-dim vectors for both user profiles and content descriptions.

Differential Privacy
--------------------
User profile embeddings are privatised with Gaussian noise before storage
(DP-SGD spirit applied at the vector level). This protects against
membership inference attacks where an attacker with access to the stored
embedding tries to infer which specific interests/videos the user has.

Content embeddings (posts) are NOT noised — they describe public content,
not private user behaviour.
"""

import logging
import os

import httpx
import numpy as np

from services.differential_privacy import privatise_vector

logger = logging.getLogger(__name__)

HF_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# New HF Inference router URL (replaces the deprecated /pipeline/ endpoint)
HF_URL = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL}/pipeline/feature-extraction"

EMBEDDING_DIM = 384


async def get_embedding(text: str) -> list[float]:
    """Call HF Inference API to get a 384-dim embedding for *text*.

    Falls back to a zero vector if the API call fails for any reason.
    """
    if not HF_API_KEY:
        logger.warning("HUGGINGFACE_API_KEY not set — returning zero vector")
        return [0.0] * EMBEDDING_DIM

    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": [text], "options": {"wait_for_model": True}}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(HF_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        # Router returns [[float, …]] for a single-item inputs list
        if isinstance(data, list) and isinstance(data[0], list):
            embedding = data[0]
        else:
            embedding = data

        return embedding[:EMBEDDING_DIM]
    except Exception as exc:
        logger.warning("HF embedding API failed (%s) — returning zero vector", exc)
        return [0.0] * EMBEDDING_DIM


async def get_user_embedding_text(interests: list[str], bio: str | None = None) -> str:
    """Build a natural-language sentence from user profile data."""
    parts = []
    if bio:
        parts.append(bio)
    if interests:
        parts.append(f"I am interested in {', '.join(interests)}")
    return ". ".join(parts) if parts else "general interests"


async def get_content_embedding_text(
    title: str,
    description: str | None,
    tags: list[str],
    category: str,
    creator_bio: str | None = None,
) -> str:
    """Build a natural-language sentence from post metadata."""
    parts = [title]
    if description:
        parts.append(description[:300])
    if tags:
        parts.append(" ".join(tags[:10]))
    parts.append(category)
    if creator_bio:
        parts.append(creator_bio[:200])
    return " ".join(parts)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Pure-numpy cosine similarity (used in re-ranking only)."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


async def privatise_user_embedding(raw_embedding: list[float]) -> list[float]:
    """Apply Gaussian differential privacy noise to a user profile embedding.

    This is the *only* function that should be called when storing a user
    embedding. Content embeddings (posts) are public data and should NOT
    go through this function.

    The Gaussian mechanism is chosen over Laplace because:
    - It achieves tighter bounds in high dimensions (384-dim vectors).
    - It preserves the L2-norm structure needed for cosine similarity.
    - It satisfies (ε, δ)-DP which is standard for vector mechanisms.

    The noised vector is L2-normalised so it remains compatible with
    pgvector cosine-distance queries.

    Parameters
    ----------
    raw_embedding:
        The 384-dim embedding from the HuggingFace API (unit-normalised).

    Returns
    -------
    list[float]
        A DP-noised, L2-normalised 384-dim embedding.
    """
    return privatise_vector(
        raw_embedding,
        sensitivity=1.0,   # unit-sphere embeddings have L2 sensitivity ≤ 1
    )
