# Vee Urban Vogue Growth OS — Live Deployment Guide

## Your Supabase Project

| Detail | Value |
|--------|-------|
| Project Name | vee-growth-os |
| Project ID | `iiufbcxbmgnmzxehnrcg` |
| URL | `https://iiufbcxbmgnmzxehnrcg.supabase.co` |
| Region | eu-west-1 (Ireland) |
| Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpdWZiY3hibWdubXp4ZWhucmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Mjg0NDcsImV4cCI6MjA4ODMwNDQ0N30.KW4O4zJYv0LY_j4pB8XAAZFzVVW596H8rO0QsXx8wwA` |

## Database Tables Created (10 total)

| Table | Purpose | RLS |
|-------|---------|-----|
| `clients` | Pipeline CRM — name, source, stage, notes | ✅ |
| `growth_memory` | Business insights — category, insight, impact_score | ✅ |
| `timeline_events` | Business history — type, title, description, date | ✅ |
| `opportunities` | Lead intelligence — username, event, intent_score | ✅ |
| `events` | Event radar — weddings, birthdays, aso-ebi tracking | ✅ |
| `orders` | Revenue — tier, count, month (unique per user/tier/month) | ✅ |
| `ai_cache` | AI outputs — briefings, decisions, weekly focus (24hr TTL) | ✅ |
| `content_calendar` | Generated weekly content plans (JSONB) | ✅ |
| `completed_tasks` | Daily task completion tracking | ✅ |
| `growth_metrics` | Daily growth scores (unique per user/date) | ✅ |

All tables have Row Level Security enabled. Every query is scoped to `auth.uid()`.

---

## Step-by-Step: Make It Live

### 1. Create the React project

```bash
npm create vite@latest vee-growth-os -- --template react
cd vee-growth-os
npm install @supabase/supabase-js
```

### 2. Set up environment variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://iiufbcxbmgnmzxehnrcg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpdWZiY3hibWdubXp4ZWhucmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Mjg0NDcsImV4cCI6MjA4ODMwNDQ0N30.KW4O4zJYv0LY_j4pB8XAAZFzVVW596H8rO0QsXx8wwA
```

### 3. Set up file structure

```
src/
├── services/
│   └── supabase.js          ← Supabase service layer (provided)
├── store/
│   └── integration.jsx      ← Updated StoreProvider + AuthGate (provided)
├── App.jsx                  ← The V4 Growth OS component
└── main.jsx                 ← Vite entry point
```

### 4. Copy the files

1. Copy `supabase.js` into `src/services/`
2. Copy the V4 JSX app into `src/App.jsx`
3. Apply the integration changes from `integration.jsx`:
   - Replace the existing `StoreProvider` function
   - Add the `AuthGate` component
   - Update the root export to wrap `AppShell` in `AuthGate`
   - Add the imports from `supabase.js` at the top

### 5. Create Vera's account

Open the Supabase dashboard:
https://supabase.com/dashboard/project/iiufbcxbmgnmzxehnrcg/auth/users

Click "Add user" and create:
- Email: okwaravera18@gmail.com
- Password: (set a secure password)

Or let Vera sign up through the app's auth screen.

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 7. Custom domain (optional)

Point a domain like `growth.veeurbanvogue.com` to your Vercel deployment.

---

## How the Integration Works

### Data Flow

```
User Action (e.g. "Add Client")
    ↓
1. dispatch({ type: "ADD_CLIENT" })     ← instant UI update
    ↓
2. await ClientsDB.add(client)          ← persists to Supabase
```

Every action follows this pattern — **optimistic UI** (updates the screen instantly) then **background persistence** (saves to database). If the user refreshes the page, `hydrateStore()` loads everything back from Supabase.

### Auth Flow

```
App Loads
    ↓
StoreProvider checks for existing session
    ↓
No session → Show AuthGate (login screen)
    ↓
Session found → hydrateStore() loads all data → Show AppShell
```

### AI Feature Flow

```
User clicks "Generate Briefing"
    ↓
AIService.call() → Anthropic API → returns JSON
    ↓
1. dispatch(SET_AI_BRIEFING)     ← shows in UI
2. AICacheDB.set("briefing")     ← cached in DB for 24hrs
    ↓
Next page load: hydrateStore() checks ai_cache
    ↓
Cache hit (< 24hrs) → loads from DB (no API call)
Cache miss → user generates fresh
```

---

## Architecture Map

```
┌─────────────────────────────────────────────────┐
│  REACT APP (V4)                                 │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Welcome  │  │ Snapshot │  │ Strategy │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  11 Tab Modules (Command, Pipeline,     │   │
│  │  Leads, Radar, Chat, Content, Revenue,  │   │
│  │  Report, Strategy, Memory, Timeline)    │   │
│  └──────────────────────────────────────────┘   │
│                    │                             │
│          ┌────────┴────────┐                    │
│          │  Store (Reducer) │                    │
│          └────────┬────────┘                    │
│                   │                              │
│     ┌─────────────┼─────────────┐               │
│     │             │             │               │
│  ┌──┴──┐    ┌────┴────┐   ┌───┴───┐           │
│  │ Auth │    │Supabase │   │  AI   │           │
│  │ Svc  │    │   DB    │   │ Svc   │           │
│  └──┬──┘    └────┬────┘   └───┬───┘           │
└─────┼────────────┼────────────┼──────────────────┘
      │            │            │
      ▼            ▼            ▼
  Supabase     Supabase     Anthropic
   Auth        Postgres       API
```

---

## What Happens When Vera Opens the App

1. **Splash screen** → "Built for Vera Chioma"
2. **Auth check** → session found (or login screen)
3. **Hydrate** → all 10 tables loaded into store in parallel
4. **Welcome** → "Good morning, Vera 👋"
5. **Snapshot** → real pipeline count, real revenue, real insights
6. **Strategy** → AI decision from cache or fresh generation
7. **Tabs** → all data persisted, survives refresh/close/reopen

Everything she enters is saved permanently. The system remembers.
