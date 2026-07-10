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

> ⚠️ **Free tier caveat:** PythonAnywhere **free** accounts can only make outbound
> internet requests to a small allowlist of sites, and `api.openai.com` is **not**
> on it — so OpenAI calls will fail on a free account. To use real AI you need a
> paid PythonAnywhere plan (the $5/mo "Hacker" tier lifts the restriction), or
> host the backend somewhere with open outbound access (Render/Railway/Fly.io).
> Everything else (deploy, `/health`) still works on the free tier.

1. Open a **Bash console** on PythonAnywhere and get the code:

   ```bash
   git clone https://github.com/fletchdr7/Apexia.git
   cd Apexia
   git checkout cursor/apexia-fitness-app-foundation-e8c8   # until the PR is merged to main
   ```

2. Create a **virtualenv** and install dependencies:

   ```bash
   mkvirtualenv apexia --python=python3.10
   pip install -r backend/requirements.txt
   ```

3. Add your OpenAI key by creating `backend/.env`:

   ```bash
   echo "OPENAI_API_KEY=sk-...your-key..." > ~/Apexia/backend/.env
   ```

4. Create a new **Web app** → *Manual configuration* → the same Python version.
5. In the Web tab, set **Virtualenv** to `/home/<youruser>/.virtualenvs/apexia`.
6. Edit the **WSGI configuration file** (link in the Web tab): delete the sample
   content and replace it with:

   ```python
   import sys
   path = "/home/<youruser>/Apexia/backend"
   if path not in sys.path:
       sys.path.insert(0, path)
   from wsgi import application  # noqa
   ```

7. Click **Reload**. Visit `https://<youruser>.pythonanywhere.com/health` — it
   should return `{"status":"ok","openai":true,...}`.
8. Put that base URL in the app as `EXPO_PUBLIC_AI_API_URL` (see the app config
   section above / `eas.json`).

> Prefer ASGI hosting (Render, Railway, Fly.io)? Just run
> `uvicorn app.main:app` — no WSGI wrapper needed, and outbound access is open by
> default on those hosts.

---

## 4. Ship to iOS

See [`IOS_WITHOUT_A_MAC.md`](IOS_WITHOUT_A_MAC.md).
