*This project has been created as part of the 42 curriculum by thevaris, resilva, carlos-j, pebarbos.*

# SketchGuess 🎨

## Description

**SketchGuess** is a real-time multiplayer *draw & guess* web game (in the
spirit of gartic.io/skribbl.io), built for the **ft_transcendence** project at
42 Porto.

Players create an account (email/password or 42 OAuth), open a room in a
waiting lobby, and play rounds where one player draws a secret word while
the others race to guess it in the room chat. Everything is real time over
WebSockets: strokes, guesses, scores, timers and room lists.

**Key features**

- Live drawing board synchronised across every player (normalised strokes,
  reconnection with board restore, 15 s seat-hold on accidental drops).
- Waiting lobby with a public room list that updates for everyone, a
  5-minute room lifetime counted on the server, creator controls (start,
  kick, close) and sound/system notification when enough players arrive.
- Word choice: the drawer picks 1 of 3 words (theme and language of the
  room) with a 10-second server-side timer.
- Server-authoritative scoring: faster guesses earn more, gold/silver/
  bronze positions, drawer earns per correct guess; finished games are
  persisted and feed leaderboards (overall / weekly / daily) and match
  history.
- Social layer: friends with requests and real-time online presence,
  player hover-cards, public read-only profiles, achievements (badges)
  unlocked from real stats.
- Moderation: any player can report another; a vote opens on every screen
  and more than 50 % (minimum 2 votes) expels the reported player, who
  loses their points.
- Full UI in three languages (PT / EN / ES), GDPR-compliant privacy
  policy, HTTPS everywhere, hand-drawn visual identity with animated
  sketch typography.

## Instructions

**Prerequisites:** Docker + Docker Compose (v2), GNU Make. Nothing else is
installed on the host — everything runs in containers.

