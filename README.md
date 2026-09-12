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

## Engineering Decisions

A few of the trickier problems I ran into, and how they're handled — explained simply.

### The pace number kept jumping around

**Problem:** GPS fixes aren't perfectly accurate — two fixes taken a second apart can show you "moving" a few meters even while standing still, just from normal signal noise. If you calculate pace from every single fix, it swings wildly (values like 300+ min/km or unrealistically fast ones show up).

**Solution:**
- Every fix is checked against three filters before it's trusted at all:
  - **Accuracy filter** — ignore fixes the phone itself says are too imprecise (worse than 50m).
  - **Minimum movement filter** — ignore a new fix if it's within 3 meters of the last one; that's noise, not real movement.
  - **Plausible-jump filter** — ignore a fix if it implies moving faster than ~25 km/h; a real GPS error, not a real sprint.
- Pace itself is smoothed using a **weighted moving average** — each new reading nudges the displayed pace instead of replacing it outright, and readings from more accurate fixes get more influence over the number than readings from shaky ones.
- Any reading that's still absurd after all that (faster than ~2:30/km or slower than 20:00/km) is thrown out rather than shown — better to show "no data yet" than a number we don't trust.

### "Average pace" and "current pace" don't mean the same thing

**Problem:** average pace could look artificially slow if you stood still for a bit before or during a run — total time keeps counting even when you're not moving, which drags the average down even though your actual running pace was fine.

**Solution:** the live pace on the Dashboard and the average pace shown in the Summary use two different time bases on purpose:
- **Live pace** — a rolling estimate of how fast you're moving *right now*.
- **Average pace (Summary)** — calculated using only the time between real movements, not full stopwatch time. Standing still doesn't get counted against your average.

### What happens when GPS signal drops mid-run

This is the part most running apps quietly get wrong, so it got the most thought here.

1. **While signal is lost** — the app doesn't guess. The trail turns grey, a "GPS lost, reconnecting…" banner appears, and the clock keeps running (you're still out there, we just can't see you), but distance and pace freeze at their last known values instead of making things up.
2. **The moment signal returns** — the app looks at how long the gap was:
   - **Short gap** (a few seconds to under ~45 seconds — a tunnel, a moment of tree cover) → the app predicts roughly where you *should* be, based on your speed and direction right before the signal dropped. If your real new position roughly matches that prediction, it assumes you kept running the whole time and just bridges the gap — no interruption shown in your stats.
   - **Long gap, or a real mismatch** (your new position doesn't match the prediction at all) → the app assumes you actually stopped, and treats it as a normal pause. This keeps a real stop from being wrongly smoothed over as continuous running.
3. **Map behavior** — once reconnected, the map automatically recenters on your real position once, so you're not left staring at a grey trail with no idea where you are now.

### What happens if the app itself crashes or the tab closes mid-run

**Problem:** phones close background tabs, browsers crash, refreshes happen by accident — losing a run entirely because of that would be a bad experience.

**Solution:** the app saves your run continuously while you're tracking:
- Every GPS point gets written to the browser's local database (IndexedDB) as it comes in.
- Small run details (status, segment timing) are saved every 10 seconds, plus immediately whenever you pause, resume, or finish.
- When the app is reopened after a crash, it checks for unfinished run data and asks: **Resume** or **Discard**. Choosing Resume rebuilds the entire run — every point, every segment — exactly as it was.
- The same short-gap-vs-long-gap logic used for GPS dropouts also applies here: if you reopen the app quickly enough, it can bridge the gap seamlessly instead of starting a new segment.

### Filtering GPS noise vs. filtering real slow movement

**Problem:** the same 3-meter movement filter that removes GPS jitter could, in theory, also throw away real (but very slow) movement, like a careful walk.

**Solution:** this is a known, accepted trade-off rather than something fully solved — the filter is tuned to favor clean data over catching every last inch of very slow movement. It's an easy constant to retune later if it turns out to be too aggressive in practice.  
## Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4**
- **Leaflet + react-leaflet** — map rendering, OpenStreetMap tiles
- **idb** — IndexedDB wrapper for point storage
- **localStorage** — lightweight run metadata for crash recovery

## Architecture

The app is built around a single reducer-driven state machine (`idle → calibrating → ready → running ⇄ paused → finished`), with GPS data flowing one-way from the browser's Geolocation API through a filtering pipeline before ever reaching the UI:
```
watchPosition
│
▼
accuracy filter ──✕ reject if too imprecise
│
▼
movement filter ──✕ reject if too close to last point (GPS noise)
│
▼
plausible-jump filter ──✕ reject if implausibly far/fast (bad fix)
│
▼
ADD_POINT ──► reducer ──► segments ──► distance / trail
│
▼
pace EMA (accuracy-weighted, bounded) ──► live pace display
```
Persistence runs in parallel: every accepted point is written to IndexedDB, and small run metadata (status, segment boundaries) is periodically snapshotted to localStorage — enough to fully reconstruct an interrupted run on reload.
  
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
