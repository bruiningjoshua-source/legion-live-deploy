# Legion Live — App Packaging Guide

This covers shipping Legion Live as an installable app across all platforms.
The web app (PWA) is the foundation; native wrappers point at it.

**Live URL:** https://legion-live.netlify.app
**Android package id:** `app.legionlive.twa`

---

## 1. PWA (works NOW — no build needed)

Already live. Users can install directly:
- **Android/Chrome/Desktop:** the in-app "Install Legion Live" banner appears
  (via `beforeinstallprompt`), or browser menu → "Install app".
- **iOS/Safari:** Share → "Add to Home Screen" (the app shows this hint
  automatically after a few seconds on iOS).

This is the immediate install route for everyone, and the **primary route for
Apple users** (see §4 for why the App Store is more involved).

Requirements met: manifest.json with real PNG icons (72–512 + maskable),
service worker, theme color, apple-touch-icons, standalone display. ✅

---

## 2. Google Play Store (TWA via Bubblewrap)

A TWA (Trusted Web Activity) wraps the PWA in a native Android shell. Produces
both the **AAB** (for Play submission) and an **APK** (for direct download, §3).

### Prerequisites (on a machine with Java 17 + Android SDK)
```bash
npm install -g @bubblewrap/cli
# Bubblewrap will offer to install the JDK + Android SDK on first run.
```

### Build steps
```bash
# From repo root (twa-manifest.json is already configured):
bubblewrap init --manifest https://legion-live.netlify.app/manifest.json
# When prompted, accept the existing twa-manifest.json values.
# It will generate a signing keystore (android.keystore) — BACK THIS UP.
# Record the keystore password + key password somewhere safe.

bubblewrap build
# Produces:
#   app-release-bundle.aab   <- upload this to Play Console
#   app-release-signed.apk   <- direct-download backup (see §3)
```

### CRITICAL: Digital Asset Links (removes the browser URL bar)
After the keystore exists, get its SHA-256 fingerprint:
```bash
keytool -list -v -keystore android.keystore -alias legion | grep SHA256
```
Put that fingerprint into `public/.well-known/assetlinks.json` (replace
`REPLACE_WITH_SHA256_FINGERPRINT_FROM_KEYSTORE`), commit, and redeploy.

**Also add Play's App Signing fingerprint** once you upload: Play Console →
Setup → App signing gives you a second SHA-256. Add BOTH fingerprints to the
`sha256_cert_fingerprints` array, or the app will show a URL bar.

### Play Console submission
1. Create app at play.google.com/console ($25 one-time developer fee)
2. Upload `app-release-bundle.aab`
3. Fill store listing (use the 512 icon, screenshots, description)
4. Complete content rating, data safety, and — important for Legion — the
   **paid-content / IAP** and **18+ content** declarations.
5. Submit for review.

---

## 3. Direct APK download (backup install route)

The `app-release-signed.apk` from §2 is the direct-install file. Host it:
```bash
# Copy the built APK into the site so people can download it:
cp app-release-signed.apk public/downloads/legion-live.apk
```
Then link `https://legion-live.netlify.app/downloads/legion-live.apk` from a
"Get the App" page. Users enable "install from unknown sources" and tap it.

This is the fallback if someone can't/won't use the Play Store.

---

## 4. Apple App Store (needs a decision first)

Two real blockers, both business not just technical:

1. **Apple rejects thin PWA wrappers.** A plain WebView wrapper gets rejected
   under guideline 4.2 ("minimum functionality"). You need either meaningful
   native integration (push, share extensions, native UI) via **Capacitor**, or
   a compelling native shell.

2. **Apple's 30% + IAP mandate.** Apple requires digital goods (Denarii) to use
   Apple In-App Purchase and takes 30%. Stripe is **not allowed** for in-app
   digital currency on iOS. Options:
   - Add Apple IAP for Denarii on the iOS build (30% cut, separate pricing), OR
   - Make Denarii purchases web-only and keep the iOS app for viewing/streaming
     (users buy on the website, spend in-app — a common pattern, but Apple has
     tightened rules here; must not link out to web purchase from inside the app).

**Recommended path:** ship PWA for iOS now (§1). Tackle a proper Capacitor-based
iOS app with Apple IAP as a separate, scoped project once Android is live and
generating revenue.

### When ready (Capacitor approach)
```bash
npm install @capacitor/core @capacitor/ios
npx cap init "Legion Live" app.legionlive.app --web-dir=dist
npx cap add ios
npm run build && npx cap sync
npx cap open ios   # opens Xcode — needs a Mac + Apple Developer account ($99/yr)
```

---

## Version bumping (for updates)

- **PWA:** just deploy — users get updates automatically (bump the service
  worker CACHE version so chunks refresh).
- **Play Store:** increment `appVersionCode` (integer) and `appVersionName` in
  `twa-manifest.json`, rebuild, upload new AAB.
- **iOS:** bump version in Xcode, rebuild, resubmit.

---

## Summary of what's ready vs. needs a build machine

| Route | Status |
|---|---|
| PWA (all platforms) | ✅ Live now |
| Play Store config (twa-manifest.json) | ✅ Configured, needs `bubblewrap build` on Java/Android machine |
| assetlinks.json | ⚠️ Placeholder — needs keystore SHA-256 after first build |
| Direct APK | ⚙️ Produced by the same `bubblewrap build` |
| iOS App Store | 📋 Needs purchase-flow decision + Capacitor + Mac/Xcode |

The build steps that need Java + Android SDK (or Xcode) can't run in the
Netlify/CI web environment — they need a local machine or a dedicated mobile
CI runner (e.g. Codemagic, EAS, or GitHub Actions with an Android image).
