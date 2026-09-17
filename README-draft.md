*This project has been created as part of the 42 curriculum by thevaris, [FILL: login-renan], [FILL: login-carlos], [FILL: login-pedro].*

<!-- ============================================================
DRAFT do README final (Cap. VI do subject). Antes de mover para
README.md: preencher todos os [FILL], validar a secção de IA e a
tabela de módulos em equipa, e apagar estes comentários.
O subject exige o README em INGLÊS e avisa que um README pobre
prejudica a avaliação.
============================================================ -->

# SketchGuess 🎨

## Description

**SketchGuess** is a real-time multiplayer *draw & guess* web game (in the
spirit of Gartic/skribbl.io), built for the **ft_transcendence** project at
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
git clone <repo-url> && cd ft_transcendence

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
- Gameplay inspiration: skribbl.io / Gartic (no code reused).

### How AI was used

<!-- Secção OBRIGATÓRIA no subject novo: "which tasks and which parts".
     Validar em equipa e ajustar à verdade de cada um antes de publicar. -->

AI (Claude / Claude Code, directed and reviewed by the team) was used as a
pair-programmer, mainly on the frontend side of the project:

- **Frontend pages & components** (Thiago + AI): implementation of the
  approved visual design fixes , pages i18n dictionary (PT/EN/ES) fixes
  and responsive/mobile fixes.
- **Testing & debugging**: end-to-end socket test scripts, the lobby test
  suite, console/HTTPS audits, and bug hunts (e.g. canvas wipe on resize,
  cookie `Secure` flag, node_modules volume issue).
- **Legal texts**: GDPR-compliant Privacy Policy and Terms of Service
  drafts, reviewed by the team.

Written by the team without AI: [FILL — confirmar em equipa: motor de
salas/rondas/pontuação, autenticação + OAuth 42, sistema de amigos +
presença, report engine, achievements/gamification, infraestrutura
Docker/nginx inicial].

## Team Information

| Member | 42 login | Role(s) | Responsibilities |
| --- | --- | --- | --- |
| Thiago | thevaris | Project Manager · Frontend owner | Full frontend (design system, pages, game UI, i18n), lobby UX + server module, legal content, project coordination. |
| Renan | [FILL] | [FILL: e.g. Tech Lead · Game engine] | Rooms/rounds/scoring engine, drawing transport, report engine, word database, leaderboards & game persistence. |
| Carlos | [FILL] | [FILL: e.g. Backend · Auth] | Authentication (sessions, JWT cookie), 42 OAuth, friends & presence, achievements/gamification. |
| Pedro | [FILL] | [FILL] | [FILL] |
lobby engine, word database, leaderboards & game persistence. |

## Project Management

