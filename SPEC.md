# Beer Mile Betting App — Product Spec

## Overview

This application is a social betting platform built specifically for a Beer Mile event among friends and classmates. It lets anyone in the audience (and anyone who knows about the event) create custom prediction markets, place bets on any outcome they can imagine, and watch the odds move in real time as others weigh in. The goal is to make watching the race more fun, competitive, and interactive — not to manage real money seriously.

---

## The Event

**Beer Mile Rules:**

- Runners complete 4 laps of a standard 400m track (1 mile total)
- Before each lap, the runner must finish a standard beer (12 oz, no chugging shortcuts)
- If a runner vomits at any point, they must run a penalty lap (but do not need to drink an additional beer)
- The winner is whoever finishes in the fastest time
- There are separate brackets: Men's and Women's (or any groupings the organizers define)

---

## Purpose of the Application

1. **Engagement** — Give the audience something to care about beyond just watching the race
2. **Community** — Let friends create creative, personal bets about specific runners they know
3. **Entertainment** — Surface live odds, leaderboards, and reactions during the event
4. **Simplicity** — Easy enough to use standing in the bleachers on a phone

---

## Betting Model

We recommend a **prediction market model** inspired by Kalshi, adapted for casual friend group use.

### How It Works

Each bet is a **market** with two sides: **Yes** and **No**.

- Every market starts with a default probability (e.g., 50/50 Yes/No, or an organizer-set opening line)
- Participants buy **shares** of Yes or No at the current implied price (which reflects probability)
- Share prices move dynamically based on demand — if more people bet Yes, Yes shares get more expensive and No shares get cheaper
- Share prices always sum to $1.00 (e.g., Yes = $0.72, No = $0.28), representing 72% / 28% implied probability
- When a market resolves, winning-side shareholders split the total pot proportionally to the shares they hold

### Example

> **Market:** "Marcello will throw up at least once"
>
> Opening: Yes = $0.50, No = $0.50
>
> After 20 people pile in on Yes, the price adjusts: Yes = $0.70, No = $0.30
>
> Marcello throws up → Yes resolves as the winner
>
> Yes shareholders split the entire pot. Someone who bought 10 shares early at $0.50 each (spent $5) collects their proportional share of the total pot.

### Why This Model


| Consideration                | Prediction Market | Fixed Odds (DraftKings style) | Parimutuel (Horse Racing) |
| ---------------------------- | ----------------- | ----------------------------- | ------------------------- |
| Odds update dynamically      | ✅ Yes             | ❌ Locked at bet time          | ✅ Yes                     |
| No house needed to set lines | ✅ Yes             | ❌ Requires odds-setter        | ✅ Yes                     |
| Fun to watch odds move       | ✅ Very            | Somewhat                      | Somewhat                  |
| Easy to understand           | Moderate          | Easy                          | Moderate                  |
| Works for custom/weird bets  | ✅ Perfect         | Hard                          | ✅ Works                   |


The prediction market model is the best fit because bets will be highly personal and creative — no external odds-setter could reasonably price "Jake trips over the cone on Lap 3."

### Virtual Currency

- All betting uses **virtual coins** (called "Beer Bucks") — no real money
- Every user starts with a fixed amount (e.g., **500 Beer Bucks**) when they join
- Leaderboards track who built the most Beer Bucks across the event
- This keeps it legal, low-stakes, and fun

---

## Core Features

### 1. Markets (Bets)

**Creating a Market**

- Any logged-in user can create a new market
- Required fields:
  - **Question** (e.g., "Will Quang win the Men's bracket?")
  - **Category** (e.g., Winner, Vomit/Penalty, Finishing Time, Misc)
  - **Closing time** — when does betting close? (e.g., Race start, or a specific lap)
  - **Resolution criteria** — plain-text description of exactly what makes this Yes or No (written by the creator)
- Optional fields:
  - **Opening probability** — creator can suggest a starting line (defaults to 50%)
  - **Tags** — runner names, lap number, etc.
- Markets must be approved by a **designated admin** before going live (to prevent spam or unresolvable bets)

**Market States**

- `Draft` → created, pending admin approval
- `Open` → live, accepting bets
- `Locked` → betting closed, event in progress
- `Resolved` → outcome confirmed, payouts distributed
- `Voided` → cancelled (e.g., runner dropped out)

**Market Categories**

The following categories are created by default for every event:

- 🏆 Winner (Men's / Women's / Overall)
- 🤮 Vomit / Penalty Lap
- ⏱ Finishing Time (over/under)
- 🍺 Beer Performance (fastest chug, etc.)

