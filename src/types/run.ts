// Core domain types for a run. Kept intentionally minimal at this stage —
// no distance/duration/pace fields here. Those are derived values computed
// from points/segments (via lib/geo-math in Phase 3), not stored redundantly,
// so there's a single source of truth and no risk of stats drifting out of
// sync with the underlying point data.

export type PointSource = "real" | "interpolated";

export interface Point {
  id: string;
  lat: number;
  lng: number;
  timestamp: number; // epoch ms
  accuracy?: number; // meters, from the Geolocation API's fix; absent for interpolated points
  speed?: number; // meters/second, from GeolocationCoordinates.speed when the device provides it (Doppler-derived)
  source: PointSource;
  skipPaceTransition?: boolean; // marks this point's incoming transition as unusable for instant pace (e.g. after a crash-recovery bridge) — the smoothed EMA carries forward unchanged instead of computing a reading across the gap
}

export interface Segment {
  id: string;
  startTime: number; // epoch ms
  endTime: number | null; // null while segment is still open (running)
  points: Point[];
}

export type RunStatus =
  | "idle" // nothing started yet
  | "calibrating" // waiting for first stable GPS fix (Phase 2)
  | "ready" // fix acquired, waiting for user to tap Start
  | "running"
  | "paused"
  | "finished";

export interface RunState {
  status: RunStatus;
  segments: Segment[];
  currentSegmentId: string | null; // id of the open segment, or null if none is open
  currentPosition: { lat: number; lng: number } | null; // pre-run GPS position, for centering the map before any segment exists
}

export type RunAction =
  | { type: "START"; payload: { timestamp: number; segmentId: string } }
  | { type: "PAUSE"; payload: { timestamp: number } }
  | { type: "RESUME"; payload: { timestamp: number; segmentId: string } }
  | { type: 'BRIDGE_SEGMENT'; payload: { segmentId: string; point: Point } } // new — reopens an existing segment instead of starting one, for crash-recovery bridging
  | { type: "FINISH"; payload: { timestamp: number } }
  | { type: "ADD_POINT"; payload: Point }
  | { type: 'SET_STATUS'; payload: { status: RunStatus } }
  | { type: 'SET_POSITION'; payload: { lat: number; lng: number } }
  | { type: "HYDRATE"; payload: RunState } // full state replace, used by Phase 8's resume flow
  | { type: "DISCARD" };