```bash
git clone https://github.com/RnSiilva/ft_transcendence && cd ft_transcendence

# 1. Configuration (never commit .env)
cp .env.example .env
#    - keep NODE_ENV=production (enables the Secure session cookie)
#    - for 42 login, fill FORTYTWO_CLIENT_ID / FORTYTWO_CLIENT_SECRET
#      with an app registered at intra (Settings → API); the Redirect URI
#      must be exactly the FORTYTWO_CALLBACK_URL value.

# 2. Run
make            # builds and starts mariadb + backend + frontend + nginx
# open https://localhost  (self-signed certificate: accept the warning)

# On 42 machines (ports 80/443 blocked): uncomment HTTPS_PORT/HTTP_PORT
# in .env and add the port to the 42 app Redirect URI.

# 3. Tests (against the running stack)
docker exec backend npm run test:rooms
docker exec backend npm run test:round
docker exec backend npm run test:scoring
docker exec backend npm run test:words
docker exec backend npm run test:report
docker exec backend npm run test:lobby

# 4. Tear down (removes database volumes too)
make re         # or: docker compose down -v
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs the frontend
type-check/build and every backend test suite on each PR against `main`.

## Resources

- [Socket.IO documentation](https://socket.io/docs/) — rooms, acknowledgements, reconnection.
- [Prisma documentation](https://www.prisma.io/docs) — schema, migrations vs `db push`, relation queries.
- [React documentation](https://react.dev/) and [Vite guide](https://vite.dev/guide/).
- [Express 5](https://expressjs.com/), [express-rate-limit](https://www.npmjs.com/package/express-rate-limit).
- [42 API / OAuth 2.0 guide](https://api.intra.42.fr/apidoc/guides/web_application_flow).
- [MDN](https://developer.mozilla.org/) — Canvas 2D, Notification API, WebAudio.
- GDPR reference for the privacy policy: [gdpr.eu](https://gdpr.eu/) and CNPD guidance.
- Gameplay inspiration: skribbl.io / gartic.io (no code reused).

### How AI was used

AI was used throughout the project as an auxiliary tool for research, debugging, and code quality assurance, under strict supervision and manual review by the team:

- **Conceptual learning & research:** understanding underlying concepts such as Prisma schema synchronization, Socket.IO room architectures, and JWT session handling to inform technical decisions.
- **Debugging & issue investigation:** diagnosing test race conditions and identifying edge-case behaviors during development.
- **Testing & validation:** generating ideas and edge-case scenarios for socket-based test scripts to improve overall system coverage.
- **Documentation & compliance:** drafting legal copy (GDPR-compliant Privacy Policy and Terms of Service) and verifying internationalization (i18n) structure.

All implementations, final logic, and codebase integration were strictly written, reviewed, tested, and validated by the team members.

## Team Information

| Member | 42 login | Role(s) | Responsibilities |
| --- | --- | --- | --- |
| Thiago | thevaris | Project Manager · Frontend owner · Dev | Full frontend (design system, pages, game UI, i18n), lobby UX + server module, legal content, project coordination. |
| Renan | resilva | Tech Lead · Game engine · Dev | Rooms/rounds/scoring engine, drawing transport, report engine, word database, leaderboards & game persistence. |
| Carlos | carlos-j | Backend · Auth · Dev | Authentication (sessions, JWT cookie), 42 OAuth, friends & presence, achievements/gamification. |
| Pedro | pebarbos | Product Owner · Game engine · Dev | Room registry & round state machine, scoring & word matching, report/vote engine, history/leaderboards persistence, backend tests. |

## Project Management

- **Organisation:** Feature branches per member with PRs to `main` and cross-review (visible in the history via the PRs); weekly meetings; frontend/backend division by domain.
- **Tools:** GitHub (branches, PRs, reviews).
- **Communication:** Discord/WhatsApp.

## Technical Stack

- **Frontend:** React 19 + TypeScript, Vite, socket.io-client. A custom CSS
  design system (CSS variables / design tokens, responsive layout with media
  queries, light & dark themes) built to match the hand-drawn identity.
- **Backend:** Node.js 20, Express 5, Socket.IO 4 — one HTTP API for
  auth/friends/games plus socket namespaces for rooms, drawing, rounds,
  lobby and reports.
- **Database:** **MariaDB 11** with **Prisma ORM**. Chosen because the
  domain is strongly relational (users ↔ friendships ↔ games ↔ scores ↔
  achievements) and Prisma gives a typed, self-documented schema shared by
  the whole team.
- **Infrastructure:** Docker Compose (mariadb, backend, frontend, nginx);
  nginx terminates TLS (self-signed, generated at image build), redirects
  HTTP→HTTPS and proxies both the API and the WebSocket upgrade.
- **Why these choices:** a single JavaScript/TypeScript stack end to end
  (Node.js/Express backend, React frontend) reduces friction across four
  people working in parallel. Socket.IO was chosen over raw WebSockets for
  its built-in room support, acknowledgements and reconnection handling —
  all needed for a real-time multiplayer drawing game. Express 5 is minimal
  and was already familiar to the team.

## Database Schema

Eight Prisma models (see `backend/prisma/schema.prisma`):

```
User ─┬─< Friend (senderId/receiverId, status PENDING|ACCEPTED)
      ├─< GameScore (points, won, finishedAt) >── Game (roomCode, theme, language, rounds, roundSeconds, endedAt)
      ├─< UserAchievement >── Achievement (seeded catalogue)
      └─< Report (reporter/reported, room code)
