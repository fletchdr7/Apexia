# Setup guide

Three optional layers. The app runs with **none** of them configured (demo mode).
Add them when you want cloud sync and real AI.

## 0. Prerequisites

- [Node.js 20+](https://nodejs.org) and npm
- The **Expo Go** app on your iPhone (App Store) for instant testing
- (Optional) Python 3.11+ for the AI backend
- (Optional) A Supabase project and an OpenAI API key

---

## 1. Run the mobile app

```bash
cd mobile
npm install
npx expo start        # scan the QR code with your iPhone camera
```

Useful scripts:

```bash
npm run typecheck     # TypeScript check
npm run ios           # open in iOS simulator (needs a Mac) — otherwise use Expo Go
```

Configuration (all optional) lives in `mobile/.env` (copy from `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_AI_API_URL=https://<your-backend>
```

---

## 2. Supabase (auth + data)

1. Create a project at https://app.supabase.com.
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](../supabase/schema.sql).
   This creates all tables, row‑level‑security policies, and a trigger that makes
   a profile row for every new user.
3. Copy your project's **URL** and **anon key** (Project Settings → API) into
   `mobile/.env` as shown above.

The schema is ready for the app to sync to. The app currently stores data
on‑device; wiring the store to Supabase CRUD is the recommended next step and is
straightforward because the table columns mirror `mobile/src/types`.

---

## 3. AI backend (Python)

### Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # add OPENAI_API_KEY for real AI (optional)
uvicorn app.main:app --reload --port 8000
```

Visit http://localhost:8000/docs for interactive API docs. Without an
`OPENAI_API_KEY` the endpoints return heuristic results in the correct shape.

Point the app at it during development by setting in `mobile/.env`:

```
EXPO_PUBLIC_AI_API_URL=http://<your-computer-LAN-ip>:8000
```

(Use your machine's LAN IP, not `localhost`, so your phone can reach it.)

### Deploy on PythonAnywhere (WSGI)

1. Upload/clone this repo to PythonAnywhere and create a **virtualenv**, then
   `pip install -r backend/requirements.txt`.
2. Create a new **Web app** → *Manual configuration* → your Python version.
3. Edit the WSGI configuration file so it imports the app:

   ```python
   import sys
   path = "/home/<youruser>/Apexia/backend"
   if path not in sys.path:
       sys.path.insert(0, path)
   from wsgi import application  # noqa
   ```

4. Set environment variables (e.g. `OPENAI_API_KEY`) in the Web tab, then
   **Reload** the web app. Your API is live at `https://<youruser>.pythonanywhere.com`.
5. Put that URL in `mobile/.env` as `EXPO_PUBLIC_AI_API_URL`.

> Prefer ASGI hosting (Render, Railway, Fly.io)? Just run
> `uvicorn app.main:app` — no WSGI wrapper needed.

---

## 4. Ship to iOS

See [`IOS_WITHOUT_A_MAC.md`](IOS_WITHOUT_A_MAC.md).