- **Organisation:** [FILL — ex.: feature branches por membro com PRs para
  `main` e revisão cruzada (visível no histórico: PRs #4–#13); reuniões
  semanais; divisão frontend/backend por domínios.]
- **Tools:** GitHub (branches, PRs, reviews), [FILL: Issues/Trello/…].
- **Communication:** [FILL: Discord/WhatsApp/presencial…].

## Technical Stack

- **Frontend:** React 19 + TypeScript, Vite, socket.io-client. Custom CSS
  design system (no UI framework) to match the hand-drawn identity.
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
- **Why these choices:** [FILL — 2-3 frases da equipa; sugestão: stack JS
  única em todo o projeto reduz fricção entre 4 pessoas; Socket.IO dá
  reconexão/acks prontos para o jogo em tempo real; Express 5 é minimal e
  todos o conheciam.]

## Database Schema

Eight Prisma models (see `backend/prisma/schema.prisma`):

```
User ─┬─< Friend (senderId/receiverId, status PENDING|ACCEPTED)
      ├─< GameScore >── Game (settings, theme, language, finishedAt)
      ├─< UserAchievement >── Achievement (seeded catalogue)
      └─< Report (reporter/target, room code, resolved)
Word  (theme, textPt/textEn/textEs unique, difficulty) — seeded with 123 words
```

- **User** — credentials (bcrypt hash), optional `intraId` (42 OAuth),
  avatar (data URL), language, rank, totalPoints, gamesPlayed, wins.
- **Friend** — one row per relationship; status drives pending/accepted.
- **Game / GameScore** — persisted only when a match finishes; feeds
  leaderboards (overall/weekly/daily) and match history.
- **Achievement / UserAchievement** — badge catalogue (seeded at boot) and
  per-user unlocks, checked server-side on `/auth/me`.
- **Word** — trilingual word bank per theme; picked server-side per round.
- **Report** — in-room reports backing the expulsion votes.

## Features List

<!-- "Which team member(s) worked on each feature" — ajustar nomes. -->

| Feature | Member(s) | Notes |
| --- | --- | --- |
| Visual identity, all pages, i18n (3 languages) | Thiago | sketch animations, responsive/mobile |
| Auth: register/login, session cookie, profile edit, delete account | Carlos | bcrypt + JWT httpOnly/Secure cookie |
| 42 OAuth login | Carlos | `/auth/42` + callback, `intraId` linking |
| Rooms & drawing engine (real-time strokes, reconnection) | Renan Pedro | normalised strokes, seat-hold 15 s |
| Rounds, scoring, word bank, leaderboards, match history | Renan Pedro | server-authoritative timer & scores |
| Waiting lobby (list, phases, 5-min lifetime, creator controls) | Thiago Renan Pedro| own socket module + test suite |
| Word choice (1 of 3, 10 s) | Thiago | built on the round engine hooks |
| Friends + online presence | Carlos Thiago | REST + presence events |
| Achievements / gamification | Carlos | 20 badges, DB-persisted |
| Report & expulsion vote (>50 %, min 2) | Renan Pedro | server vote engine + UI |
| Game screen UX (hover cards, fullscreen board, confetti, endgame) | Thiago | |
| GDPR Privacy Policy & Terms | Thiago | |
| Docker/nginx/HTTPS, CI | [FILL] · Thiago Renan| |

## Modules

<!-- Proposta do Thiago+IA para os 14 pontos core + bónus (máx. +5).
     DECIDIR EM EQUIPA e ajustar antes de publicar. Auditoria honesta:
     ✔ = cumpre a descrição toda; ⚠ = rever antes de reclamar. -->

**Core (14 points required):**

| Module | Type | Pts | Audit | Implemented by |
| --- | --- | --- | --- | --- |
| Framework frontend **and** backend | Major | 2 | ✔ React + Express | all |
| Real-time features (WebSockets) | Major | 2 | ✔ game/lobby/presence | Renan, Pedro |
| User interaction (chat, profiles, friends) | Major | 2 | ✔ | Carlos, Thiago |
| Complete web-based game (live matches, rules, win/loss) | Major | 2 | ✔ | Renan, Thiago, Pedro, Carlos |
| Remote players (latency, disconnects, reconnection) | Major | 2 | ✔ seat-hold + board restore | Renan, Pedro |
| Standard user management (profile, avatar, friends, status) | Major | 2 | ✔ | Carlos, Pedro |
| ORM (Prisma) | Minor | 1 | ✔ | Renan, Carlos, Pedro |
| Multiple languages (3, full UI, switcher) | Minor | 1 | ✔ PT/EN/ES | Thiago |
| **Total core** | | **14** | | |

**Bonus (max +5):**

| Module | Type | Pts | Audit |
| --- | --- | --- | --- |
| Multiplayer game (3+ players) | Major | 2 | ✔ up to 8 per room, synced |
| Remote authentication OAuth (42) | Minor | 1 | ✔ (needs 42 app credentials in `.env`) |
| Gamification (badges + leaderboards + stats, persistent) | Minor | 1 | ✔ 20 badges in DB |
| Real-time collaborative features (shared drawing board) | Minor | 1 | ✔ |
| **Total bonus** | | **+5** | |

**Extra bonus pool (implemented beyond the +5 cap — swappable):**

<!-- O bónus tem teto de 5 pontos, mas temos MAIS módulos prontos do que
     isso. Estes ficam de reserva: a equipa pode trocar qualquer item da
     tabela de bónus por um daqui (mesmo valor de pontos) antes da
     entrega, conforme o que estiver mais sólido na defesa. -->

| Module | Type | Pts | Audit | Swap notes |
| --- | --- | --- | --- | --- |
| Game statistics & match history | Minor | 1 | ✔ stats, history, leaderboards; progression covered by badges | ready to swap in for any Minor above |
| Public API | Major | 2 | ⚠ 17 REST endpoints (all four verbs) + login rate-limiting, but the description also asks for a **secured API key and documentation** — not done | only claimable after adding API key + docs |
| File upload (avatars) | Minor | 1 | ⚠ upload + client/server validation + preview + deletion work; only the upload progress indicator is missing (team chose not to add it) | claimable only if the evaluator accepts the missing progress sub-item |

> The subject caps bonus at **5 points**, so extra modules never add
> points — they only widen the choice of which five to defend. Anything
> claimed must be **fully functional and meet the full module
> description** (Chapter VII), hence the ⚠ flags above.

## Individual Contributions

<!-- Cada membro escreve o seu parágrafo: o que fez, desafios e como os
     resolveu. Exemplos de desafios reais para inspirar:
     - canvas apagado em cada resize (snapshot + repaint)
     - lugar do jogador em reloads (reclaimSeat) e abortar partidas a solo
     - regra de maioria da expulsão com 2 jogadores
     - npm install a saltar devDependencies com NODE_ENV=production
     - fusão do ramo de badges com o trabalho de frontend em curso -->

- **Thiago (thevaris):** [FILL]
- **Renan ([FILL]):** [FILL]
- **Carlos ([FILL]):** [FILL]
- **Pedro ([FILL]):** [FILL]

## Known limitations

- The frontend container currently ships the Vite dev server; a production
  build (`vite build` + static serving) is prepared as a follow-up.
- Spectator mode was considered and postponed (design notes in the code).

## License / Credits

Academic project — 42 Porto. The fictional company **Rabisco PRTC, Lda.**
named in the legal pages does not exist. All drawings are made by players
at runtime and never stored.
