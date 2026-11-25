# Bas Aayi Kya - Driver Mobile App (PWA)

Installable Progressive Web App (PWA) for bus drivers to pair with buses and broadcast live GPS telemetry.

## Tech Stack
- React 18 + Vite
- Tailwind CSS (Mobile-First UI)
- React Leaflet + Leaflet (OpenStreetMap tiles, inverted for night mode — no API key)
- PWA Manifest

## Running the App
```bash
npm install
npm run dev
```

Server runs on: **http://localhost:5174**

## Features Included
1. Android/iOS Permission Rationale Flow (GPS, Background location, Camera, Notifications)
2. Driver Login (`+91 98765 43210` / `123456`) OR One-tap Bus Pairing Code entry
3. Large tactile START TRIP / END TRIP button
4. GPS Auto-Simulation & Live Coordinate broadcaster to Backend API
5. Night-mode OpenStreetMap with animated polyline & waypoint markers
6. Live passenger headcount tool (+/- controls & seat grid, capacity from the assigned bus)
7. Instant SOS Emergency Alert dispatcher to Fleet Owner
8. Trip History & Driver DPDP Consent Profile
