"""YouTube Data API v3 + Pexels Video API ingestion service.

Fetches short-form videos, creates Creator + Post records, and generates
content embeddings via Hugging Face API.  All fetched content is cached
in PostgreSQL so API quotas are not wasted.
"""

from __future__ import annotations

import logging
import os
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.post import Creator, Post
from services.embedding_service import get_content_embedding_text, get_embedding
from services.wellbeing_scorer import score_post

logger = logging.getLogger(__name__)

YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
PEXELS_API_KEY: str = os.getenv("PEXELS_API_KEY", "")

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"
PEXELS_VIDEOS_URL = "https://api.pexels.com/videos/search"

CATEGORIES = [
    "fitness", "travel", "food", "comedy", "art",
    "education", "music", "nature", "technology", "motivation",
    "science", "fashion", "pets", "diy", "gaming",
]


async def ingest_youtube_shorts(
    db: AsyncSession,
    category: str = "education",
    max_results: int = 10,
) -> list[uuid.UUID]:
    """Fetch YouTube Shorts for a category, cache in DB, return new post IDs."""
    if not YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY not set — skipping YouTube ingestion")
        return []

    created_ids: list[uuid.UUID] = []

    async with httpx.AsyncClient(timeout=30) as client:
        # Search for shorts
        search_params = {
            "part": "snippet",
            "q": f"{category} shorts",
            "type": "video",
            "videoDuration": "short",
            "maxResults": max_results,
            "key": YOUTUBE_API_KEY,
            "order": "relevance",
        }
        resp = await client.get(YOUTUBE_SEARCH_URL, params=search_params)
        resp.raise_for_status()
        items = resp.json().get("items", [])

        for item in items:
            video_id = item["id"].get("videoId")
            if not video_id:
                continue

            # Skip if already cached
            existing = await db.execute(
                select(Post).where(Post.external_id == video_id)
            )
            if existing.scalar_one_or_none():
                continue

            snippet = item.get("snippet", {})
            channel_id = snippet.get("channelId", "")
            title = snippet.get("title", "")
            description = snippet.get("description", "")
            thumbnail = (
                snippet.get("thumbnails", {}).get("high", {}).get("url")
                or snippet.get("thumbnails", {}).get("default", {}).get("url", "")
            )
            tags_raw = snippet.get("tags", [])

            # Fetch or create creator
            creator = await _get_or_create_youtube_creator(db, client, channel_id)

            # Compute wellbeing label
            label, score, detail = score_post(tags_raw, title, description)

            # Generate content embedding
            emb_text = await get_content_embedding_text(
                title, description, tags_raw, category, creator.bio
            )
            embedding = await get_embedding(emb_text)

            post = Post(
                source_api="youtube",
                external_id=video_id,
                creator_id=creator.id,
                title=title,
                description=description,
                video_url=f"https://www.youtube.com/shorts/{video_id}",
                thumbnail_url=thumbnail,
                embed_url=f"https://www.youtube.com/embed/{video_id}",
                tags=tags_raw[:20],
                category=category,
                wellbeing_label=label,
                embedding=embedding,
            )
            db.add(post)
            await db.flush()
            created_ids.append(post.id)

    await db.commit()
    logger.info("Ingested %d YouTube shorts for category=%s", len(created_ids), category)
    return created_ids


async def ingest_pexels_videos(
    db: AsyncSession,
    category: str = "nature",
    max_results: int = 10,
) -> list[uuid.UUID]:
    """Fetch vertical videos from Pexels, cache in DB, return new post IDs."""
    if not PEXELS_API_KEY:
        logger.warning("PEXELS_API_KEY not set — skipping Pexels ingestion")
        return []

    created_ids: list[uuid.UUID] = []

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {"Authorization": PEXELS_API_KEY}
        params = {"query": category, "per_page": max_results, "orientation": "portrait"}
        resp = await client.get(PEXELS_VIDEOS_URL, headers=headers, params=params)
        resp.raise_for_status()
        videos = resp.json().get("videos", [])

        for video in videos:
            ext_id = f"pexels-{video['id']}"

            existing = await db.execute(
                select(Post).where(Post.external_id == ext_id)
            )
            if existing.scalar_one_or_none():
                continue

            # Pick best video file (SD quality)
            video_files = video.get("video_files", [])
            video_url = ""
            for vf in video_files:
                if vf.get("quality") == "sd" and vf.get("width", 0) <= 720:
                    video_url = vf.get("link", "")
                    break
            if not video_url and video_files:
                video_url = video_files[0].get("link", "")

            thumbnail = video.get("image", "")
            user_info = video.get("user", {})
            duration = video.get("duration", 0)

            # Create pexels creator
            creator = await _get_or_create_pexels_creator(db, user_info)

            title = f"{category.title()} — {user_info.get('name', 'Pexels')}"
            description = f"Beautiful {category} video from Pexels"
            tags = [category, "stock_video", "pexels"]

            label, score, detail = score_post(tags, title, description)

            emb_text = await get_content_embedding_text(title, description, tags, category)
            embedding = await get_embedding(emb_text)

            post = Post(
                source_api="pexels",
                external_id=ext_id,
                creator_id=creator.id,
                title=title,
                description=description,
                video_url=video_url,
                thumbnail_url=thumbnail,
                tags=tags,
                category=category,
                wellbeing_label=label,
                duration_seconds=duration,
                embedding=embedding,
            )
            db.add(post)
            await db.flush()
            created_ids.append(post.id)

    await db.commit()
    logger.info("Ingested %d Pexels videos for category=%s", len(created_ids), category)
    return created_ids


async def _get_or_create_youtube_creator(
    db: AsyncSession,
    client: httpx.AsyncClient,
    channel_id: str,
) -> Creator:
    """Fetch YouTube channel info and upsert as a Creator."""
    existing = await db.execute(
        select(Creator).where(Creator.external_id == channel_id)
    )
    creator = existing.scalar_one_or_none()
    if creator:
        return creator

    # Fetch channel details
    name = "YouTube Creator"
    bio = ""
    avatar = ""
    sub_count = 0

    if YOUTUBE_API_KEY:
        params = {
            "part": "snippet,statistics",
            "id": channel_id,
            "key": YOUTUBE_API_KEY,
        }
        resp = await client.get(YOUTUBE_CHANNELS_URL, params=params)
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            if items:
                ch = items[0]
                snippet = ch.get("snippet", {})
                stats = ch.get("statistics", {})
                name = snippet.get("title", name)
                bio = snippet.get("description", "")[:500]
                avatar = snippet.get("thumbnails", {}).get("default", {}).get("url", "")
                sub_count = int(stats.get("subscriberCount", 0))

    creator = Creator(
        external_id=channel_id,
        name=name,
        bio=bio,
        profile_picture_url=avatar,
        subscriber_count=sub_count,
        platform="youtube",
    )
    db.add(creator)
    await db.flush()
    return creator


async def _get_or_create_pexels_creator(
    db: AsyncSession,
    user_info: dict,
) -> Creator:
    """Create or retrieve a Pexels videographer as Creator."""
    ext_id = f"pexels-user-{user_info.get('id', 'unknown')}"

    existing = await db.execute(
        select(Creator).where(Creator.external_id == ext_id)
    )
    creator = existing.scalar_one_or_none()
    if creator:
        return creator

    creator = Creator(
        external_id=ext_id,
        name=user_info.get("name", "Pexels Creator"),
        bio="Pexels videographer",
        profile_picture_url="",
        subscriber_count=0,
        platform="pexels",
    )
    db.add(creator)
    await db.flush()
    return creator
