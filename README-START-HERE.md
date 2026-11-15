# Regenta FC 1st Anniversary Solo Championship — Full Stack

This package contains both applications:
- `frontend/` — React + Vite website, anniversary logo, Ronaldo hero artwork, mobile six-tab navigation, player directory, group-card standings and Super League card.
- `backend/regenta-anniversary-backend/` — Express + TypeScript API, PostgreSQL/Drizzle persistence, admin JWT login, tournament groups, fixtures, standings and award calculations.

## Requirements
Node.js 20+ and a PostgreSQL database. Supabase can be used as the hosted PostgreSQL provider; use its PostgreSQL connection string as `DATABASE_URL`.

## 1. Backend setup
1. Open a terminal in `backend/regenta-anniversary-backend`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `CORS_ORIGIN=http://localhost:5173`.
4. Run `npm run db:push` to create/update tables.
5. Run `npm run admin:create` to create the first admin using the credentials in `.env`.
6. Run `npm run dev`. API listens at `http://localhost:8080`; check `http://localhost:8080/health`.

## 2. Frontend setup
1. Open a second terminal in `frontend`.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. Set `VITE_API_BASE_URL=http://localhost:8080`.
4. Run `npm run dev` and open `http://localhost:5173`.
5. Admin login is at `http://localhost:5173/admin`; use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` configured in the backend.

## 3. Initial tournament setup (one time)
After signing in, use the API workflow below (or an API client such as Postman/Insomnia). The backend currently provides tournament setup, group assignment and fixture generation endpoints; the frontend admin panel provides player creation and score entry.

1. Login: `POST http://localhost:8080/api/auth/login` with JSON `{ "email":"your-admin-email", "password":"your-admin-password" }`.
2. Copy the returned `token`; send `Authorization: Bearer TOKEN` on admin requests.
3. Initialize eight groups: `POST /api/tournament/setup` with `{ "name":"Regenta FC 1st Anniversary Solo Championship", "groupCount":8, "qualifiersPerGroup":4, "playoffSlots":8 }`.
4. Add players from `/admin` (or `POST /api/players` with `{ "displayName":"Player Name" }`).
5. Assign players: `POST /api/tournament/groups/auto-assign` (or assign manually using `POST /api/tournament/groups/:groupId/players` with `{ "playerId": 1 }`).
6. Generate group fixtures: `POST /api/fixtures/generate/qualifying`.
7. Enter scores from Admin → Fixtures. The backend score payload is `{ "goalsA": 2, "goalsB": 1 }` and automatically recalculates standings.
8. After all qualifying matches are complete, generate the Super League: `POST /api/fixtures/generate/super-league`.
9. Enter Super League scores. The Super League standings and top-four preview update from the database.
10. Golden Boot and Golden Glove calculations intentionally include only Super League and Playoffs, never qualifying fixtures.

## Current implementation notes
- The Standings page starts with eight Group A–H cards. Selecting a group opens its full table; the Super League card opens the combined table. The first four group positions are highlighted; the first eight Super League positions are highlighted for playoffs.
- Group-card previews show up to the current top four player names. The Super League preview shows its current top four names.
- The player directory cards open a profile panel. At this stage it shows identity/group and explains that detailed match-stat/history aggregation is not yet wired into that panel; it does not fabricate stats.
- Fixture history and stats are stored in the backend. Golden Boot/Glove stage filtering is enforced by the backend award calculation.
- Admin announcements creation UI is not yet connected to the backend create endpoint.
- This is a development integration package, not a production deployment. Configure secrets securely, add backups/audit logs, test score correction and playoff progression, and run frontend/backend builds before public launch.
