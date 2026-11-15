# Regenta FC 1st Anniversary Solo Championship — Frontend

Mobile-first React + TypeScript + Vite frontend for the Regenta FC 1st Anniversary Solo Championship.

## Tournament branding
The supplied anniversary football artwork is included as `public/regenta-anniversary-logo.png` and is used in the public header, homepage footer, and admin login/dashboard branding. The existing Ronaldo homepage hero image remains `public/ron.jpg`.

## Run locally
1. Install Node.js (LTS).
2. Extract this ZIP and open the project folder in a terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your backend URL (default: `http://localhost:4000`).
5. Run `npm run dev` and open the local URL shown by Vite.

## Build
Run `npm run build` to type-check and create the production build in `dist/`.

## Navigation
- Desktop: Home, Fixtures, Standings, Players, Playoffs, Awards, Rules.
- Mobile bottom navigation: Home, Fixtures, Standings, Players, Awards, Rules.
- Admin: open `/admin` directly. It is not linked from public navigation.

## Backend
This frontend expects the API routes shown in `src/api.ts` and `src/App.tsx`. Configure the backend base URL in `.env`. Backend integration should be tested against the actual deployed backend before production use.
