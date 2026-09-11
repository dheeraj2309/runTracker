import type { Point } from '../types/run';

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

const PACE_WINDOW_POINTS = 10;

/**
 * Rolling-window pace in minutes per kilometer, using the last
 * PACE_WINDOW_POINTS points (not time-based — a fixed count, per your call).
 * Returns null when there isn't enough data yet, or when the window covers
 * zero distance (e.g. stationary), to avoid a divide-by-zero / infinite pace.
 */
export function calculateRollingPaceMinPerKm(points: Point[]): number | null {
  if (points.length < 2) return null;

  const window = points.slice(-PACE_WINDOW_POINTS);
  const distanceMeters = totalDistanceMeters(window);
  if (distanceMeters === 0) return null;

  const elapsedSeconds = (window[window.length - 1].timestamp - window[0].timestamp) / 1000;
  if (elapsedSeconds <= 0) return null;

  const minutes = elapsedSeconds / 60;
  const km = distanceMeters / 1000;
  return minutes / km;
}