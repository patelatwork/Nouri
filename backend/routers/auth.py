"""Authentication router — signup and login."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import create_access_token, hash_password, verify_password
from database import get_db
from models.user import User, UserEmbedding, UserInterest, UserPreference
from schemas.user import LoginRequest, SignupRequest, TokenResponse, UserPublic
from services.embedding_service import get_embedding, get_user_embedding_text

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check uniqueness
    existing = await db.execute(
        select(User).where((User.username == body.username) | (User.email == body.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username or email already taken")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        age=body.age,
        privacy_tier=body.privacy_tier,
        daily_limit_minutes=body.daily_limit_minutes,
    )
    db.add(user)
    await db.flush()

    # Create interests
    for cat in body.interests:
        db.add(UserInterest(user_id=user.id, category=cat, score=1.0))

    # Create default preferences
    db.add(UserPreference(user_id=user.id))

    # Generate user embedding from interests (best-effort — fall back to zeros)
    try:
        emb_text = await get_user_embedding_text(body.interests)
        emb_vector = await get_embedding(emb_text)
    except Exception:
        emb_vector = [0.0] * 384
    db.add(UserEmbedding(user_id=user.id, embedding=emb_vector))

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )
