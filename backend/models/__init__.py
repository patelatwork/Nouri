"""SQLAlchemy models package — import all models so Alembic sees them."""

from models.interaction import Interaction, WatchHistory  # noqa: F401
from models.post import Creator, Post  # noqa: F401
from models.user import (  # noqa: F401
    ScreenTime,
    User,
    UserEmbedding,
    UserInterest,
    UserPreference,
)
from models.wellbeing import WellbeingFeedback  # noqa: F401
