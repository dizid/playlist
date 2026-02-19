# TuneCraft

A personal music taste layer on top of YouTube. Own your metadata (ratings, play counts, tags) while YouTube handles playback.

## What It Does

- **Import** music from YouTube playlists, Shazam, Google Takeout
- **Rate** songs: Love, Like, Neutral, Dislike, Block
- **Smart Playlists**: Auto-generated Top 50, Fresh Loves, Heavy Rotation
- **Discover**: AI-powered recommendations based on your taste

## Tech Stack

- **Frontend**: Vue 3 + Pinia + Tailwind CSS v4
- **Backend**: Netlify Functions
- **Database**: Neon (PostgreSQL)
- **Auth**: Firebase Auth (Google/GitHub)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run dev server (Vite + Netlify plugin)
npm run dev
```

Open http://localhost:5173

## Environment Variables

Copy `.env.example` and fill in your values:

```
cp .env.example .env.local
```

Key variables: Firebase Auth config (frontend + admin), Neon database URL, Google OAuth client ID for YouTube. See `.env.example` for the full list.

## Project Structure

```
src/
├── views/           # Pages (Landing, Dashboard, Library, Import, Settings)
├── components/      # Reusable UI (Navigation, SongCard)
├── stores/          # Pinia state (auth, library)
├── services/        # API client, auth client
netlify/functions/   # Serverless API (songs, playlists, history)
db/migrations/       # Database schema
```

## Philosophy

- **Companion, not player**: TuneCraft manages your taste data; YouTube plays the music
- **Own your data**: All metadata stored in your Neon database
- **Smart over manual**: Rules-based playlists beat manual curation
