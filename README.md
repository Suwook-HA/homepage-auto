# Auto-updating Personal Homepage

Next.js template for a personal homepage with automatic content refresh.

## Features

- Profile management UI: `/admin`
- Periodic content refresh:
  - IT standardization article ranking (Top 10)
  - AI/standardization/latest-tech video ranking (Top 10 by views with relevance filtering)
  - GitHub projects from profile user (Top 10)
  - Photos (Google Photos Picker selection + keyword filter)
- Curated professional highlight cards from verified web sources
- Refresh status endpoint and run logs
- Cron workflow for unattended refresh
- Optional admin authentication with session cookies

## Quick Start

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Publish with GitHub

This app uses Next.js API routes, OAuth callbacks, and writable JSON data files.
Because of that, GitHub Pages is not suitable for full-feature deployment.

Recommended production path:

1. Keep source in GitHub.
2. Connect the GitHub repo to a Node.js host (Render, Railway, Fly.io, VM, etc.).
3. Set build and start commands:
   - Build: `npm ci && npm run build`
   - Start: `npm run start`
4. Mount a persistent volume and set `DATA_DIR` to that mount path.
5. Add environment variables from `.env.example`.
6. If using Google Photos Picker, register OAuth redirect URI:
   - `https://<your-domain>/api/google-photos/oauth/callback`

Render quick example (GitHub auto-deploy):

- New Web Service -> Connect repo `Suwook-HA/homepage-auto`
- Runtime: Node
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Persistent disk mount path: `/var/data`
- Environment variable: `DATA_DIR=/var/data`

## Admin Access

Set these values in `.env.local` to enable admin login protection:

```bash
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=long-random-secret
ADMIN_SESSION_HOURS=24
```

Then use:

- Login page: `/admin/login`
- Protected admin page: `/admin`

If `ADMIN_PASSWORD` is empty, admin auth is disabled.

## Refresh Security

Manual refresh and profile updates require admin session.

For cron-driven refresh, configure:

```bash
CRON_SECRET=change-me
```

Call refresh endpoint:

```bash
POST /api/refresh?trigger=cron
Header: x-cron-secret: <CRON_SECRET>
```

## GitHub Actions Cron

Workflow file: `.github/workflows/refresh-content.yml`

Required repository secrets:

- `HOMEPAGE_URL` (example: `https://your-domain.com`)
- `CRON_SECRET` (recommended)

Default schedule: every 3 hours.

## Google Photos Picker (Optional)

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

How to use:

1. Open `/admin`
2. Click `Connect Google Photos` and complete OAuth
3. Click `Open Picker` and select photos
4. Imported selections are stored locally and used by homepage refresh

Notes:

- `filterKeyword` is matched against picked file names
- Picker mode uses user-selected items, not full-library crawling

Keyword filtering:

- Photos are filtered by `googlePhotos.filterKeyword` (default: `하수욱`)
- Match is based on picked item `filename`
- Google Photos APIs do not expose direct face-name search in this app

## Ranking APIs (Optional but Recommended)

```bash
YOUTUBE_API_KEY=
GITHUB_TOKEN=
```

- `YOUTUBE_API_KEY`: required for robust view-count sorting on videos
- `GITHUB_TOKEN`: optional, improves GitHub API rate limits

## API Endpoints

- `GET /api/content`
- `GET /api/profile` (admin auth required)
- `POST /api/profile` (admin auth required)
- `POST /api/refresh` (admin auth or cron secret)
- `GET /api/refresh/status`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`

## Data Files

- Runtime data directory: `DATA_DIR` (default: `./data`)
- Main files:
  - `profile.json`
  - `content.json`
  - `refresh-log.json` (stores last 100 runs)
  - `promotion-highlights.json`
  - `google-photos-oauth.json` (created after OAuth)
  - `google-photos-picked.json` (created after Picker import)

## Manual Refresh Script

```powershell
./scripts/refresh.ps1 -BaseUrl "https://your-domain.com" -Secret "your-secret"
```
