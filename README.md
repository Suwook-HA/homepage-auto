# Auto-updating Personal Homepage

Next.js template for a personal homepage with automatic content refresh.

## Features

- Profile management UI: `/admin`
- Periodic content refresh:
  - IT standardization article ranking (Top 8, deduplicated)
  - AI/IT industry/latest-tech news video ranking (Top 8 by views)
  - GitHub projects from profile user (Top 10)
  - Photos from Google Photos Picker selections
- Research dashboard with visual analytics
- GitHub Pages deployment (read-only public view)
- Optional admin authentication and cron security

## Quick Start

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Admin Access

Set these values in `.env.local`:

```bash
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=long-random-secret
ADMIN_SESSION_HOURS=24
```

If `ADMIN_PASSWORD` is empty, admin auth is disabled.

## Refresh Security

For API-based cron refresh:

```bash
CRON_SECRET=change-me
```

Endpoint:

```bash
POST /api/refresh?trigger=cron
Header: x-cron-secret: <CRON_SECRET>
```

## GitHub Pages (Read-only Public View)

Workflow: `.github/workflows/deploy-pages.yml`

- Build command: `npm run build:pages`
- Output artifact: `pages-dist/`

Limits on GitHub Pages:

- No `/admin` runtime
- No `/api/*` runtime
- No Google OAuth callback runtime

## Daily Auto Refresh (GitHub Actions)

Workflow: `.github/workflows/refresh-content.yml`

Schedule:

- Once per day at `00:00 UTC` (`09:00 KST`)

Required/Recommended repository secrets:

- `HOMEPAGE_URL` (optional, for server/API mode)
- `CRON_SECRET` (recommended when using API mode)
- `YOUTUBE_API_KEY` (recommended for static mode video ranking)
- `GITHUB_TOKEN` (optional for static mode GitHub API rate limit)

Mode behavior:

- API mode:
  - If `HOMEPAGE_URL` is set to non-`github.io`, workflow calls `/api/refresh`.
- Static mode:
  - If `HOMEPAGE_URL` is empty or points to `github.io`
  - Runs `npm run refresh:static`
  - Updates `data/content.json`
  - Auto-commits refreshed data
  - Builds and deploys GitHub Pages in the same workflow run

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
- Photos are filtered by `googlePhotos.filterKeyword` (default: `하수욱`)
- Picker mode uses selected items (no full-library crawl)

## Ranking APIs (Optional but Recommended)

```bash
YOUTUBE_API_KEY=
GITHUB_TOKEN=
```

- `YOUTUBE_API_KEY`: enables robust video relevance + view sorting
- `GITHUB_TOKEN`: improves GitHub API rate limits

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
  - `refresh-log.json`
  - `promotion-highlights.json`
  - `google-photos-oauth.json`
  - `google-photos-picked.json`

## Utility Scripts

```bash
npm run build:pages
npm run refresh:static
```

PowerShell manual API refresh:

```powershell
./scripts/refresh.ps1 -BaseUrl "https://your-domain.com" -Secret "your-secret"
```
