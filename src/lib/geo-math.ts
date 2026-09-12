import type { Point } from "../types/run";

const EARTH_RADIUS_METERS = 6371000;

/** Great-circle distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** Sum of consecutive haversine distances across an ordered list of points. */
export function totalDistanceMeters(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistanceMeters(points[i - 1], points[i]);
  }
  return total;
}

const MIN_TRUSTED_SPEED_MPS = 0.5; // below this, device .speed is unreliable — fall back to distance/time
const FASTEST_PLAUSIBLE_PACE_MIN_PER_KM = 2.5; // ~2:30/km sanity ceiling — faster readings are discarded as bad data
const REFERENCE_ACCURACY_METERS = 10; // "good" accuracy baseline used to scale weighting
const BASE_EMA_ALPHA = 0.3;
const MIN_ALPHA_FACTOR = 0.2;
const MAX_ALPHA_FACTOR = 2;
const SLOWEST_PLAUSIBLE_PACE_MIN_PER_KM = 20; // slower than this is noise, not a real pace — new

function computeInstantPaceMinPerKm(prev: Point, curr: Point): number | null {
  if (curr.skipPaceTransition) return null;
  let speedMps: number;

  if (typeof curr.speed === "number" && curr.speed >= MIN_TRUSTED_SPEED_MPS) {
    speedMps = curr.speed;
  } else {
    const distanceMeters = haversineDistanceMeters(prev, curr);
    const elapsedSeconds = (curr.timestamp - prev.timestamp) / 1000;
    if (elapsedSeconds <= 0 || distanceMeters === 0) return null;
    speedMps = distanceMeters / elapsedSeconds;
  }

  if (speedMps <= 0) return null;
  const paceMinPerKm = 1000 / (speedMps * 60);
  if (
    paceMinPerKm < FASTEST_PLAUSIBLE_PACE_MIN_PER_KM ||
    paceMinPerKm > SLOWEST_PLAUSIBLE_PACE_MIN_PER_KM
  )
    return null; // implausibly fast — discard, don't let it corrupt the EMA

  return paceMinPerKm;
}

/**
 * Weighted EMA over the current segment's points. Recomputed from scratch
 * each call (pure function, consistent with the rest of runStats) rather
 * than maintained as external mutable state — replaying the EMA over a
 * segment's points is cheap even at a few thousand points.
 */
export function calculateSmoothedPaceMinPerKm(points: Point[]): number | null {
  if (points.length < 2) return null;

  let smoothed: number | null = null;

  for (let i = 1; i < points.length; i++) {
    const reading = computeInstantPaceMinPerKm(points[i - 1], points[i]);
    if (reading === null) continue; // skip unusable/implausible readings without perturbing the smoothed value

    const accuracy = points[i].accuracy ?? REFERENCE_ACCURACY_METERS;
    const weightFactor = Math.min(
      MAX_ALPHA_FACTOR,
      Math.max(MIN_ALPHA_FACTOR, REFERENCE_ACCURACY_METERS / accuracy),
    );
    const alpha = Math.min(1, BASE_EMA_ALPHA * weightFactor);

    smoothed =
      smoothed === null ? reading : smoothed + alpha * (reading - smoothed);
  }
  if (
    smoothed !== null &&
    (smoothed < FASTEST_PLAUSIBLE_PACE_MIN_PER_KM ||
      smoothed > SLOWEST_PLAUSIBLE_PACE_MIN_PER_KM)
  ) {
    return null; // final display-layer guard
  }
  return smoothed;
}
