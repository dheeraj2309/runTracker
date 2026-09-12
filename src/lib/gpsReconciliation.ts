import type { Point } from '../types/run';
import { haversineDistanceMeters } from './geo-math';

const VECTOR_WINDOW_MS = 10000; // smooth over the last ~10s of pre-crash points
const HARD_CEILING_MS = 45000; // beyond this, always a new segment — midpoint of your 30-60s range, easy to retune
const MAX_PLAUSIBLE_SPEED_DELTA_MPS = 2; // how much faster/slower than the vector we still call "the same run" — a tuning guess, not derived from anything

interface Vector {
  speedMps: number;
  bearingRad: number;
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

function computeSmoothedVector(points: Point[]): Vector | null {
  if (points.length < 2) return null;
  const lastTime = points[points.length - 1].timestamp;
  const window = points.filter((p) => lastTime - p.timestamp <= VECTOR_WINDOW_MS);
  const usable = window.length >= 2 ? window : points.slice(-2);

  const first = usable[0];
  const last = usable[usable.length - 1];
  const distanceMeters = haversineDistanceMeters(first, last);
  const elapsedSeconds = (last.timestamp - first.timestamp) / 1000;
  if (elapsedSeconds <= 0) return null;

  const dLng = toRad(last.lng - first.lng);
  const lat1 = toRad(first.lat);
  const lat2 = toRad(last.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return { speedMps: distanceMeters / elapsedSeconds, bearingRad: Math.atan2(y, x) };
}

function predictPosition(origin: { lat: number; lng: number }, vector: Vector, elapsedMs: number) {
  const EARTH_RADIUS = 6371000;
  const angularDistance = (vector.speedMps * (elapsedMs / 1000)) / EARTH_RADIUS;

  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(vector.bearingRad),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(vector.bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
  );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

export type ReconciliationDecision = { type: 'bridge' } | { type: 'newSegment' };

export function reconcileResume(
  preCrashPoints: Point[],
  newFix: { lat: number; lng: number; timestamp: number; accuracy: number },
): ReconciliationDecision {
  if (preCrashPoints.length === 0) return { type: 'newSegment' };

  const lastPoint = preCrashPoints[preCrashPoints.length - 1];
  const elapsedMs = newFix.timestamp - lastPoint.timestamp;
  if (elapsedMs <= 0 || elapsedMs > HARD_CEILING_MS) return { type: 'newSegment' };

  const vector = computeSmoothedVector(preCrashPoints);
  if (!vector) return { type: 'newSegment' };

  const predicted = predictPosition(lastPoint, vector, elapsedMs);
  const distanceFromPrediction = haversineDistanceMeters(predicted, newFix);
  const threshold = (elapsedMs / 1000) * MAX_PLAUSIBLE_SPEED_DELTA_MPS + newFix.accuracy;

  return distanceFromPrediction <= threshold ? { type: 'bridge' } : { type: 'newSegment' };
}