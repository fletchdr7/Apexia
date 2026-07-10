# Apexia

**Your AI coach for a fit, healthy life that fits a hectic schedule.**

Apexia is an iOS app (built cross‑platform with Expo/React Native) that tracks
your workouts, food, and supplements, and feeds everything into an AI coach that
suggests daily meals, training, and supplements tuned to your goals — without
locking you into a rigid routine that falls apart when work and kids get busy.

> This repository contains a complete, runnable **foundation**: a polished mobile
> app, a Python AI backend, and a Supabase database schema. It runs end‑to‑end in
> a self‑contained **demo mode** with zero configuration, and is wired to plug in
> Supabase + an AI provider when you're ready.

---

## What's inside

| Feature | Status | Where |
| --- | --- | --- |
| Onboarding (profile, body, activity, goals, lifestyle) | ✅ | `mobile/app/(onboarding)` |
| Personalized calorie & macro targets (Mifflin‑St Jeor + goal logic) | ✅ | `mobile/src/utils/nutrition.ts` |
| Today dashboard (rings, macros, AI daily plan, quick actions) | ✅ | `mobile/app/(tabs)/index.tsx` |
| Workout tracking (gym, home, run, cycling, reformer pilates, yoga, swim, HIIT…) | ✅ | `mobile/app/(tabs)/workouts.tsx`, `mobile/app/workout/log.tsx` |
| Food logging + **camera scan** (nutrition labels & cooked plates) | ✅ | `mobile/app/(tabs)/nutrition.tsx`, `mobile/app/nutrition/scan.tsx` |
| Supplement **analyzer** (camera) + logger with goal‑fit scoring | ✅ | `mobile/app/supplements` |
| AI coach chat + daily plan generation | ✅ | `mobile/app/(tabs)/coach.tsx`, `mobile/src/lib/api.ts` |
| Python AI backend (vision, chat, plans) | ✅ | `backend/` |
| Supabase schema with row‑level security | ✅ | `supabase/schema.sql` |

---

## Architecture

Apexia is built to match your existing skills (Python, Supabase, PythonAnywhere)
while giving you a professional iOS app **without owning a Mac**.

```
┌─────────────────────────────┐     ┌──────────────────────────┐
│        Apexia app           │     │   Supabase (you know it) │
│  Expo / React Native (TS)   │────▶│  Postgres + Auth + RLS   │
│  expo-router, local-first   │     │  (user data & sync)      │
└──────────────┬──────────────┘     └──────────────────────────┘
               │
               │  HTTPS (food/supplement photos, chat, plans)
               ▼
┌─────────────────────────────┐
│   Apexia AI backend         │     Deploy on PythonAnywhere (WSGI via
│   Python + FastAPI          │────▶ a2wsgi), or Render/Railway/Fly (ASGI).
│   OpenAI vision + chat      │     Calls a vision model for photo nutrition.
└─────────────────────────────┘
```

- **Mobile** is the source of truth for the UI and works fully offline via an
  AsyncStorage‑backed store. When Supabase is configured it can sync (schema is
  provided and ready).
- **Backend** is where the AI lives (Python — your language). It exposes simple
  JSON endpoints the app calls. With no API key it returns sensible heuristic
  results so nothing breaks during development.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details.

---

## Quickstart (demo mode, ~5 minutes)

You only need [Node.js 20+](https://nodejs.org) and the **Expo Go** app on your
iPhone (from the App Store). No Mac, no paid accounts required to try it.

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with your iPhone camera → it opens in Expo Go. The app runs in
demo mode: onboarding, tracking, camera logging, and the AI coach all work using
on‑device heuristics.

To enable the real backend and cloud sync, copy `mobile/.env.example` to
`mobile/.env` and fill in your Supabase + AI backend URLs. See
[`docs/SETUP.md`](docs/SETUP.md).

---

## Shipping to your iPhone / the App Store — without a Mac

You have an Apple Developer account, which is all you need. Expo Application
Services (**EAS**) builds the iOS app in the cloud (on Apple hardware Expo
operates) and can submit it to TestFlight / the App Store for you.

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform ios      # cloud build, no Mac needed
eas submit --platform ios     # upload to App Store Connect / TestFlight
```

The full walkthrough (Apple Developer setup, bundle IDs, push, TestFlight) is in
[`docs/IOS_WITHOUT_A_MAC.md`](docs/IOS_WITHOUT_A_MAC.md).

---

## Repository layout

```
mobile/     Expo React Native app (the iOS app)
backend/    Python FastAPI AI service (vision, coaching, plans)
supabase/   Database schema + RLS policies
docs/       Setup, architecture, and the "iOS without a Mac" guide
```

## Roadmap ideas

- Wire the mobile store to Supabase for multi‑device sync (schema is ready).
- Barcode lookup via Open Food Facts for instant packaged‑food logging.
- Apple Health / HealthKit integration for steps, weight, and workouts.
- Weekly progress reports and adaptive target adjustments from the coach.

## License

MIT — see `mobile/LICENSE`.
