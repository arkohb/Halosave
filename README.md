# HaloSave — SAVE. LOCK. GROW.

Locked savings + investment platform for West Africa, now split HaloBid-style:

```
halosave/
├── client/   → React 19 + Vite PWA  → deploy on NETLIFY
└── server/   → Express + Drizzle/Postgres API → deploy on RAILWAY
```

All security hardening from the previous build is preserved (no login backdoor,
token-only identity, mandatory Paystack webhook signature check, JWT_SECRET boot
guard, rate limiting, helmet).

---

## 1. Push to GitHub

Push this whole folder as one repo (e.g. `arkohb/halosave`). Netlify and Railway
will each point at a different subfolder of the same repo.

```
git init
git add .
git commit -m "HaloSave split: Netlify client + Railway API"
git remote add origin https://github.com/arkohb/halosave.git
git push -u origin main
```

---

## 2. Deploy the API on Railway (do this FIRST)

1. Railway → **New Project → Deploy from GitHub repo** → pick the repo.
2. In the service **Settings → Root Directory**, set: `server`
3. Add a database: **New → Database → PostgreSQL** in the same project.
4. Service → **Variables** — set at minimum:
   - `JWT_SECRET` = output of `openssl rand -hex 32`
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `NODE_ENV` = `production`
   - `APP_URL` = the Railway public URL of THIS service (add after first deploy,
     e.g. `https://halosave-api.up.railway.app`)
   - `ALLOWED_ORIGIN` = your Netlify URL (add after step 3, e.g.
     `https://halosave.netlify.app`)
   - `PAYSTACK_SECRET_KEY` = your Paystack secret key
   - Do **NOT** set `PORT` — Railway injects it.
5. Build/start commands are picked up from `server/railway.json`
   (build: `npm install && npm run build`, start: `npm run start`,
   healthcheck: `/api/health`).
6. **Create the tables (one time)** — from your machine, using the PUBLIC
   `DATABASE_URL` from the Postgres service → Connect tab:

   ```
   cd server
   npm install
   set DATABASE_URL=postgresql://...railway...   (Windows CMD)
   npm run db:push
   npm run db:seed        (optional — prints the admin password ONCE)
   ```

7. Open `https://<your-railway-url>/api/health` — you should see
   `{"status":"ok", ...}`.

---

## 3. Deploy the frontend on Netlify

1. Netlify → **Add new site → Import an existing project** → pick the same repo.
2. **Base directory**: `client`
   Build command and publish dir are read from `client/netlify.toml`
   (`npm install && npm run build`, publish `dist`).
3. **Environment variables** (Site settings → Environment variables):
   - `VITE_API_URL` = your Railway URL, no trailing slash
     (e.g. `https://halosave-api.up.railway.app`)
   - `VITE_PAYSTACK_PUBLIC_KEY` = your Paystack public key
   - (optional) `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy. Then go back to Railway and set `ALLOWED_ORIGIN` to this Netlify URL
   and redeploy the API — otherwise the browser will block API calls with CORS.

---

## 4. Paystack webhook

In the Paystack dashboard → Settings → API Keys & Webhooks, set the webhook URL to:

```
https://<your-railway-url>/api/payments/paystack-webhook
```

If `PAYSTACK_SECRET_KEY` is left blank, the app runs in **sandbox mode** —
deposits open a simulated checkout page served by the API.

---

## 5. Local development

Terminal 1 — API:
```
cd server
copy .env.example .env    (fill in JWT_SECRET + local Postgres creds)
npm install
npm run dev               (port 3000)
```

Terminal 2 — frontend:
```
cd client
npm install
npm run dev               (port 5173; /api proxies to localhost:3000)
```

Leave `VITE_API_URL` unset locally — the Vite dev proxy handles it.

---

## What changed vs the monolith

- `client/src/api/client.ts` — API base URL now comes from `VITE_API_URL`.
- `client/src/context/PWAContext.tsx` — offline-queue sync now goes through
  `ApiClient` (correct origin + Authorization header; the old raw fetch would
  have been rejected).
- `client/public/sw.js` — service worker bypasses caching for ALL cross-origin
  requests (the API is now a different origin).
- `server/server.ts` — API only; no Vite middleware, no static SPA serving;
  friendly `/` route; warns if `ALLOWED_ORIGIN` is missing in production.
- `server/src/server/services/index.ts` — sandbox checkout URL is now absolute
  (`APP_URL`-based) so the popup opens on the Railway origin.
- Types are duplicated into `client/src/types` and `server/src/types` — if you
  change the shared types, update both.
