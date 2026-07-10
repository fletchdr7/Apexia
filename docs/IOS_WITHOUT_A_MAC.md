# Building & shipping Apexia for iOS — without a Mac

You do **not** need a Mac to build, test, or publish this app. You need:

- An **Apple Developer Program** membership (you have this) — $99/year.
- A free **Expo** account (https://expo.dev).
- The **Expo Go** app on your iPhone (for instant testing during development).

Expo Application Services (**EAS**) runs the actual iOS build on Apple hardware in
the cloud and can upload to TestFlight / the App Store for you.

---

## Stage 1 — Develop and test instantly (no build, no Apple account)

```bash
cd mobile
npm install
npx expo start
```

Open the **Camera** app on your iPhone and scan the QR code → the project opens
in **Expo Go**. Every save hot‑reloads on your phone. This is how you'll do 95%
of day‑to‑day development.

> Note: the in‑app **camera** (food/supplement scanning) works in a real build
> and in Expo Go on a physical device. It won't work in a web browser.

---

## Stage 2 — Cloud build a real app (TestFlight‑ready `.ipa`)

1. Install the CLI and log in:

   ```bash
   npm install -g eas-cli
   eas login
   ```

2. From `mobile/`, configure the project once:

   ```bash
   eas build:configure
   ```

   This creates `eas.json`. A starter config is already included in this repo.

3. Kick off an iOS build in the cloud:

   ```bash
   eas build --platform ios --profile preview
   ```

   The first time, EAS will offer to **create your iOS credentials for you**
   (Distribution Certificate + Provisioning Profile). Let it — it manages these
   in the cloud so you never touch Xcode or a Mac. You'll log in with your Apple
   Developer account when prompted.

4. When it finishes you get a downloadable build and a QR/URL. For an
   **internal distribution** build you can install directly on registered
   devices; for TestFlight/App Store use the `production` profile (see below).

---

## Stage 3 — TestFlight & App Store

1. In [App Store Connect](https://appstoreconnect.apple.com), create the app once
   (name **Apexia**, bundle ID `com.apexia.app` — matches `mobile/app.json`).

2. Build for production and submit:

   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --latest
   ```

   `eas submit` uploads the build to App Store Connect. From there, add it to a
   **TestFlight** group to test on your own phone / with friends, then submit for
   App Store review when ready.

---

## Bundle identifier & app metadata

These live in `mobile/app.json`:

- `expo.ios.bundleIdentifier` → `com.apexia.app` (change to your own domain if you
  prefer, e.g. `com.yourname.apexia`).
- `expo.name` / `expo.slug` → app display name and Expo project slug.
- Camera/photo permission strings are set under `expo.ios.infoPlist`.

## Common gotchas

- **Apple team / bundle ID conflicts:** bundle IDs are globally unique. If
  `com.apexia.app` is taken, change it in `app.json` before your first build.
- **Push notifications / capabilities:** add these in `app.json` and EAS will
  provision them; no Xcode needed.
- **Environment variables:** anything the app needs at runtime must be an
  `EXPO_PUBLIC_*` var (see `mobile/.env.example`). For EAS builds, set them as
  [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
  or in `eas.json` per profile.

## Reference

- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- Expo without a Mac: https://docs.expo.dev/workflow/overview/
