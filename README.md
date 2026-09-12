# Run Tracker

A GPS-based running tracker built with React, TypeScript, and Leaflet — tracks live distance, duration, and pace with pause/resume segments, crash-recovery persistence, and resilience to GPS signal loss.

## Features

- **Live GPS tracking** — real-time distance, duration, and pace while running
- **Pause/Resume segments** — totals aggregate correctly across multiple active segments in a single run
- **Crash recovery** — an interrupted run (tab closed, refreshed, or crashed) can be resumed after reload, with points restored from IndexedDB
- **Smart resume reconciliation** — on recovery, a short gap (under ~45s) is bridged into the same segment using GPS dead-reckoning; a longer gap is treated as a genuine pause and starts a new segment
- **GPS-loss handling** — mid-run signal loss shows a reconnect banner, greys out the trail, and auto-recenters the map once signal returns
- **Noise-resistant tracking** — fixes are filtered by accuracy and minimum movement distance before being accepted, keeping the trail and distance readings clean
- **Smoothed live pace** — an accuracy-weighted exponential moving average, bounded by plausible pace limits, avoids wild pace spikes from noisy fixes
- **Route summary** — full route map with start/finish markers and a segment-by-segment breakdown after finishing a run

## Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4**
- **Leaflet + react-leaflet** — map rendering, OpenStreetMap tiles
- **idb** — IndexedDB wrapper for point storage
- **localStorage** — lightweight run metadata for crash recovery

## Project Structure
```
run-tracker/
├── src/
│ ├── components/ # Flat UI components — no screens/ split
│ │ ├── EnterScreen.tsx
│ │ ├── CalibratingOverlay.tsx
│ │ ├── Dashboard.tsx
│ │ ├── Controls.tsx
│ │ ├── MapView.tsx
│ │ ├── RunStatusIndicator.tsx
│ │ ├── FinishConfirmModal.tsx
│ │ ├── SummaryScreen.tsx
│ │ ├── GpsErrorBanner.tsx
│ │ └── ResumeDiscardDialog.tsx
│ ├── context/
│ │ ├── runReducer.ts # Pure state machine for run status/segments
│ │ └── RunContext.tsx # React context + useRun() hook
│ ├── hooks/
│ │ ├── useCalibration.ts # Pre-run permission + first-fix flow
│ │ ├── useGeolocation.ts # Live watchPosition wiring + GPS-loss detection
│ │ ├── useTicker.ts # Live-updating clock for duration display
│ │ ├── usePersistence.ts # Periodic + event-driven save to storage
│ │ └── usePostCrashResume.ts # GPS reconciliation after a crash/refresh
│ ├── lib/
│ │ ├── geo-math.ts # Haversine distance, smoothed pace (EMA)
│ │ ├── pointFilter.ts # Accuracy + minimum-movement filtering
│ │ ├── geolocation.ts # watchPosition/clearWatch wrapper
│ │ ├── gpsReconciliation.ts # Dead-reckoning bridge-vs-split decision
│ │ ├── runStats.ts # Segment/overall stat aggregation
│ │ ├── db.ts # IndexedDB (idb) point storage
│ │ └── persistence.ts # localStorage metadata + rehydration
│ ├── types/
│ │ └── run.ts # Point, Segment, RunState, RunAction types
│ ├── App.tsx
│ └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

## Getting Started

```bash
npm install
npm run dev
```

Open the printed local URL in a browser. Geolocation requires either `localhost` or an HTTPS origin — see notes below for testing on a phone.

## Notes

- Map tiles are served from the public OpenStreetMap tile endpoint.
- Testing on a phone requires an HTTPS tunnel (e.g. `localtunnel`) or a local self-signed cert, since most mobile browsers block geolocation on plain HTTP over LAN.