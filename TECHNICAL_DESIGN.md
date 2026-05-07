# Beer Mile Betting App — Technical Design Doc

> **Status:** Final
> **Reference:** See `SPEC.md` for the product specification this document implements.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Authentication & Sessions](#4-authentication--sessions)
5. [Database Schema](#5-database-schema)
6. [Betting Mechanics](#6-betting-mechanics)
7. [API Design](#7-api-design)
8. [Real-Time Architecture](#8-real-time-architecture)
9. [Frontend Architecture](#9-frontend-architecture)
10. [UI & Design System](#10-ui--design-system)
11. [Admin Tooling](#11-admin-tooling)
12. [Deployment & Infrastructure](#12-deployment--infrastructure)
13. [Security Considerations](#13-security-considerations)
14. [Error Handling & Edge Cases](#14-error-handling--edge-cases)
15. [Potential Extensions](#15-potential-extensions)

---

## 1. System Overview

The Beer Mile Betting App is a mobile-first web application that lets ~50 users create prediction markets and place virtual-currency bets on outcomes of a Beer Mile race. All operations use **Beer Bucks** (virtual currency with no monetary value). There is no real money involved.

**Key constraints driving all technical decisions:**
- ~40–50 concurrent users at peak (during the live event)
- Mobile-first, accessed via browser on phones — no native app required
- Zero hosting cost target
- Production-grade reliability for a single event window (a few hours)
- Real-time odds updates visible to all connected users

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend framework | **Next.js 14** (App Router) | Full-stack React, excellent free Vercel hosting, server components reduce client JS |
| Styling | **Tailwind CSS** | Mobile-first utility classes, fast to write |
| Hosting | **Vercel** (free tier) | GitHub-connected auto-deploy, global CDN, serverless functions included |
| Database | **Supabase** (free tier) — PostgreSQL | Managed Postgres + built-in Realtime + generous free limits |
| Real-time | **Supabase Realtime** | WebSocket broadcast of DB row changes; no separate infrastructure needed |
| Session management | **`iron-session`** | Lightweight encrypted httpOnly cookie sessions; no external auth provider needed |
| Password hashing | **`bcryptjs`** | Hash the 4-digit PIN before storage |
| Language | **TypeScript** | Type safety across frontend + API routes |

### Free Tier Limits vs. Expected Usage

| Resource | Vercel Free Limit | Expected Usage |
|---|---|---|
| Bandwidth | 100 GB/month | < 1 GB |
| Serverless invocations | 100,000/month | < 5,000 (single event) |
| Serverless function duration | 10s max | All routes complete in < 500ms |

| Resource | Supabase Free Limit | Expected Usage |
|---|---|---|
| Database size | 500 MB | < 5 MB |
| Monthly active users | 50,000 | ~50 |
| Realtime concurrent connections | 200 | ~50 |
| Egress | 2 GB | < 100 MB |

> ⚠️ **One known risk:** Supabase free projects are **paused after 7 days of inactivity**. Ensure the project is active and visited in the week before the event. Alternatively, pay $25 for one month of Supabase Pro to eliminate this risk entirely.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  User's Phone Browser               │
│                                                     │
│  Next.js React App (mobile-first)                   │
│  - Renders pages (SSR + client components)          │
│  - Makes API calls to /api/* routes                 │
│  - Subscribes to Supabase Realtime (read-only)      │
└──────────────┬──────────────────────┬───────────────┘
               │ HTTPS (API calls)    │ WebSocket
               ▼                      ▼
┌─────────────────────┐   ┌──────────────────────────┐
│   Vercel            │   │   Supabase Realtime       │
│                     │   │   (anon key, read-only    │
│  Next.js App Router │   │    subscription to        │
│  - Page rendering   │   │    markets table)         │
│  - /api/* routes    │   └──────────────────────────┘
│    (serverless fns) │                │
└──────────┬──────────┘                │
           │ Service role key          │ Postgres NOTIFY
           ▼                          ▼
┌──────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                   │
│  - users, events, categories, markets, trades tables │
└──────────────────────────────────────────────────────┘
```

### Key architectural decisions

**All writes go through Next.js API routes, never directly from the client to Supabase.**
- API routes authenticate the request (session cookie) before touching the DB
- API routes use the Supabase **service role key** (server-only, never exposed to the browser)
- This means we don't need to configure Supabase Row Level Security (RLS), simplifying the setup considerably

**The client uses the Supabase anon key only for Realtime subscriptions.**
- Realtime subscriptions are read-only and subscribe to the `markets` table
- No sensitive data lives in `markets` — just questions, pool totals, and status
- The anon key is intentionally public; this is safe

---

## 4. Authentication & Sessions

### Login Flow

Users authenticate with: **first name + last initial + 4-digit PIN**

```
First visit (registration):
  1. User enters: first_name, last_initial, pin (4 digits)
  2. POST /api/auth/register
     - Check name+initial not already taken
     - Hash PIN with bcrypt (cost factor 10)
     - Insert user row (balance = 500 Beer Bucks, role = 'participant')
     - Create encrypted session cookie (iron-session)
  3. Redirect to home

Return visit (same device):
  - Session cookie is present → automatically authenticated, no action needed

Return visit (new device):
  1. User enters: first_name, last_initial, pin
  2. POST /api/auth/login
     - Look up user by (first_name, last_initial)
     - bcrypt.compare(pin, stored_hash)
     - If match → create session cookie
     - If no match → return 401
```

### Session Implementation

Using `iron-session` with a `SESSION_SECRET` environment variable (min 32 chars, stored in Vercel env vars).

```typescript
// Session shape
interface SessionData {
  userId: string;
  displayName: string; // "Katherine W."
  role: 'participant' | 'admin';
}
```

- Sessions are stored in an **httpOnly, encrypted cookie** — not accessible to JavaScript on the client
- Cookie max age: 7 days (covers the event window comfortably)
- All API routes that require authentication call a `getSession()` helper and return 401 if no valid session

### Name Collision Handling

Because the identifier is (first_name, last_initial), two users with the same combination (e.g., two "Chris M.") cannot both register. The second person to register will see an error: *"That name is already taken — try adding a nickname."*

To resolve this, the registration form will offer an optional **nickname** field. If provided, the identifier becomes (first_name, last_initial, nickname). The UNIQUE constraint in the DB covers all three columns, with nickname defaulting to `NULL` (and NULL treated as distinct in the constraint).

### Admin Role Assignment

Admin role is set directly in the database. Organizers manually set `role = 'admin'` for themselves before the event. There is no admin self-promotion UI (by design).

---

## 5. Database Schema

All tables live in a single Supabase PostgreSQL project.

### `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    TEXT NOT NULL,
  last_initial  CHAR(1) NOT NULL,
  nickname      TEXT,                         -- optional tiebreaker
  pin_hash      TEXT NOT NULL,                -- bcrypt hash of 4-digit PIN
  beer_bucks    INTEGER NOT NULL DEFAULT 500, -- current balance
  role          TEXT NOT NULL DEFAULT 'participant'
                CHECK (role IN ('participant', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (first_name, last_initial, nickname) -- nickname NULL = no nickname
);
```

### `events`

```sql
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'upcoming'
              CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

For v1, there is exactly one event row. The event ID is stored as an environment variable (`NEXT_PUBLIC_EVENT_ID`) so it doesn't need to be selected in the UI.

### `categories`

```sql
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id),
  name         TEXT NOT NULL,
  emoji        TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_by   UUID REFERENCES users(id),   -- NULL for seeded defaults
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Default categories are seeded at setup time via a migration script:

| emoji | name |
|---|---|
| 🏆 | Winner |
| 🤮 | Vomit / Penalty Lap |
| ⏱ | Finishing Time |
| 🍺 | Beer Performance |
| 🎲 | Misc / Custom |

### `markets`

```sql
CREATE TABLE markets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES events(id),
  category_id         UUID NOT NULL REFERENCES categories(id),
  created_by          UUID NOT NULL REFERENCES users(id),
  question            TEXT NOT NULL,
  resolution_criteria TEXT NOT NULL,
  closing_time        TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','locked','resolved','voided')),
  yes_pool            INTEGER NOT NULL DEFAULT 0,  -- total Beer Bucks on Yes
  no_pool             INTEGER NOT NULL DEFAULT 0,  -- total Beer Bucks on No
  resolved_outcome    TEXT CHECK (resolved_outcome IN ('yes','no', NULL)),
  resolved_at         TIMESTAMPTZ,
  resolved_by         UUID REFERENCES users(id),
  resolution_note     TEXT,                        -- human-readable explanation
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `trades`

```sql
CREATE TABLE trades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   UUID NOT NULL REFERENCES markets(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  side        TEXT NOT NULL CHECK (side IN ('yes','no')),
  amount      INTEGER NOT NULL CHECK (amount >= 5),  -- min 5 Beer Bucks
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_markets_event_id    ON markets(event_id);
CREATE INDEX idx_markets_status      ON markets(status);
CREATE INDEX idx_trades_market_id    ON trades(market_id);
CREATE INDEX idx_trades_user_id      ON trades(user_id);
```

---

## 6. Betting Mechanics

### The Two-Pool Model

Each market maintains two running totals: `yes_pool` and `no_pool`.

**Live implied probability:**
```
yes_probability = yes_pool / (yes_pool + no_pool)
```
When both pools are 0 (no bets yet), display 50% as the default.

**Lazy locking:**

Markets have an optional `closing_time`. Rather than running a background cron job (not available on Vercel's free tier), locking is applied **lazily**: when any API request touches a market whose `closing_time` is in the past and whose status is still `open`, the server atomically sets its status to `locked` before processing the request. From the user's perspective, the market simply appears as locked the first time anyone interacts with it after the deadline. Admins can also lock markets manually at any time regardless of `closing_time`.

**Placing a bet:**
- User selects Yes or No and an amount (in Beer Bucks)
- Amount is added to the corresponding pool
- User's balance is decremented by the same amount
- All of this happens atomically in a single database transaction

**Estimated payout (shown in UI before betting closes):**
```
estimated_payout_if_yes_wins = (amount / (yes_pool + amount)) × (yes_pool + no_pool + amount)
```
This is an estimate — it changes as others bet. The actual payout is calculated at resolution time.

**Resolution:**

When an admin resolves a market as Yes:
```
total_pot = yes_pool + no_pool

For each trade WHERE side = 'yes':
  payout = FLOOR( (trade.amount / yes_pool) × total_pot )
  UPDATE users SET beer_bucks = beer_bucks + payout WHERE id = trade.user_id

UPDATE markets SET status = 'resolved', resolved_outcome = 'yes', ...
```

Rounding: use `FLOOR` to avoid creating Beer Bucks from nothing. Any remainder (due to integer rounding) is simply not distributed — it amounts to at most 1 Beer Buck per market and is acceptable.

**Void resolution:**
All trades for the market are refunded in full (each user gets back their original `trade.amount`). No net gain or loss for anyone.

### Bet Constraints

| Rule | Value |
|---|---|
| Minimum bet per trade | 5 Beer Bucks |
| Maximum bet per trade | 150 Beer Bucks |
| Cumulative cap per market per user | None — a user can place multiple trades on the same market |
| Market creator can bet on own market | ❌ No |
| User can bet on both Yes and No in same market | ✅ Yes (tracked as separate trades) |
| User can place multiple bets on the same side | ✅ Yes (each is a separate trade row) |

> **Note on the per-trade max:** 150 Beer Bucks per trade (30% of the starting 500) keeps any single bet from swinging the odds dramatically. Users who want to put more in can simply place multiple trades.

### Leaderboard Calculation

The leaderboard shows each user's **current Beer Bucks balance** — which is updated atomically at resolution time. This is the simplest correct approach: no portfolio value estimation, no open-position tracking. After all markets resolve, the leaderboard reflects final standings cleanly.

---

## 7. API Design

All routes are Next.js Route Handlers (`/app/api/...`). All request/response bodies are JSON.

### Authentication Routes

#### `POST /api/auth/register`
Create a new user account.

**Request body:**
```json
{ "firstName": "Katherine", "lastInitial": "W", "nickname": null, "pin": "1234" }
```
**Response:** `201 Created` with session cookie set, or `409 Conflict` if name is taken.

---

#### `POST /api/auth/login`
Authenticate an existing user.

**Request body:**
```json
{ "firstName": "Katherine", "lastInitial": "W", "nickname": null, "pin": "1234" }
```
**Response:** `200 OK` with session cookie set, or `401 Unauthorized`.

---

#### `POST /api/auth/logout`
Clear the session cookie.

**Response:** `200 OK`.

---

### User Routes

#### `GET /api/users/me`
Returns the current user's profile.

**Response:**
```json
{
  "id": "uuid",
  "displayName": "Katherine W.",
  "beerBucks": 430,
  "role": "participant"
}
```

---

### Market Routes

#### `GET /api/markets`
List all markets for the event, optionally filtered by status or category.

**Query params:** `?status=open`, `?status=locked`, `?status=resolved`, `?categoryId=uuid`

**Response:**
```json
[
  {
    "id": "uuid",
    "question": "Will Marcello throw up at least once?",
    "categoryId": "uuid",
    "categoryName": "Vomit / Penalty Lap",
    "status": "open",
    "yesPool": 320,
    "noPool": 180,
    "yesProbability": 0.64,
    "closingTime": "2026-05-15T18:00:00Z",
    "totalVolume": 500,
    "createdBy": "Quang L."
  }
]
```

---

#### `POST /api/markets`
Create a new market (requires auth). Status is set to `open` immediately — no admin approval required.

**Request body:**
```json
{
  "question": "Will Marcello throw up at least once?",
  "resolutionCriteria": "Resolves Yes if Marcello vomits at any point during the race or penalty lap.",
  "categoryId": "uuid",
  "closingTime": "2026-05-15T18:00:00Z"
}
```
**Response:** `201 Created` with the market object.

---

#### `GET /api/markets/[id]`
Get a single market with full detail, including the current user's trade history for this market.

**Response:**
```json
{
  "id": "uuid",
  "question": "...",
  "resolutionCriteria": "...",
  "status": "open",
  "yesPool": 320,
  "noPool": 180,
  "yesProbability": 0.64,
  "closingTime": "...",
  "resolvedOutcome": null,
  "resolutionNote": null,
  "myTrades": [
    { "side": "yes", "amount": 50, "createdAt": "..." }
  ]
}
```

---

#### `PATCH /api/markets/[id]`
Admin-only actions on a market. The `action` field determines the operation.

**Request body (lock):**
```json
{ "action": "lock" }
```
**Request body (resolve):**
```json
{ "action": "resolve", "outcome": "yes", "note": "Confirmed by 3 witnesses at the finish line." }
```
**Request body (void):**
```json
{ "action": "void" }
```
**Response:** `200 OK` with updated market object.

---

### Bet Routes

#### `POST /api/markets/[id]/bet`
Place a bet on a market. Requires auth, market must be `open`, user must not be the market creator.

**Request body:**
```json
{ "side": "yes", "amount": 50 }
```

**Server logic (all in one transaction):**
1. Verify session
2. Fetch market; if `closing_time` is past and status is `open`, set status to `locked` (lazy lock)
3. Verify market status is `open` (after lazy lock check)
4. Check user is not market creator
5. Check amount ≥ 5 and ≤ 150
6. Check user has sufficient balance (beer_bucks ≥ amount)
7. `UPDATE users SET beer_bucks = beer_bucks - amount`
8. `UPDATE markets SET yes_pool = yes_pool + amount` (or no_pool)
9. `INSERT INTO trades ...`
10. COMMIT

**Response:** `201 Created`
```json
{
  "trade": { "id": "uuid", "side": "yes", "amount": 50 },
  "newBalance": 380,
  "market": { "yesPool": 370, "noPool": 180, "yesProbability": 0.67 }
}
```
**Error responses:** `400 Bad Request` (constraint violation), `403 Forbidden` (creator betting on own market), `409 Conflict` (market not open).

---

### Category Routes

#### `GET /api/categories`
List all categories for the event.

---

#### `POST /api/categories`
Create a new category. Requires auth. **No admin approval needed.**

**Request body:**
```json
{ "name": "Shoe Malfunctions", "emoji": "👟" }
```
**Response:** `201 Created`

---

### Leaderboard Routes

#### `GET /api/leaderboard`
Returns all users sorted by beer_bucks descending.

**Response:**
```json
[
  { "rank": 1, "displayName": "Katherine W.", "beerBucks": 820, "isMe": true },
  { "rank": 2, "displayName": "Quang L.", "beerBucks": 710, "isMe": false }
]
```

---

## 8. Real-Time Architecture

### What needs to be real-time

| Event | Who needs to see it | Mechanism |
|---|---|---|
| Odds change (someone placed a bet) | All users on that market or the home feed | Supabase Realtime |
| Market status change (locked, resolved) | All users | Supabase Realtime |
| Payout credited | Affected user | User refreshes the page; updated balance is fetched on load |

There is no push notification or in-app toast system. When a market resolves, the updated status and payout are visible the next time the user loads or refreshes the page. During the event, users are expected to have the app open and will see status changes via the Realtime subscription automatically.

### Implementation

The client uses the **Supabase JavaScript client with the anon key** to subscribe to real-time changes on the `markets` table. This is a read-only subscription — the anon key cannot write to the DB (no RLS policies grant it write access).

```typescript
// Client-side hook (simplified)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

supabase
  .channel('market-updates')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'markets' },
    (payload) => {
      updateMarketInState(payload.new);
    }
  )
  .subscribe();
```

When any market row updates (yes_pool, no_pool, status, etc.), all subscribed clients receive the new row and update their UI instantly.

### Latency expectation

- Bet placed → API route processes → DB commits → Supabase Realtime notifies clients
- End-to-end: ~150–400ms on a decent cell connection
- Acceptable for this use case (not a high-frequency trading app)

### Offline / poor cell signal handling

- Supabase Realtime client automatically attempts reconnection if the WebSocket drops
- While disconnected, the UI shows the last known state with a subtle "reconnecting…" indicator
- When reconnected, the client re-fetches the current market list to catch up on any missed updates

---

## 9. Frontend Architecture

### Page Structure

```
/                        → Home: live feed of all open markets + event status bar
/login                   → Login / Register (unauthenticated landing)
/markets                 → Browse all markets, grouped by category
/markets/[id]            → Individual market: details, odds chart, bet form
/markets/new             → Create a new market (requires auth)
/categories/new          → Create a new category (requires auth)
/leaderboard             → Rankings table (shows final results when event is completed)
/profile                 → Current user's balance, active bets, history
/admin                   → Admin dashboard (role-gated): event controls + summary stats
/admin/markets           → All markets list with lock/resolve/void actions
/admin/markets/[id]      → Detailed market management page
```

### Component Hierarchy (key components)

```
<AppShell>               → persistent header with balance display + nav
  <MarketCard>           → used on home feed and /markets list
    <OddsBar>            → visual yes/no probability bar
    <VolumeBadge>        → total Beer Bucks wagered
  <MarketDetail>         → full market page
    <BetForm>            → yes/no toggle + amount input + confirm
    <EstimatedPayout>    → live-updating payout preview
    <TradeHistory>       → current user's bets on this market
  <Leaderboard>          → ranked user list; doubles as final results view when event is completed
  <AdminMarketList>      → all markets with status-appropriate action buttons
  <ResolveModal>         → confirmation dialog for market resolution
```

### Mobile-First Design Principles

- Minimum tap target: 44×44px for all interactive elements
- Bottom navigation bar (not top) — thumb-reachable on phones
- All forms optimized for mobile keyboards (numeric keypad for PIN and bet amounts)
- Minimal text input — most interactions are taps, not typing
- Odds displayed as both percentage (64%) and a visual bar — scannable at a glance
- Dark mode support (most people use dark mode, especially outdoors)

### State Management

- **Server state** (markets, user data): React Query (`@tanstack/react-query`) for caching, background refetch, and loading/error states
- **Real-time updates**: Supabase Realtime subscription updates React Query cache directly, so all components that depend on market data re-render automatically
- **UI state** (form inputs, modals): local `useState` — nothing complex enough to warrant a global store

---

## 10. UI & Design System

### Design Philosophy

Clean and minimal with energetic, colorful accents. The app should feel like a well-made sports app, not a casino — bright and fun rather than dark and high-stakes. Typography and whitespace do the heavy lifting; color is reserved for status, actions, and key numbers.

### Color Palette

| Role | Color | Hex | Usage |
|---|---|---|---|
| Yes / positive | Emerald green | `#10B981` | Yes buttons, winning indicators, positive deltas |
| No / negative | Rose red | `#F43F5E` | No buttons, losing indicators |
| Accent / brand | Amber | `#F59E0B` | Beer Bucks icon, highlights, CTAs |
| Background | Off-white | `#FAFAF9` | Page background (light mode) |
| Surface | White | `#FFFFFF` | Cards, modals |
| Text primary | Near-black | `#1C1917` | Body text, headings |
| Text secondary | Warm gray | `#78716C` | Labels, metadata, timestamps |
| Border | Light gray | `#E7E5E4` | Card outlines, dividers |

All colors are from the Tailwind CSS palette (`emerald-500`, `rose-500`, `amber-400`, `stone-50`, etc.) — no custom color config needed.

### Typography

- **Font:** System font stack (`font-sans` in Tailwind) — uses San Francisco on iOS, which is what iPhone users expect and renders crisply
- **Headings:** Bold, tight tracking — `font-bold tracking-tight`
- **Body / labels:** Regular weight, `text-sm` or `text-base`
- **Numbers (odds, balances):** Tabular figures, slightly larger — `text-lg font-semibold tabular-nums`
- **Minimum font size on any input: 16px** — below this, iOS Safari auto-zooms the page on focus, which is jarring on mobile

### Key UI Patterns

**Odds bar**
A horizontal split bar showing Yes % (green) vs. No % (red). Updates smoothly via CSS transition when new bet data arrives. The percentage label sits inside the dominant side.

```
[████████████████████░░░░░░░░] 68% Yes · 32% No
```

**Bet form**
- Large Yes / No toggle buttons (full width, 56px tall minimum)
- Numeric input with preset quick-pick buttons: `+25`, `+50`, `+100`
- Estimated payout updates live as the user types their amount
- Single "Place Bet" CTA button in amber

**Market card (home feed)**
- Question text prominently at top
- Odds bar below
- Footer row: category tag · volume · time until close
- Entire card is tappable (links to market detail)

**Bottom navigation**
Four tabs: Home · Markets · Leaderboard · Profile. Fixed to the bottom of the viewport. Must respect the iPhone home indicator safe area (see iPhone-specific notes below).

### iPhone / Safari-Specific Requirements

These are common mobile web pitfalls that must be addressed during implementation:

**Viewport height (`100vh` is broken in Safari)**
Safari on iPhone counts the address bar in `100vh`, causing content to be clipped. Use the CSS `dvh` unit instead:
```css
min-height: 100dvh; /* "dynamic viewport height" — works correctly in iOS 16+ */
```
For older iOS, fall back to a JS-based approach or `min-height: -webkit-fill-available`.

**Safe area insets**
The bottom navigation bar and any fixed footers must account for the iPhone home indicator. Add padding using CSS environment variables:
```css
padding-bottom: env(safe-area-inset-bottom);
```
The `viewport-fit=cover` meta tag must be set for this to work:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

**Input zoom prevention**
Any `<input>` with a font size below 16px triggers Safari's auto-zoom. Ensure all inputs — PIN entry, bet amount — use at least `text-base` (16px). Use `inputMode="numeric"` on number fields to show the numeric keypad instead of the full keyboard.

**Tap highlight**
Remove the default gray tap highlight on interactive elements:
```css
-webkit-tap-highlight-color: transparent;
```

**Momentum scrolling**
Add `-webkit-overflow-scrolling: touch` (or the modern equivalent) to any scrollable containers to get native-feeling scroll momentum on iOS.

### Component States

Every interactive component needs all four states designed:

| State | Treatment |
|---|---|
| Default | As described above |
| Loading | Skeleton placeholder (gray animated pulse) — never a spinner blocking the whole page |
| Empty | Friendly message + icon — e.g., "No markets yet. Be the first to create one!" |
| Error | Inline red error message below the relevant field or action |

### Accessibility

- All interactive elements have visible focus rings (important for non-touch users / testing)
- Color is never the only indicator of meaning — yes/no also have distinct labels and icons
- All images/icons have `alt` text or `aria-label`

---

## 11. Admin Tooling

The admin experience is embedded in the same web app behind a role check. There is no separate admin app.

### Admin-Only Pages

**`/admin` — Event Dashboard**
- Event status toggle (upcoming / active / completed)
- One-click "Lock all open markets" (for race start)
- Summary stats: # markets open, # resolved, total Beer Bucks in play
- When the admin sets the event to `completed`, the final leaderboard is shown to all users

**`/admin/markets` — All Markets**
- Lists all markets across all statuses
- Each card shows: question, resolution criteria, category, creator, current pools
- Admins can **Lock**, **Resolve Yes**, **Resolve No**, or **Void** any market from this list

**`/admin/markets/[id]` — Market Management**
- Shows current market state, pool totals, full list of bettors and their amounts
- Actions available based on current status:
  - `open` → **Lock** | **Resolve Yes** | **Resolve No** | **Void**
  - `locked` → **Resolve Yes** | **Resolve No** | **Void**
  - `resolved` → read-only
- Resolution requires entering a brief note (required field, min 10 chars)
- **Resolve button requires a confirmation modal** to prevent accidental resolution

### Admin Safeguards

- All admin API calls re-check `role = 'admin'` on the server — client-side role checks are UI only, not security
- Market status can only move forward: `open → locked → resolved/voided`. No backwards transitions.
- A resolved market cannot be re-resolved (DB check on `status`)
- Payouts are calculated and distributed in the same transaction that marks the market as resolved — there is no separate "pay out" step

---

## 12. Deployment & Infrastructure

### Environment Variables

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client only | For Realtime subscriptions. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full DB access. Never sent to client. |
| `SESSION_SECRET` | Server only | Min 32-char random string for iron-session |
| `NEXT_PUBLIC_EVENT_ID` | Client + Server | UUID of the single event row |

### Deployment Process

1. Create GitHub repository
2. Connect repo to Vercel project (free tier)
3. Set all environment variables in Vercel dashboard
4. Create Supabase project, run database migrations (SQL scripts in `/supabase/migrations/`)
5. Seed default categories via a one-time migration script
6. Set admin role for organizers directly in Supabase table editor
7. Push to `main` → Vercel auto-deploys

### Post-Event Shutdown

After the event is over, no archiving or export is needed. To shut down:

1. Admin sets event status to `completed` in the app (this reveals the final leaderboard to all users)
2. Leave the app running for a day or two so attendees can see final results
3. Delete the Supabase project and the Vercel project when done

There is no data worth exporting. The Supabase free tier will auto-pause the project after 7 days of inactivity anyway.

### Pre-Event Checklist

- [ ] Supabase project has been active within the last 7 days (ping it to prevent pause)
- [ ] Supabase Realtime replication enabled on `markets` table
- [ ] All env vars set in Vercel
- [ ] Admin accounts have `role = 'admin'` set in DB
- [ ] Default categories seeded
- [ ] At least one organizer-created market is live to demonstrate the flow
- [ ] Tested login on an actual phone (not just desktop browser)
- [ ] Tested bet placement end-to-end
- [ ] Confirmed Supabase Realtime is working (bet on one phone, watch odds update on another)

### Database Migrations

Migrations live in `/supabase/migrations/` as numbered SQL files:
```
0001_initial_schema.sql     -- all CREATE TABLE statements
0002_seed_categories.sql    -- default category rows
```

Run via Supabase CLI: `supabase db push`

### Enabling Supabase Realtime

Supabase Realtime does **not** broadcast changes for a table by default — replication must be enabled explicitly. In the Supabase dashboard, go to **Database → Replication** and add the `markets` table to the replication publication. Alternatively, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE markets;
```

This is a one-time setup step that is easy to forget and will cause the live odds feed to silently not work.

---

## 13. Security Considerations

Since there is no real money and no sensitive personal data (no email, no full name, no payment info), the threat model is low. However, the following protections are still appropriate:

| Concern | Mitigation |
|---|---|
| Session tampering | iron-session encrypts the cookie; SESSION_SECRET is server-only |
| PIN brute force | Rate-limit `/api/auth/login` to 10 attempts per IP per minute (Next.js middleware) |
| Service role key exposure | Only used in server-side API routes; never referenced in client components |
| Betting on own market | Checked server-side in the bet endpoint — not just a UI guard |
| Double-resolution | `status` column check in resolution transaction; DB constraint prevents re-resolution |
| Balance going negative | DB transaction checks `beer_bucks >= amount` before decrementing |
| Oversized bets | DB constraint `CHECK (amount >= 5)` + server-side max check |
| Admin impersonation | Role re-checked on every admin API call server-side |

---

## 14. Error Handling & Edge Cases

### Concurrent Bets (Race Conditions)

PostgreSQL serializes concurrent transactions. If two users place bets on the same market simultaneously:
- Both transactions run; each correctly reads the updated pool after the other commits
- No double-spend possible: balance decrement and pool increment are atomic per transaction
- Worst case: slight lock contention, adding ~50ms to one of the requests — unnoticeable

### Market Void Edge Cases

| Scenario | Behavior |
|---|---|
| Runner drops out before race | Admin voids market; all bets refunded to original bettors |
| No one bet on winning side | If yes_pool = 0 and Yes wins, no Yes traders exist — nothing is distributed, market resolves as a no-op |
| Both pools are 0 at resolution | Market resolves, nothing is paid out, no balances change |
| Two users with same name | Second user sees a conflict error and is prompted to add a nickname |

### Offline Handling

- If the Supabase Realtime WebSocket drops, the client shows a "reconnecting" indicator
- On reconnect, React Query refetches all market data to sync with current state
- Bet submission (API call) fails gracefully with an error toast if the network is unavailable; the user can retry

### Admin Accidentally Resolves Wrong Outcome

There is no undo for a resolution once payouts are distributed. If this happens:
- Admins must manually adjust affected user balances via the Supabase table editor
- This is a manual recovery process — not worth building a UI for a one-time event

---

## 15. Potential Extensions

The following features were considered and deferred from v1. They are documented here in case a future version of this app is built.

---

**Portfolio leaderboard view**
Instead of showing only settled Beer Buck balances, the leaderboard could show a "portfolio value" — each user's current balance plus the estimated value of their open positions at current odds. This makes the live leaderboard more dynamic and interesting to watch during the race, but requires computing estimated position values on the fly.

---

**Shareable end-of-event summary**
A styled results page or image for each user summarizing their performance ("You turned 500 into 1,240 Beer Bucks! Best bet: Marcello throws up (+340 BB)"). Could be implemented as a shareable URL with a server-rendered results page, or as a generated image using `@vercel/og`.

---

**Real-time in-app payout notifications**
When a market resolves and a payout is credited while the user has the app open, display an in-app toast (e.g., "🎉 +220 Beer Bucks from 'Marcello throws up'"). Achievable by subscribing to the `trades` or a `notifications` table via Supabase Realtime.

---

**Multi-event support**
Generalize the app to support creating and managing multiple Beer Mile events (e.g., next year's race). Currently, one event is hardcoded via `NEXT_PUBLIC_EVENT_ID`. Extending this would require an event selector UI and scoping all queries by event.
