# 🌿 Nouri — Ethical Social Media Platform

An ethically-designed short-form video platform that demonstrates **Responsible AI** principles in a real working product. Unlike conventional social media, Nouri actively optimises for user **wellbeing**, **content diversity**, **algorithmic transparency**, and **privacy** — not engagement addiction.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Two-Tower Recommendations** | Personalised feed via pre-trained Two-Tower retrieval + responsible re-ranking |
| **"Why Am I Seeing This?"** | Per-post explainability with one-click feedback controls |
| **Wellbeing Predictor** | Every post labelled beneficial / neutral / harmful with visual indicators |
| **Beauty Bias Elimination** | Beauty scores stored for audit only — **never** used in ranking |
| **Diversity Enforcement** | Hard constraints ensure category, creator, and serendipity diversity |
| **Screen Time Controls** | Soft/hard break prompts, no autoplay, no infinite scroll, bedtime mode |
| **Privacy Tiers** | Users choose Standard / Privacy Plus / Full privacy levels |
| **Transparent Dashboard** | Screen time charts, content mix, diversity score, interest editor |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 · Tailwind CSS · shadcn/ui · Framer Motion · Recharts |
| State | Zustand · React Query |
| Backend | FastAPI (async) · SQLAlchemy · Alembic |
| Database | PostgreSQL + pgvector |
| Cache | Redis |
| Auth | JWT + bcrypt |
| Embeddings | Hugging Face Inference API (`all-MiniLM-L6-v2`) |
| Video Sources | YouTube Data API v3 · Pexels Video API |
| Video Uploads | Cloudinary |
| Deployment | Docker Compose |

## 🚀 Quick Start

```bash
# 1 — Clone and configure
cp .env.example .env
# Edit .env with your API keys

# 2 — Start everything
docker compose up --build

# 3 — Open the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
```

## 📁 Project Structure

```
Nouri/
├── frontend/          # Next.js 14 App Router
│   ├── app/           # Pages (auth, feed, dashboard, etc.)
│   ├── components/    # UI components (feed, dashboard, onboarding)
│   └── lib/           # API client, Zustand store, utilities
├── backend/           # FastAPI
│   ├── models/        # SQLAlchemy models
│   ├── routers/       # API route handlers
│   ├── services/      # Business logic & ML services
│   └── schemas/       # Pydantic request/response schemas
├── docker-compose.yml
└── .env.example
```

## 📌 Ethical Design Principles

1. **No beauty bias in ranking** — `beauty_score` exists solely for audit transparency
2. **No autoplay** — users actively choose what to watch
3. **No infinite scroll** — paginated feed with explicit "Load More"
4. **Wellbeing indicators** on every reel card
5. **Content warnings** gate harmful content behind an active opt-in
6. **Full explainability** — every recommendation can be inspected
7. **pgvector for similarity search** — production-grade vector retrieval
8. **Pre-trained Two-Tower model** — inference only, no training loop

## 📄 License

MIT
