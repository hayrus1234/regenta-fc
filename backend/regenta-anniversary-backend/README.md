# Regenta FC 1st Anniversary Solo Tournament — Backend

Independent backend scaffold for the solo 1v1 tournament. The reference ZIP is not modified.

## Stack
- Node.js + Express + TypeScript
- PostgreSQL + Drizzle ORM
- Zod validation
- JWT admin authentication

## Important tournament behavior
- Player count is **not fixed at 64**. Add any number of players.
- Group count and qualifiers per group are configurable during initial setup (defaults: 8 groups, top 4).
- `POST /api/tournament/groups/auto-assign` distributes unassigned active players across groups with the smallest current membership first.
- Qualifying round robin is generated independently for each group.
- Super League round robin is generated for the actual qualified player count.
- Qualifying results determine qualification only. Golden Boot / Golden Glove count only completed `super_league` and `playoffs` fixtures.
- Player deletion is soft deletion to preserve historical match references.
- Fixture generation refuses to overwrite an existing stage's fixtures.

## Setup

1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, a strong `JWT_SECRET`, `ADMIN_EMAIL`, and an `ADMIN_PASSWORD` containing at least 4 digits (numbers only).
3. Install packages: `npm install`.
4. Generate and apply schema: `npm run db:push`.
5. Bootstrap the first admin:
   ```bash
   npm run admin:create
   ```
   (See `scripts/create-admin.ts`; run it with `npx tsx scripts/create-admin.ts`.)
6. Start development server: `npm run dev`.

## Initial API workflow

1. `POST /api/auth/login` with `{ "email": "...", "password": "..." }`.
2. Use `Authorization: Bearer <token>` for all admin routes.
3. `POST /api/tournament/setup` with optional `{ "name": "...", "groupCount": 8, "qualifiersPerGroup": 4, "playoffSlots": 8 }`.
4. Add players using `POST /api/players`.
5. Assign players manually with `POST /api/tournament/groups/:groupId/players` OR distribute all unassigned players with `POST /api/tournament/groups/auto-assign`.
6. Generate qualifying fixtures: `POST /api/fixtures/generate/qualifying`.
7. Enter/correct scores: `PATCH /api/fixtures/:id/score` with `{ "goalsA": 2, "goalsB": 1 }`.
8. After every qualifying fixture is completed, generate the Super League: `POST /api/fixtures/generate/super-league`.
9. Enter Super League results; view standings at `GET /api/standings?stage=super_league`.
10. Generate playoffs: `POST /api/playoffs/generate`; enter playoff scores at `PATCH /api/playoffs/:id/score`.

## API access
Public read endpoints: health, players, tournament, fixtures, standings, statistics/awards, playoffs, published announcements.
Admin-only write endpoints: login is public; all player/group/fixture/tournament/playoff/announcement mutations require a bearer token.

## Notes / follow-up hardening
- The first version is a foundation, not a production deployment. Add integration tests, audit log for score edits, transactional stage transitions, and robust playoff score correction/branch reset before public launch.
- Golden Glove currently counts a clean sheet for the winning/losing player in a completed fixture where the opponent scored zero. Confirm if the tournament's FC Mobile-specific rule differs.
- Tie-breakers currently: points, goal difference, goals scored, then player ID for deterministic ordering. Add head-to-head if you want it to override the last tie-break.
- For playoff draws, admin must enter the final result after in-game tiebreak/extra-time; no draws accepted.
- Group sizes may be uneven. Top N from each group is applied as configured. If you want best-of-group balancing or global wildcard slots, that is a separate rule.
