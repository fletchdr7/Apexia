# Apexia AI Backend

A small FastAPI service that powers Apexia's AI features:

- `POST /vision/food` — estimate nutrition from a plate or nutrition‑label photo
- `POST /vision/supplement` — read and analyze a supplement label
- `POST /coach/chat` — coaching chat with the user's profile as context
- `POST /coach/plan` — generate a flexible daily plan
- `GET /health` — status

Every endpoint works **without** an API key by returning deterministic heuristic
results, so you can develop the app with zero configuration or spend. Set
`OPENAI_API_KEY` to switch on real vision + chat.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # optional: add OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

## Configuration

See `.env.example`. Key vars: `OPENAI_API_KEY`, `OPENAI_MODEL`,
`OPENAI_VISION_MODEL`, `REQUIRE_AUTH`, `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`.

## Deploy

- **ASGI** (Render, Railway, Fly.io, a VM): `uvicorn app.main:app`.
- **WSGI** (PythonAnywhere): use `wsgi.py`, which wraps the ASGI app with
  `a2wsgi`. See `../docs/SETUP.md`.

## Layout

```
app/
  main.py      FastAPI app + routes
  ai.py        OpenAI vision/chat + heuristic fallbacks
  schemas.py   Pydantic request/response models
  config.py    Settings from env
  security.py  Optional Supabase JWT verification
wsgi.py        WSGI entrypoint for PythonAnywhere
```
