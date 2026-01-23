# TuneLayer: Server-Side Queries + Neon Auth

## Goal
Move database queries from browser to Netlify functions and integrate Neon Auth with GitHub OAuth for secure, RLS-enabled data access.

## Current State
- **Frontend**: Vue 3 + Vite at `localhost:5176`
- **Database**: Neon PostgreSQL (direct browser access via `@neondatabase/serverless`)
- **Auth**: Google OAuth (implicit flow, client-side token in localStorage)
- **Problem**: Database URL exposed in browser, no RLS
- **Data**: Test data only - can start fresh

## Target Architecture
```
Browser → Netlify Functions → Neon Database (with RLS)
              ↓
         Neon Auth (Google + GitHub providers)
              ↓
         YouTube API (uses Google OAuth token)
```

**Auth Strategy:**
- **Neon Auth** handles user authentication (Google + GitHub providers)
- **Google OAuth** also provides YouTube API access token for imports
- **GitHub OAuth** as alternative login method

---

## Implementation Plan

### Phase 1: Netlify Functions Setup

**Files to create:**
- `netlify.toml` - Netlify configuration
- `netlify/functions/songs.mts` - Songs CRUD API
- `netlify/functions/playlists.mts` - Playlists API
- `netlify/functions/history.mts` - Play history API

**Example function structure:**
```typescript
// netlify/functions/songs.mts
import type { Context, Config } from "@netlify/functions"
import { neon } from '@neondatabase/serverless'

export default async (req: Request, context: Context) => {
  const sql = neon(Netlify.env.get('NEON_DATABASE_URL'))
  // Validate session, query database, return response
}

export const config: Config = { path: "/api/songs" }
```

**Actions:**
1. Create `netlify.toml` with functions directory config
2. Install `@netlify/functions` types
3. Move `VITE_NEON_DATABASE_URL` to Netlify env vars (server-side only)
4. Create API functions for each database operation

### Phase 2: Neon Auth Integration (Google + GitHub)

**Files to modify:**
- `src/stores/auth.js` - Replace custom OAuth with Neon Auth client
- `src/views/Landing.vue` - Update login UI with both provider buttons

**Files to create:**
- `src/services/auth-client.js` - Neon Auth client setup

**Neon Dashboard Setup:**
1. Enable Neon Auth in Neon dashboard
2. **Add GitHub provider:**
   - Create GitHub OAuth App at github.com/settings/developers
   - Callback URL: `https://ep-jolly-term-a1ii1cjm.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth/callback/github`
   - Add Client ID + Secret to Neon
3. **Add Google provider:**
   - Use existing Google OAuth App (or create new)
   - Callback URL: `https://ep-jolly-term-a1ii1cjm.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth/callback/google`
   - Add scopes for YouTube API: `https://www.googleapis.com/auth/youtube.readonly`
   - Add Client ID + Secret to Neon

**Code setup:**
```javascript
// src/services/auth-client.js
import { createAuthClient } from '@neondatabase/neon-js/auth'
export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL)

// Login with provider
authClient.signIn.social({ provider: 'github' })
authClient.signIn.social({ provider: 'google', scopes: ['youtube.readonly'] })
```

**YouTube API Access:**
- When user signs in with Google, store the access token for YouTube API calls
- Import feature uses this token to fetch YouTube playlists/liked videos

### Phase 3: RLS Policies

**File to create:**
- `db/migrations/002_rls_policies.sql`

**SQL to add:**
```sql
-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;

-- Policies using Neon Auth user ID
CREATE POLICY songs_user_policy ON songs
  FOR ALL USING (user_id = auth.user_id());

CREATE POLICY playlists_user_policy ON playlists
  FOR ALL USING (user_id = auth.user_id());

CREATE POLICY play_history_user_policy ON play_history
  FOR ALL USING (user_id = auth.user_id());
```

### Phase 4: Frontend Refactor

**Files to modify:**
- `src/services/neon.js` → `src/services/api.js` - Replace direct DB calls with fetch to Netlify functions
- `src/stores/library.js` - Update to use new API service
- `src/stores/auth.js` - Use Neon Auth session management
- `.env.local` - Remove `VITE_NEON_DATABASE_URL`, add `VITE_NEON_AUTH_URL`

**New API service pattern:**
```javascript
// src/services/api.js
export const api = {
  async getSongs() {
    const res = await fetch('/api/songs', {
      headers: { 'Authorization': `Bearer ${getSessionToken()}` }
    })
    return res.json()
  }
}
```

---

## Files Summary

| Action | File |
|--------|------|
| Create | `netlify.toml` |
| Create | `netlify/functions/songs.mts` |
| Create | `netlify/functions/playlists.mts` |
| Create | `netlify/functions/history.mts` |
| Create | `src/services/auth-client.js` |
| Create | `src/services/api.js` |
| Create | `db/migrations/002_rls_policies.sql` |
| Modify | `src/stores/auth.js` |
| Modify | `src/stores/library.js` |
| Modify | `src/views/Landing.vue` |
| Modify | `.env.local` |
| Modify | `package.json` (add deps) |

---

## Verification

1. **Local dev**: Run `netlify dev` - functions should work at `/api/*`
2. **Auth flow**: Click "Sign in with GitHub" → redirects to GitHub → callback → session created
3. **Data access**: Dashboard loads songs from `/api/songs` (not direct DB)
4. **RLS test**: Try to access another user's data → should be blocked
5. **Console**: No more Supabase/browser SQL warning

---

## Dependencies to Install

```bash
npm install @netlify/functions @neondatabase/neon-js
npm install -D @netlify/vite-plugin
```

---

## Notes

- **User ID**: Start fresh with Neon Auth user IDs (test data only, no migration needed)
- **Session handling**: Neon Auth session token passed in Authorization header to Netlify functions
- **YouTube Import**: Requires Google sign-in to get YouTube API token (stored separately from Neon Auth session)
