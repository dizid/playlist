# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TuneLayer** - A personal music taste layer on top of YouTube. Users own their metadata (ratings, play counts, tags) while YouTube handles playback. The app is a companion/dashboard, not a player replacement.

Core concept: Playlists are the wrong abstraction. This solves a **taste data problem** by consolidating music preferences from YouTube, Shazam, and Spotify into smart, auto-generated playlists.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Production build
npm run preview  # Preview production build

# Database migrations
node scripts/run-migration.js  # Run migrations on Neon
```

## Architecture

### Tech Stack
- **Frontend**: Vue 3 (Composition API) + Pinia + Vue Router
- **Styling**: Tailwind CSS v4 (CSS-based config with `@theme`)
- **Database**: Neon (serverless PostgreSQL)
- **Auth**: Google OAuth (for YouTube API access)
- **Build**: Vite

### Key Directories
```
src/
├── views/          # Page components (Landing, Dashboard, Library, Import, Discovery, Settings)
├── components/     # Reusable components (Navigation, SongCard)
├── stores/         # Pinia stores (auth, library)
├── services/       # External service clients (neon.js)
db/migrations/      # PostgreSQL schema files
scripts/            # Utility scripts (run-migration.js)
```

### Data Flow
1. User authenticates via Google OAuth → gets YouTube API access token
2. Token stored in localStorage (`tunelayer_token`, `tunelayer_user`)
3. User ID (Google email) used for all database queries
4. Songs/playlists fetched from Neon via `@neondatabase/serverless`

### Neon Database Pattern
The Neon client uses **tagged template literals** (not string queries):
```javascript
// Correct
sql`SELECT * FROM songs WHERE user_id = ${userId}`

// Wrong - will throw error
sql("SELECT * FROM songs WHERE user_id = $1", [userId])
```

### Database Schema (3 tables)
- **songs**: Library with ratings (loved/liked/neutral/disliked/blocked), play_count, popularity, genres[], moods[]
- **playlists**: Smart playlists with JSONB rules or manual song_ids[]
- **play_history**: Individual play events for stats

### Auth Flow
1. Landing page → "Sign in with Google" → Google OAuth redirect
2. Callback returns `#access_token` in URL hash
3. `App.vue` detects hash, calls `auth.handleCallback()`
4. Fetches user info from Google, stores in localStorage
5. Router guard checks `tunelayer_token` for protected routes

## Design System (v0.1 - Keep This Style)

Dark theme with zinc/indigo palette:
- Background: `bg-zinc-950` (page), `bg-zinc-900` (cards)
- Borders: `border-zinc-800`
- Primary: `bg-indigo-600` (buttons, active states)
- Text: `text-white` (primary), `text-zinc-400` (secondary), `text-zinc-500` (muted)

Rating colors:
- Loved: `text-red-500` (❤️)
- Liked: `text-green-500` (👍)
- Neutral: `text-zinc-500` (➖)

Card pattern: `bg-zinc-900 border border-zinc-800 rounded-xl p-6`

## Environment Variables

Required in `.env.local`:
```
VITE_NEON_DATABASE_URL=postgresql://...
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
```

## Key Design Decisions

1. **Companion app, not player**: Click "Play" opens YouTube.com. TuneLayer manages data, YouTube handles playback.
2. **Local-first mindset**: Data in Neon but designed for eventual offline support.
3. **Smart playlists over manual**: Rules-based playlists (Top 50, Fresh Loves, Heavy Rotation) replace manual organization.
4. **Multi-source import**: YouTube playlists, Shazam CSV, Google Takeout watch history.
5. **Popularity scoring**: Weighted formula using play_count, completion_rate, rating, recency.


## Preferences

- Act like a senior developer
- Write complete, working code - no mocks, stubs, or TODOs
- Use clear comments in code
- Keep existing working code intact when adding features
- Modular, maintainable structure