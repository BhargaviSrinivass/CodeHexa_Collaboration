# CodeHexa

**Where Code Meets Collaboration**

A premium collaborative coding platform — solve problems together in real time with voice, screen sharing, AI mentoring, analytics, and social profiles.

![CodeHexa](frontend/public/logo.png)

## Brand

| Token | Value |
|-------|-------|
| Primary Purple | `#551E9F` |
| Primary Blue | `#1BA3FF` |
| Light BG | `#F8FAFC` / `#FFFFFF` |
| Dark BG | `#0F172A` / `#1E293B` |
| Default theme | **Light** |

## Features

- Auth (JWT + refresh tokens), rooms, Monaco collab, voice, screen share, whiteboard, chat
- AI hints / review / debug / chat / summaries
- **Profile** — heatmap, badges, topics, languages, contests, friends
- Analytics, leaderboard, bookmarks, session history, global search
- Notification center, settings, themes (light / dark / system)
- Production: Helmet, rate limits, health/metrics, Docker, Vercel/Render ready

## Quick Start

```bash
# Postgres (port 5433)
docker compose up postgres -d

# Backend
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:4000  
- Health: http://localhost:4000/health  

> On Windows: stop `npm run dev` before `npx prisma generate` (DLL file lock).

## Deployment

| Layer | Target |
|-------|--------|
| Frontend | Vercel (`frontend/vercel.json`) |
| Backend | Render / Railway (`backend/render.yaml`) |
| Database | Neon PostgreSQL |
| Full stack | `docker compose up --build` |

Set `VITE_API_URL`, `VITE_SOCKET_URL`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`.

## Architecture

```
CodeHexa/
├── backend/          Express + Socket.io + Prisma
│   ├── prisma/       Schema (users, rooms, social, analytics)
│   └── src/
│       ├── routes/   auth, problems, rooms, run, ai, social
│       ├── services/ business logic + AI providers
│       └── socket/   realtime collaboration
├── frontend/         React 19 + Vite + Tailwind + Monaco
│   └── src/
│       ├── pages/    dashboard, profile, room, …
│       ├── components/
│       └── contexts/ Auth, Theme, Socket
└── docker-compose.yml
```

## API (social / profile)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/social/profile` | Current user profile |
| PATCH | `/api/social/profile` | Update bio, college, links |
| GET | `/api/social/analytics` | Analytics dashboard |
| GET | `/api/social/leaderboard` | Rankings |
| GET | `/api/social/search` | Global search |

Socket events: see `backend/src/socket/events.ts`.

## License

MIT
