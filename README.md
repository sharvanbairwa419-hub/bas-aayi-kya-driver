# Bas Aayi Kya — Driver App

Android app (also a PWA) for bus drivers. No demo login, no OTP: the driver joins
with the pairing code his owner created, and starts/ends duty by scanning the QR
stuck in the bus.

## Tech
- React 18 + Vite, Tailwind CSS
- React Leaflet + OpenStreetMap tiles (no API key), inverted for night mode
- Browser Geolocation API (`navigator.geolocation.watchPosition`), real device GPS
- QR scanner: built-in `BarcodeDetector` + manual code entry fallback
- Capacitor 7 for the Android APK

## Run locally
```bash
npm install
npm run dev      # http://127.0.0.1:5174
```

## The real flow
1. **Owner creates the driver** in the owner dashboard (name + mobile). The dashboard
   shows a 6-character **pairing code**.
2. **Driver enters that code** in this app → the phone is connected to that owner.
3. **Owner approves the 120-day location consent** from the dashboard. Without it the
   duty button stays locked.
4. **Owner prints the bus QR** (dashboard → Buses → QR) and sticks it inside the bus.
5. **Driver scans that QR** to start duty. From that moment every GPS fix is sent to
   the owner's dashboard and to the passenger web app.
6. **Driver scans the same QR to end duty.** Wrong bus QR is rejected. Duty also ends
   by itself after 24 hours without a ping, and never carries over past midnight —
   a new day needs a new scan.

There is no fixed route anywhere. The route shown to the owner and passengers is
built from the GPS breadcrumbs of that duty.

## Server address
The phone needs to reach the owner's API server.

- In a browser on the same computer the app uses `http://<host>:3000` automatically.
- Inside the installed APK, open **Server address** on the pairing screen (or in
  Profile) and enter the address the backend runs on, e.g. `http://192.168.1.5:3000`.
  It is remembered on the phone. Phone and server must be on the same network.

## Install (APK)
Download `app-debug.apk` from the latest release:
https://github.com/sharvanbairwa419-hub/bas-aayi-kya-driver/releases/tag/v1.0.0-apk

Every push to `main` rebuilds the APK through GitHub Actions and updates that release.
