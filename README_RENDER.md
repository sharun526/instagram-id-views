# Render Deployment for Instagram Admin Panel

This repository contains a simple Node/Express backend and static frontend ready to deploy to Render.com.

## What it contains
- `server.js` — Express server, provides REST API:
  - `GET /api/ids` — returns list of saved Instagram IDs
  - `POST /api/ids` — protected by Basic Auth (ADMIN_USER / ADMIN_PASS environment variables), adds a new ID (server-side fetch of Instagram DP)
- `data.json` — storage file (simple JSON file)
- Frontend files (`index.html`, `app.js`, etc.) — updated to call the backend API

## Deploying to Render (Free plan)

1. Create a new **Web Service** on Render.
2. Connect your GitHub repository (push these files first to a repo).
3. In Render service settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables (in Render dashboard):
   - `ADMIN_USER` = `sharun`
   - `ADMIN_PASS` = `adminlgsharun123`
5. Deploy. Render will install dependencies and start the server.

## Notes
- The server uses an unofficial method to fetch Instagram profile pictures. This works server-side (no CORS) but may break if Instagram changes their site.
- For production, consider using a proper database (Postgres, MongoDB) instead of `data.json` and secure admin auth (tokens/OAuth).
- To reset the data, edit or delete `data.json` on the server.