Word  (theme, textPt/textEn/textEs unique, nullable difficulty) — seeded with 123 words
```

- **User** — credentials (bcrypt hash), optional `intraId` (42 OAuth), avatar (data URL), language, rank, totalPoints, gamesPlayed, wins.
- **Friend** — one row per relationship; status drives pending/accepted.
- **Game / GameScore** — persisted only when a match finishes; `Game` stores the room and match configuration fields, while each score stores points, win status and `finishedAt` for leaderboards (overall/weekly/daily) and match history.
- **Achievement / UserAchievement** — badge catalogue (seeded at boot) and per-user unlocks, checked server-side on `/auth/me`.
- **Word** — trilingual word bank per theme; picked server-side per round.
- **Report** — persistent in-room reports with reporter, reported user and room code. The active expulsion vote itself is handled in memory over WebSockets.

## Features List

| Feature | Member(s) | Notes |
| --- | --- | --- |
| Visual identity, all pages, i18n (3 languages) | Thiago | sketch animations, responsive/mobile |
| Auth: register/login, session cookie, profile edit, delete account | Carlos | bcrypt + JWT httpOnly/Secure cookie |
| 42 OAuth login | Carlos | `/auth/42` + callback, `intraId` linking |
| Rooms & drawing engine (real-time strokes, reconnection) | Renan · Pedro | normalised strokes, seat-hold 15 s |
| Rounds, scoring, word bank, leaderboards, match history | Renan · Pedro | server-authoritative timer & scores |
| Waiting lobby (list, phases, 5-min lifetime, creator controls) | Thiago · Renan · Pedro| own socket module + test suite |
| Word choice (1 of 3, 10 s) | Thiago | built on the round engine hooks |
| Friends + online presence | Carlos · Thiago | REST + presence events |
| Achievements / gamification | Carlos | 20 badges, DB-persisted |
| Report & expulsion vote (>50 %, min 2) | Renan · Pedro | server vote engine + UI |
| Game screen UX (hover cards, fullscreen board, confetti, endgame) | Thiago | |
| GDPR Privacy Policy & Terms | Thiago | |
| Docker/nginx/HTTPS, CI | Thiago · Renan| |

## Modules

**Core (14 points required):**

| Module | Type | Pts | Audit | Implemented by |
| --- | --- | --- | --- | --- |
| Framework frontend **and** backend | Major | 2 | ✔ React + Express | all |
| Real-time features (WebSockets) | Major | 2 | ✔ game/lobby/presence | Renan, Pedro |
| User interaction (chat, profiles, friends) | Major | 2 | ✔ | Carlos, Thiago |
| Complete web-based game (live matches, rules, win/loss) | Major | 2 | ✔ | Renan, Thiago, Pedro, Carlos |
| Remote players (latency, disconnects, reconnection) | Major | 2 | ✔ seat-hold + board restore | Renan, Pedro |
| Standard user management (profile, avatar, friends, status) | Major | 2 | ✔ | Carlos, Pedro |
| Gamification (badges + leaderboards + stats, persistent) | Minor | 1 | ✔ 20 badges in DB |
| Multiple languages (3, full UI, switcher) | Minor | 1 | ✔ PT/EN/ES | Thiago |
| **Total core** | | **14** | | |

**Bonus (max +5):**

| Module | Type | Pts | Audit |
| --- | --- | --- | --- |
| Multiplayer game (3+ players) | Major | 2 | ✔ up to 8 per room, synced |
| Remote authentication OAuth (42) | Minor | 1 | ✔ (needs 42 app credentials in `.env`) |
| ORM (Prisma) | Minor | 1 | ✔ | Renan, Carlos, Pedro |
| Real-time collaborative features (shared drawing board) | Minor | 1 | ✔ |
| **Total bonus** | | **+5** | |

**Extra bonus pool (implemented beyond the +5 cap — swappable):**

| Module | Type | Pts | Audit | Swap notes |
| --- | --- | --- | --- | --- |
| Game statistics & match history | Minor | 1 | ✔ stats, history, leaderboards; progression covered by badges | ready to swap in for any Minor above |

## Individual Contributions

- **Thiago (thevaris):** Designed the visual identity and the approved HTML mockup, then built the whole frontend on it: every page, the reusable components and modals, the CSS design system and the game screen. Also the waiting-lobby server module and its test suite, the 1-of-3 word choice, the player hover card and public profile, the CI workflow, and the Privacy Policy and Terms content.
- **Renan (resilva):** Set up the repository and project structure, scaffolded the Express/Socket.IO backend and the Vite/React/TypeScript frontend, and built the Docker Compose stack, the single-command Makefile, the nginx reverse proxy with HTTPS and the initial Prisma schema. As Technical Lead, reviewed and merged the team's pull requests, and made the round engine the single source of truth for who is drawing.
- **Carlos (carlos-j):** Built authentication end to end: registration with bcrypt, login, JWT in an httpOnly cookie, rate-limited login and route guarding, plus 42 OAuth. Also profile editing with avatar upload, the friends system with online presence, the achievements system, the i18n integration, and the requirements tracker the team used to follow the subject.
- **Pedro (pebarbos):** Designed and built the server-authoritative game engine: the room registry, the round state machine, the scoring formula (speed-based with a decaying podium bonus, plus drawer points), the accent-insensitive word matching across pt/en/es, and the report-and-expel vote. Also the persistence layer for finished games, the daily, weekly and all-time leaderboards, match history, and the backend test suites. As Product Owner, reviewed and tested incoming pull requests.

## Known limitations

- The frontend container currently ships the Vite dev server; a production
  build (`vite build` + static serving) is prepared as a follow-up.

## License / Credits

Academic project — 42 Porto. The fictional company **Rabisco PRTC, Lda.**
named in the legal pages does not exist. All drawings are made by players
at runtime and never stored.