Any participant can create additional custom categories at any time. New categories do **not** require admin approval — only the markets within them do.

### 2. Placing Bets

- Users browse open markets and tap **Yes** or **No**
- They enter a Beer Buck amount to wager
- The app shows:
  - Current Yes/No prices (probabilities)
  - How many shares they'll receive at the current price
  - Expected payout if they win
- Confirm → shares are purchased, balance deducted

### 3. Live Odds Feed

- A real-time feed on the home screen shows all open markets sorted by activity
- Each market card shows:
  - Question
  - Current Yes % probability (with a sparkline or trend arrow showing movement)
  - Total volume (how many Beer Bucks have been wagered)
  - Time until close
- Markets are grouped by category and searchable by runner name or tag

### 4. Resolution

- Admins resolve markets after the event (or as events happen in real time for in-race markets)
- When a market resolves Yes or No, the winning shareholders receive payouts automatically
- The resolution reason is displayed publicly (e.g., "Confirmed via official timing sheet" or "Seen by 3+ witnesses at the event")

### 5. Leaderboard

- **Beer Buck leaderboard** — who has the most coins after all markets resolve
- **Best call** — highest ROI single bet of the event
- **Creator leaderboard** — whose markets got the most volume

### 6. User Profiles

- Display name (can be fun/pseudonymous)
- Current Beer Buck balance
- Portfolio of active bets (shares held)
- Bet history with outcomes
- Markets created

---

## User Experience Flow

### Pre-Event (Days / Hours Before)

1. Organizer creates the event and sends a join link to friends
2. Users sign up with a display name (email or social login)
3. Everyone receives their starting Beer Buck balance
4. Organizer seeds a set of official markets (e.g., bracket winners, vomit props)
5. Users create additional custom markets; admins approve them
6. Users browse, debate, and place bets — this is the main social period

### Event Day — Before the Race

1. Admins lock all markets at race start (or per their defined close time)
2. A "pre-race snapshot" screen shows the final odds for each market
3. Users can still view their portfolio and the full market list

### During the Race

1. Audience members watch the live odds feed (read-only after lock)
2. Admins can optionally unlock in-race markets for things that can be verified mid-race (e.g., "Did Jake throw up on Lap 2?" can resolve in real time)
3. Push/in-app notifications fire when markets resolve (e.g., "🏁 Quang wins Men's! Yes holders get paid out.")

### After the Race

1. Admins resolve all remaining open markets
2. Final leaderboard is revealed
3. Users can see their final Beer Buck balance, best bets, and worst bets
4. A shareable summary card (image/link) is generated for each user ("You turned 500 into 1,240 Beer Bucks!")

---

## Roles


| Role                     | Capabilities                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Participant**          | Join event, create markets, place bets, view leaderboard                                           |
| **Admin**                | All participant actions + approve/reject markets, lock/resolve/void markets, manage event settings |
| **Spectator** (optional) | View-only access, no betting — for people who just want to watch the odds                          |


---

## Edge Cases & Rules

- **Market creator cannot bet** on their own market (to prevent manipulation)
- **Minimum bet** of 5 Beer Bucks per trade to prevent spam
- **Maximum bet** per market per user is capped (e.g., 100 Beer Bucks) to keep markets interesting and prevent one person from dominating odds
- **Void policy**: if a runner drops out before the race starts, all related markets are voided and stakes refunded
- **Penalty lap markets**: resolve as Yes if the runner throws up and serves the penalty lap
- **Tie resolution**: if a Yes/No is genuinely ambiguous, admin can resolve as N/A and refund all stakes

---

## Out of Scope (for v1)

- Real money or cryptocurrency
- Complex conditional markets ("Marcello throws up AND wins")
- Live GPS or timing system integration
- Video / streaming within the app

---

## Success Metrics

- Number of unique users who place at least one bet
- Total number of markets created
- Total Beer Buck volume wagered
- % of markets that resolve (vs. voided)
- User engagement during the live event (DAU / sessions during race window)

---

## Open Questions for Technical Design

1. **Authentication** — social login (Google) vs. anonymous join link vs. email/password?
2. **Real-time updates** — WebSockets or polling for live odds changes?
3. **Market-making algorithm** — use LMSR (Logarithmic Market Scoring Rule, the standard for prediction markets) or a simpler order-book / pool model?
4. **Platform** — web app (mobile-first) or native mobile? Web is recommended for shareability via link.
5. **Admin tooling** — embedded in the app or a separate admin dashboard?
6. **Persistence** — what happens to the data after the event? Export / archive?

