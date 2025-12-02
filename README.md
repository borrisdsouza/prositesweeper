# KFC Site Sweeper

A tiny browser game inspired by Minesweeper for the construction industry: instead of mines, you're scouting parcels that are either future KFC drive-thrus or restaurant builds. Avoid the colonel, flag suspicious locations, and clear the board to win.

## Features

- 10x10 grid with 15 hidden hazards (beer truck, rain storm, strippers, diseases, and of course KFC).
- Classic minesweeper mechanics with a playful twist (restaurant tiles show the count of nearby hazards).
- Flagging via right-click (or long press on touchpads) plus a single-use hint button.
- Cinematic status popups when you win/lose, with randomized victory chatter and hazard-specific loss messages, plus instant restart.
- Difficulty selector (Easy/Medium/Hard) tweaks board size and hazard counts on the fly.
- Leaderboard-ready popups that prompt players to claim their score and preview how other builders rank.
- Fully client-side (HTML/CSS/JS) — no frameworks or build tooling required.

## Prerequisites

- Node 18+ (needed for the tiny Express server that stores claimed scores)
- npm (ships with Node)
- Any modern browser (Chrome, Firefox, Safari, Edge)

## Run locally

Install dependencies once:

```bash
npm install
```

Start the server (serves the static site and exposes `/scores` endpoints that write to `scores.txt`):

```bash
npm start
```

Open <http://localhost:5173> in your browser. Stop the server with `Ctrl+C`. Claimed leaderboard entries persist inside `scores.txt` in the project root.

## Customizing

- Adjust or add difficulty presets inside `DIFFICULTIES` in `game.js`. You can also update the hazard list (icons + copy and `weight` to skew odds) inside `HAZARD_TYPES`, or change the randomized win banter in `WIN_STATUSES`.
- The color palette and tile styles live in `style.css`.
- The Express server lives in `server.js`. Edit the `/scores` endpoints or `scores.txt` format if you need different persistence.

Because the project is pure static assets, you can also drop these files into any hosting service or integrate the logic into your existing site.
